import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";
import {
  analyticsConfigured,
  gaClientId,
  recordPurchaseOnce,
  trackPurchase,
  PURCHASE_EVENT_TYPE,
} from "@/lib/analytics-server";

vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

const purchase = {
  userId: "user_1",
  plan: "print",
  amountCents: 7900,
  currency: "eur",
  eventId: "evt_1",
  billingReason: "subscription_create",
};

/** Both destinations reachable. */
function configureAll() {
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST");
  vi.stubEnv("GA_API_SECRET", "ga-secret");
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456");
  vi.stubEnv("META_CAPI_TOKEN", "meta-token");
}

function bodyOf(call: number): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[call] as unknown as [string, { body: string }];
  return JSON.parse(init.body);
}

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.unstubAllEnvs();
  // Vitest may have loaded real values from .env: force the "off" state.
  vi.stubEnv("GA_API_SECRET", "");
  vi.stubEnv("META_CAPI_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("analyticsConfigured", () => {
  it("is false when neither destination has its pair of variables", () => {
    expect(analyticsConfigured()).toBe(false);
  });

  it("is false when a secret is set but its id is missing", () => {
    vi.stubEnv("GA_API_SECRET", "ga-secret");
    expect(analyticsConfigured()).toBe(false);
  });

  it("is true as soon as one destination is complete", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456");
    vi.stubEnv("META_CAPI_TOKEN", "meta-token");
    expect(analyticsConfigured()).toBe(true);
  });
});

describe("gaClientId", () => {
  it("is stable for a given event id and carries no account data", () => {
    const id = gaClientId("evt_1");
    expect(id).toBe(gaClientId("evt_1"));
    expect(id).toMatch(/^\d+\.\d+$/);
    expect(id).not.toContain("evt_1");
  });

  it("differs across events", () => {
    expect(gaClientId("evt_1")).not.toBe(gaClientId("evt_2"));
  });
});

describe("trackPurchase", () => {
  it("sends nothing when no destination is configured", async () => {
    await trackPurchase(purchase);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts a GA4 purchase with the amount in major units", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST");
    vi.stubEnv("GA_API_SECRET", "ga-secret");

    await trackPurchase(purchase);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("measurement_id=G-TEST");
    expect(url).toContain("api_secret=ga-secret");
    const body = bodyOf(0) as { client_id: string; events: { name: string; params: Record<string, unknown> }[] };
    expect(body.client_id).toBe(gaClientId("evt_1"));
    expect(body.events[0].name).toBe("purchase");
    expect(body.events[0].params).toMatchObject({
      transaction_id: "evt_1",
      currency: "EUR",
      value: 79,
    });
  });

  it("posts a Meta Purchase whose only identifier is derived from the event", async () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456");
    vi.stubEnv("META_CAPI_TOKEN", "meta-token");

    await trackPurchase(purchase);

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/123456/events");
    expect(url).toContain("access_token=meta-token");
    const body = bodyOf(0) as { data: Record<string, unknown>[] };
    const sent = body.data[0] as {
      event_name: string;
      event_id: string;
      user_data: Record<string, string>;
      custom_data: Record<string, unknown>;
    };
    expect(sent.event_name).toBe("Purchase");
    expect(sent.event_id).toBe("evt_1");
    expect(Object.keys(sent.user_data)).toEqual(["external_id"]);
    expect(sent.user_data.external_id).toMatch(/^[0-9a-f]{64}$/);
    expect(sent.user_data.external_id).not.toContain("user_1");
    expect(sent.custom_data).toMatchObject({ currency: "eur", value: 79 });
  });

  it("carries no user identifier to either destination", async () => {
    configureAll();

    await trackPurchase(purchase);

    const payloads = [JSON.stringify(bodyOf(0)), JSON.stringify(bodyOf(1))];
    for (const payload of payloads) {
      expect(payload).not.toContain("user_1");
    }
  });

  it("still reaches one destination when the other throws", async () => {
    configureAll();
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(trackPurchase(purchase)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("recordPurchaseOnce", () => {
  let db: ReturnType<typeof createSupabaseStub>;
  const client = () => db.client as unknown as SupabaseClient;

  beforeEach(() => {
    db = createSupabaseStub();
    configureAll();
  });

  it("claims the event in events_log, then sends", async () => {
    db.queueRead({ data: null }); // dedup lookup: not reported yet

    await recordPurchaseOnce(client(), purchase);

    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].table).toBe("events_log");
    expect(db.inserts[0].row).toMatchObject({
      user_id: "user_1",
      event_type: PURCHASE_EVENT_TYPE,
      metadata: { stripe_event_id: "evt_1", plan: "print", amount_cents: 7900, currency: "eur" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends nothing a second time when the event was already reported", async () => {
    db.queueRead({ data: { id: "already-reported" } });

    await recordPurchaseOnce(client(), purchase);

    expect(db.inserts).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a fully discounted invoice", async () => {
    await recordPurchaseOnce(client(), { ...purchase, amountCents: 0 });

    expect(db.inserts).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing at all when no destination is configured", async () => {
    vi.stubEnv("GA_API_SECRET", "");
    vi.stubEnv("META_CAPI_TOKEN", "");

    await recordPurchaseOnce(client(), purchase);

    expect(db.inserts).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when the claim write fails", async () => {
    db.throwOn("events_log");

    await expect(recordPurchaseOnce(client(), purchase)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

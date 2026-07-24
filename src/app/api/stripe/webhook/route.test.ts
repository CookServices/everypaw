/**
 * Characterization tests for the Stripe webhook.
 *
 * These lock in what the handler does TODAY so the money paths can be
 * refactored safely. They are deliberately descriptive, not prescriptive: if a
 * case here looks wrong, that is the current production behaviour and changing
 * it is a separate, deliberate decision.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

// plan.ts statically imports supabase/server -> next/headers.
vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

const constructEvent = vi.fn();
const sessionsRetrieve = vi.fn();
const portalCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...a: unknown[]) => constructEvent(...a) },
    checkout: { sessions: { retrieve: (...a: unknown[]) => sessionsRetrieve(...a) } },
    billingPortal: { sessions: { create: (...a: unknown[]) => portalCreate(...a) } },
  },
}));

const emailSend = vi.fn(async () => ({ error: null }));
vi.mock("resend", () => ({ Resend: class { emails = { send: (...a: unknown[]) => emailSend(...a) }; } }));

// Keep the real priceIdToPlan: freezing a reimplementation would defeat the point.
let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { POST } from "./route";

function post(body = "raw-body", sig = "sig") {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": sig },
  });
}

beforeEach(() => {
  db = createSupabaseStub();
  constructEvent.mockReset();
  sessionsRetrieve.mockReset();
  portalCreate.mockReset();
  emailSend.mockClear();
  vi.unstubAllEnvs();
});

describe("signature verification", () => {
  it("rejects with 400 when the signature does not verify", async () => {
    constructEvent.mockImplementation(() => { throw new Error("bad sig"); });

    const res = await POST(post());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Webhook error" });
    // Nothing must be written when the payload is not trusted.
    expect(db.rpcs).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });
});

describe("checkout.session.completed - one-time book purchase", () => {
  const bookEvent = {
    id: "evt_book_1",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", mode: "payment", metadata: { user_id: "user_1", plan: "book_only" } } },
  };

  it("grants one book credit and logs the event", async () => {
    constructEvent.mockReturnValue(bookEvent);
    db.queueRead({ data: null });   // dedup lookup: not seen before
    db.queueRpc({ error: null });   // increment_book_credits

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.rpcs).toEqual([{ fn: "increment_book_credits", args: { p_user_id: "user_1" } }]);
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].table).toBe("events_log");
    expect(db.inserts[0].row).toMatchObject({
      user_id: "user_1",
      event_type: "stripe_book_checkout",
      metadata: { stripe_event_id: "evt_book_1", stripe_session_id: "cs_1" },
    });
  });

  it("is idempotent: a replayed event grants no second credit", async () => {
    constructEvent.mockReturnValue(bookEvent);
    db.queueRead({ data: { id: "already-logged" } }); // dedup lookup: seen

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.rpcs).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("returns 500 when the credit increment fails, so Stripe retries", async () => {
    constructEvent.mockReturnValue(bookEvent);
    db.queueRead({ data: null });
    db.queueRpc({ error: { message: "boom" } });

    const res = await POST(post());

    expect(res.status).toBe(500);
    expect(db.inserts).toHaveLength(0); // no event logged, so the retry is not deduped away
  });

  it("acknowledges without writing when the session carries no user_id", async () => {
    constructEvent.mockReturnValue({
      id: "evt_no_user",
      type: "checkout.session.completed",
      data: { object: { id: "cs_2", mode: "payment", metadata: {} } },
    });

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(db.rpcs).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });
});

describe("checkout.session.completed - subscription", () => {
  function subEvent(metaPlan = "print_annual") {
    return {
      id: "evt_sub_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_sub", mode: "subscription", customer: "cus_1", subscription: "sub_1",
          metadata: { user_id: "user_1", plan: metaPlan },
        },
      },
    };
  }

  it("activates the plan resolved from the line item price", async () => {
    vi.stubEnv("STRIPE_PRICE_PRINT_ANNUAL_EUR", "price_print_eur");
    constructEvent.mockReturnValue(subEvent());
    sessionsRetrieve.mockResolvedValue({ line_items: { data: [{ price: { id: "price_print_eur" } }] } });
    db.queueRead({ data: { stripe_subscription_id: null, is_premium: false } });

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).toEqual({
      table: "profiles",
      values: { plan: "print", is_premium: true, stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" },
    });
  });

  it("is idempotent: skips when that subscription is already active and premium", async () => {
    constructEvent.mockReturnValue(subEvent());
    db.queueRead({ data: { stripe_subscription_id: "sub_1", is_premium: true } });

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(sessionsRetrieve).not.toHaveBeenCalled();
    expect(db.updates).toHaveLength(0);
  });

  it("falls back to the metadata plan when the price id maps to nothing (print)", async () => {
    // Guards against a Print buyer silently landing on digital when the
    // STRIPE_PRICE_ID_* env vars are misnamed.
    constructEvent.mockReturnValue(subEvent("print_annual"));
    sessionsRetrieve.mockResolvedValue({ line_items: { data: [{ price: { id: "price_unknown" } }] } });
    db.queueRead({ data: { stripe_subscription_id: null, is_premium: false } });

    await POST(post());

    expect(db.updates[0].values).toMatchObject({ plan: "print" });
  });

  it("falls back to digital for any other metadata plan", async () => {
    constructEvent.mockReturnValue(subEvent("something_else"));
    sessionsRetrieve.mockResolvedValue({ line_items: { data: [{ price: { id: "price_unknown" } }] } });
    db.queueRead({ data: { stripe_subscription_id: null, is_premium: false } });

    await POST(post());

    expect(db.updates[0].values).toMatchObject({ plan: "digital" });
  });

  it("returns 500 when the profile update fails", async () => {
    constructEvent.mockReturnValue(subEvent());
    sessionsRetrieve.mockResolvedValue({ line_items: { data: [{ price: { id: "price_unknown" } }] } });
    db.queueRead({ data: { stripe_subscription_id: null, is_premium: false } });
    db.queueRead({ error: { message: "update failed" } }); // result of the update chain

    const res = await POST(post());

    expect(res.status).toBe(500);
  });
});

describe("customer.subscription.deleted", () => {
  const delEvent = {
    id: "evt_del", type: "customer.subscription.deleted",
    data: { object: { customer: "cus_1" } },
  };

  it("downgrades to free and clears the subscription and past-due flag", async () => {
    constructEvent.mockReturnValue(delEvent);

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.updates).toEqual([{
      table: "profiles",
      values: { plan: "free", is_premium: false, stripe_subscription_id: null, payment_past_due: false },
    }]);
  });

  it("returns 500 when the downgrade fails", async () => {
    constructEvent.mockReturnValue(delEvent);
    db.queueRead({ error: { message: "nope" } });

    const res = await POST(post());

    expect(res.status).toBe(500);
  });
});

describe("customer.subscription.updated", () => {
  function updEvent(over: Record<string, unknown>) {
    return {
      id: "evt_upd", type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_1", status: "active", cancel_at_period_end: false,
          current_period_end: 1800000000,
          items: { data: [{ price: { id: "price_print_eur" } }] },
          ...over,
        },
      },
    };
  }

  it("downgrades to free when the subscription reports canceled", async () => {
    constructEvent.mockReturnValue(updEvent({ status: "canceled" }));
    db.queueRead({ data: { id: "user_1" } }); // update ... .select("id").single()

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.updates[0]).toEqual({
      table: "profiles",
      values: { plan: "free", is_premium: false, stripe_subscription_id: null },
    });
    expect(db.inserts[0].row).toMatchObject({
      user_id: "user_1", event_type: "stripe_subscription_updated",
      metadata: { stripe_event_id: "evt_upd", status: "canceled" },
    });
  });

  it("applies a plan change and records the renewal date", async () => {
    vi.stubEnv("STRIPE_PRICE_PRINT_ANNUAL_EUR", "price_print_eur");
    constructEvent.mockReturnValue(updEvent({}));
    db.queueRead({ data: { id: "user_1" } });

    await POST(post());

    expect(db.updates[0]).toEqual({
      table: "profiles",
      values: { plan: "print", is_premium: true, subscription_renewal_date: 1800000000 },
    });
    expect(db.inserts[0].row).toMatchObject({ metadata: { plan: "print", status: "active" } });
  });

  it("keeps access untouched when cancellation is only scheduled", async () => {
    vi.stubEnv("STRIPE_PRICE_PRINT_ANNUAL_EUR", "price_print_eur");
    constructEvent.mockReturnValue(updEvent({ cancel_at_period_end: true, cancel_at: 1800000000 }));

    const res = await POST(post());

    expect(res.status).toBe(200);
    // The actual downgrade is left to customer.subscription.deleted.
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });
});

describe("invoice.payment_succeeded", () => {
  const PRINT_PRICE = "price_print_eur";

  function invEvent(over: Record<string, unknown> = {}) {
    return {
      id: "evt_inv", type: "invoice.payment_succeeded",
      data: {
        object: {
          customer: "cus_1", billing_reason: "subscription_cycle", subscription: "sub_1",
          lines: { data: [{ price: { id: PRINT_PRICE }, period: { end: 1900000000 } }] },
          ...over,
        },
      },
    };
  }

  beforeEach(() => { vi.stubEnv("STRIPE_PRICE_PRINT_ANNUAL_EUR", PRINT_PRICE); });

  it("clears the past-due flag on any successful payment", async () => {
    // Runs before the Print-only and cadence gates, so a non-Print invoice still clears it.
    constructEvent.mockReturnValue(invEvent({ lines: { data: [{ price: { id: "price_digital" } }] } }));

    await POST(post());

    expect(db.updates[0]).toEqual({ table: "profiles", values: { payment_past_due: false } });
  });

  it("awards no credit for a non-Print price", async () => {
    constructEvent.mockReturnValue(invEvent({ lines: { data: [{ price: { id: "price_digital" } }] } }));

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.rpcs).toHaveLength(0);
  });

  it("grants a credit on renewal and stamps last_book_credit_at", async () => {
    constructEvent.mockReturnValue(invEvent());
    db.queueRead({ data: null });                    // past-due update result
    db.queueRead({ data: { id: "user_1" } });        // profile lookup
    db.queueRead({ data: null });                    // dedup by event id: not seen
    db.queueRead({ data: { last_book_credit_at: null } });
    db.queueRpc({ error: null });

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.rpcs).toEqual([{ fn: "increment_book_credits", args: { p_user_id: "user_1" } }]);
    const stamp = db.updates.find(u => (u.values as Record<string, unknown>).last_book_credit_at);
    expect(stamp?.values).toMatchObject({ subscription_renewal_date: 1900000000 });
    expect(db.inserts[0].row).toMatchObject({
      event_type: "stripe_invoice_book_credit",
      metadata: { billing_reason: "subscription_cycle", source: "invoice" },
    });
  });

  it("logs a subscription-scoped event type on the first payment", async () => {
    constructEvent.mockReturnValue(invEvent({ billing_reason: "subscription_create" }));
    db.queueRead({ data: null });
    db.queueRead({ data: { id: "user_1" } });
    db.queueRead({ data: null });                    // dedup by subscription id
    db.queueRead({ data: { last_book_credit_at: null } });
    db.queueRpc({ error: null });

    await POST(post());

    expect(db.inserts[0].row).toMatchObject({
      event_type: "stripe_print_subscription_credit",
      metadata: { billing_reason: "subscription_create", stripe_subscription_id: "sub_1" },
    });
  });

  it("is idempotent: a replayed invoice grants no second credit", async () => {
    constructEvent.mockReturnValue(invEvent());
    db.queueRead({ data: null });
    db.queueRead({ data: { id: "user_1" } });
    db.queueRead({ data: { id: "already-logged" } }); // dedup hit

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.rpcs).toHaveLength(0);
  });

  it("blocks a second credit inside the 350-day window", async () => {
    const twoHundredDaysAgo = new Date(Date.now() - 200 * 864e5).toISOString();
    constructEvent.mockReturnValue(invEvent());
    db.queueRead({ data: null });
    db.queueRead({ data: { id: "user_1" } });
    db.queueRead({ data: null });
    db.queueRead({ data: { last_book_credit_at: twoHundredDaysAgo } });

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.rpcs).toHaveLength(0);
  });

  it("allows the credit once past the 350-day window", async () => {
    // 350d rather than 365d absorbs the drift between webhook-processing time
    // and the actual renewal instant.
    const almostAYearAgo = new Date(Date.now() - 360 * 864e5).toISOString();
    constructEvent.mockReturnValue(invEvent());
    db.queueRead({ data: null });
    db.queueRead({ data: { id: "user_1" } });
    db.queueRead({ data: null });
    db.queueRead({ data: { last_book_credit_at: almostAYearAgo } });
    db.queueRpc({ error: null });

    await POST(post());

    expect(db.rpcs).toHaveLength(1);
  });

  it("acknowledges without crediting when no profile matches the customer", async () => {
    constructEvent.mockReturnValue(invEvent());
    db.queueRead({ data: null }); // past-due update
    db.queueRead({ data: null }); // profile lookup: none

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(db.rpcs).toHaveLength(0);
  });

  it("returns 500 when the credit increment fails, so Stripe retries", async () => {
    constructEvent.mockReturnValue(invEvent());
    db.queueRead({ data: null });
    db.queueRead({ data: { id: "user_1" } });
    db.queueRead({ data: null });
    db.queueRead({ data: { last_book_credit_at: null } });
    db.queueRpc({ error: { message: "boom" } });

    const res = await POST(post());

    expect(res.status).toBe(500);
    expect(db.inserts).toHaveLength(0);
  });
});

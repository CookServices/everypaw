/**
 * Characterization tests for the Gelato order route.
 *
 * The rule that matters most here: a book credit is consumed BEFORE the order
 * reaches Gelato, and is only restored when the order never went through. Once
 * Gelato accepts it, later bookkeeping failures must not hand back the credit -
 * that would give away a free book.
 *
 * Descriptive, not prescriptive: these encode current production behaviour.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));
vi.mock("@/lib/pdf-token", () => ({ generatePdfToken: () => ({ token: "tok", expires: 1900000000 }) }));

let authUser: { id: string; email: string } | null = { id: "user_1", email: "u@example.com" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authUser } }) } }),
}));

const sessionsRetrieve = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: (...a: unknown[]) => sessionsRetrieve(...a) } } },
}));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { POST } from "./route";

const VALID_ADDRESS = {
  firstName: "Ada", lastName: "Lovelace", addressLine1: "1 rue X",
  city: "Paris", postCode: "75001", country: "FR",
};
const PET_ID = "eeee0002-0005-0005-0005-000000000002";
const STORY_ID = "aaaa0002-0005-0005-0005-000000000009";

function post(body: Record<string, unknown>) {
  return new Request("http://localhost/api/gelato/order", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-vercel-ip-country": "FR" },
  });
}

/** Body that passes every validation gate. */
function validBody(over: Record<string, unknown> = {}) {
  return { petId: PET_ID, shippingAddress: VALID_ADDRESS, ...over };
}

/** Queue the reads a successful run performs, in order. */
function queueHappyPath() {
  db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });     // pet lookup
  db.queueRpc({ data: true, error: null });                      // try_consume_book_credit
  db.queueRead({ data: [] });                                    // entries
  db.queueRead({ data: [] });                                    // stories
  db.queueRead({ data: [] });                                    // milestones
  db.queueRead({ data: { plan: "print", book_credits: 1 } });     // plan + crédits
}

/** Same three reads, with content in them. */
function queueContent(entries: unknown[], stories: unknown[], milestones: unknown[] = []) {
  db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
  db.queueRpc({ data: true, error: null });
  db.queueRead({ data: entries });
  db.queueRead({ data: stories });
  db.queueRead({ data: milestones });
  db.queueRead({ data: { plan: "print", book_credits: 1 } });
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Gelato cover-dimensions call, then the order call. */
function mockGelato(orderResponse: { ok: boolean; body: unknown }) {
  fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes("cover-dimensions")) {
      return { ok: true, json: async () => ({ width: 444 }) };
    }
    return { ok: orderResponse.ok, json: async () => orderResponse.body };
  });
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  db = createSupabaseStub();
  authUser = { id: "user_1", email: "u@example.com" };
  sessionsRetrieve.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GELATO_API_KEY", "gk_test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://everypaw.app");
  mockGelato({ ok: true, body: { id: "gel_1", orderStatus: "created" } });
});

describe("access control", () => {
  it("rejects an unauthenticated caller", async () => {
    authUser = null;
    const res = await POST(post(validBody()));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the pet does not exist", async () => {
    db.queueRead({ data: null });
    const res = await POST(post(validBody()));
    expect(res.status).toBe(404);
    expect(db.rpcs).toHaveLength(0); // no credit touched
  });

  it("returns 403 when the pet belongs to somebody else", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "someone_else" } });
    const res = await POST(post(validBody()));
    expect(res.status).toBe(403);
    expect(db.rpcs).toHaveLength(0);
  });
});

describe("input validation", () => {
  it.each([
    ["a non-uuid story id", { selectedStoryIds: ["not-a-uuid"] }, "Invalid storyId format"],
    ["a non-https cover photo", { coverPhotoUrl: "http://x/a.jpg" }, "Invalid coverPhotoUrl"],
    ["an unparsable cover photo", { coverPhotoUrl: "not a url" }, "Invalid coverPhotoUrl"],
    ["a year below range", { yearFilter: 1999 }, "Invalid yearFilter"],
    ["a year above range", { yearFilter: 2101 }, "Invalid yearFilter"],
    ["a non-integer year", { yearFilter: 2020.5 }, "Invalid yearFilter"],
  ])("rejects %s", async (_label, over, message) => {
    const res = await POST(post(validBody(over)));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message });
    expect(db.rpcs).toHaveLength(0);
  });

  it("rejects a dedication longer than 500 characters", async () => {
    const res = await POST(post(validBody({ dedicationText: "x".repeat(501) })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dedication too long (max 500 chars)" });
  });

  it("rejects a missing or malformed shipping address", async () => {
    expect((await POST(post({ petId: PET_ID }))).status).toBe(400);
    const badCountry = { ...VALID_ADDRESS, country: "FRANCE" }; // max 3 chars
    expect((await POST(post(validBody({ shippingAddress: badCountry })))).status).toBe(400);
  });

  it("rejects a non-uuid petId", async () => {
    const res = await POST(post({ petId: "nope", shippingAddress: VALID_ADDRESS }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid petId" });
  });

  it("refuses to run at all when the Gelato key is not configured", async () => {
    vi.stubEnv("GELATO_API_KEY", "");
    const res = await POST(post(validBody()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Order service not configured" });
    expect(db.rpcs).toHaveLength(0);
  });
});

describe("book credit", () => {
  it("refuses the order when no credit can be consumed", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: { plan: "print", book_credits: 0 } });
    db.queueRpc({ data: false, error: null });

    const res = await POST(post(validBody()));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "no_book_credits" });
    expect(fetchMock).not.toHaveBeenCalled(); // Gelato never contacted
  });

  it("consumes the credit before contacting Gelato", async () => {
    queueHappyPath();
    await POST(post(validBody()));
    expect(db.rpcs[0]).toEqual({ fn: "try_consume_book_credit", args: { p_user_id: "user_1" } });
  });

  it("restores the credit when Gelato rejects the order", async () => {
    mockGelato({ ok: false, body: { message: "bad payload" } });
    queueHappyPath();

    const res = await POST(post(validBody()));

    expect(res.status).toBe(400);
    expect(db.rpcs.map(r => r.fn)).toEqual(["try_consume_book_credit", "restore_book_credit"]);
  });

  it("restores the credit when the order never reaches Gelato", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("cover-dimensions")) return { ok: true, json: async () => ({}) };
      throw new Error("network down");
    }));
    queueHappyPath();

    const res = await POST(post(validBody()));

    expect(res.status).toBe(500);
    expect(db.rpcs.map(r => r.fn)).toEqual(["try_consume_book_credit", "restore_book_credit"]);
  });

  it("does NOT restore the credit when bookkeeping fails after Gelato accepted", async () => {
    // The order exists at the printer; handing the credit back would mean a free book.
    // book_configs is only written after Gelato accepted, so failing it lands
    // inside the post-order window.
    queueHappyPath();
    db.throwOn("book_configs");

    const res = await POST(post(validBody()));

    expect(res.status).toBe(500);
    expect(db.rpcs.map(r => r.fn)).toEqual(["try_consume_book_credit"]);
  });
});

describe("successful order", () => {
  it("returns the Gelato order id and status", async () => {
    queueHappyPath();
    const res = await POST(post(validBody()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orderId: "gel_1", status: "created" });
  });

  it("scopes the stories update by user_id, for the selected stories", async () => {
    queueHappyPath();
    await POST(post(validBody({ selectedStoryIds: [STORY_ID] })));
    expect(db.updates.some(u => u.table === "stories")).toBe(true);
    expect(db.updates.find(u => u.table === "stories")?.values).toEqual({ status: "ordered" });
  });

  it("records the book config as ordered, with the Gelato order id", async () => {
    queueHappyPath();
    await POST(post(validBody({ customTitle: "Coco 2026" })));

    const cfg = db.inserts.find(i => i.table === "book_configs")?.row as Record<string, unknown>;
    expect(cfg).toMatchObject({
      user_id: "user_1", pet_id: PET_ID, status: "ordered",
      name: "Coco 2026", gelato_order_id: "gel_1",
    });
  });

  it("updates an existing book config instead of inserting when given its id", async () => {
    queueHappyPath();
    await POST(post(validBody({ bookConfigId: "11111111-1111-1111-1111-111111111111" })));

    expect(db.inserts.find(i => i.table === "book_configs")).toBeUndefined();
    expect(db.updates.some(u => u.table === "book_configs")).toBe(true);
  });

  it("sends Gelato a PDF url carrying only whitelisted layout values", async () => {
    queueHappyPath();
    await POST(post(validBody({
      storyLayouts: { [STORY_ID]: "photo_hero", "not-a-uuid": "classic", [PET_ID]: "bogus_layout" },
      coverTheme: "forest",
      lang: "fr",
    })));

    const orderCall = fetchMock.mock.calls.find(c => String(c[0]).includes("/v4/orders"));
    const payload = JSON.parse((orderCall![1] as { body: string }).body);
    const pdfUrl = new URL(payload.items[0].files[0].url);

    expect(JSON.parse(pdfUrl.searchParams.get("layouts")!)).toEqual({ [STORY_ID]: "photo_hero" });
    expect(pdfUrl.searchParams.get("theme")).toBe("forest");
    expect(pdfUrl.searchParams.get("lang")).toBe("fr");
  });

  it("drops an unknown cover theme rather than passing it through", async () => {
    queueHappyPath();
    await POST(post(validBody({ coverTheme: "neon" })));

    const orderCall = fetchMock.mock.calls.find(c => String(c[0]).includes("/v4/orders"));
    const payload = JSON.parse((orderCall![1] as { body: string }).body);
    expect(new URL(payload.items[0].files[0].url).searchParams.get("theme")).toBeNull();
  });

  it("uses the cover width returned by Gelato rather than the local formula", async () => {
    queueHappyPath();
    await POST(post(validBody()));

    const orderCall = fetchMock.mock.calls.find(c => String(c[0]).includes("/v4/orders"));
    const payload = JSON.parse((orderCall![1] as { body: string }).body);
    expect(new URL(payload.items[0].files[0].url).searchParams.get("coverWidthMm")).toBe("444");
  });
});

describe("declared page count", () => {
  // The number sent here and the number of pages in the PDF must agree: Gelato
  // refuses the order otherwise, and the credit has already been consumed.
  function declaredPageCount() {
    const orderCall = fetchMock.mock.calls.find(c => String(c[0]).includes("/v4/orders"));
    return JSON.parse((orderCall![1] as { body: string }).body).items[0].pageCount;
  }

  it("declares the printer's minimum for a book with nothing in it", async () => {
    queueHappyPath();
    await POST(post(validBody()));

    expect(declaredPageCount()).toBe(28);
  });

  it("counts unclaimed photos two to a page and milestones eight to a page", async () => {
    // 60 photos -> 30 pages, 12 milestones -> 2 pages, 1 placeholder chapter:
    // 33 content pages, rounded up to the next multiple of four.
    const entries = Array.from({ length: 30 }, (_, i) => ({
      id: `e${i}`, entry_date: "2026-07-01", photo_urls: ["https://x/a.jpg", "https://x/b.jpg"],
    }));
    const milestones = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, achieved_at: "2026-03-01" }));
    queueContent(entries, [], milestones);

    await POST(post(validBody()));

    expect(declaredPageCount()).toBe(36);
  });

  it("does not charge a page for a photo its chapter already carries", async () => {
    const stories = [{ id: STORY_ID, period_start: "2026-01-01", period_end: "2026-01-31", created_at: "2026-01-01" }];
    const entries = [{ id: "e1", entry_date: "2026-01-15", photo_urls: ["https://x/a.jpg"] }];
    queueContent(entries, stories);

    await POST(post(validBody()));

    expect(declaredPageCount()).toBe(28); // one chapter, no photo page of its own
  });
});

describe("a purchased book may not exceed the pages paid for", () => {
  // Book credits are a bare integer, so the link between a payment and the size
  // of the book it bought lives in events_log. Without this check, declaring a
  // one-chapter book at checkout and ordering the full one reopens the hole
  // closed in session 64.
  const bigBook = Array.from({ length: 30 }, (_, i) => ({
    id: `e${i}`, entry_date: "2026-07-01", photo_urls: ["https://x/a.jpg", "https://x/b.jpg"],
  }));

  /** pet, entries, stories, milestones, then the credit and the grants. */
  function queueWithGrants(opts: {
    entries?: unknown[];
    credits: number;
    grants: unknown[];
  }) {
    db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
    db.queueRead({ data: opts.entries ?? [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: { plan: "print", book_credits: opts.credits } });
    db.queueRead({ data: opts.grants });
    db.queueRpc({ data: true, error: null });
  }

  it("refuses the order, and leaves the credit untouched", async () => {
    queueWithGrants({
      entries: bigBook,                       // 60 photos -> 32 declared pages
      credits: 1,
      grants: [{ id: "g1", metadata: { page_count: 28 }, triggered_at: "2026-09-01" }],
    });

    const res = await POST(post(validBody()));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "book_larger_than_paid", paidPages: 28, pages: 32 });
    expect(db.rpcs).toHaveLength(0);          // no credit spent on a refused order
    expect(fetchMock).not.toHaveBeenCalled(); // Gelato never contacted
  });

  it("lets a subscriber spend an included credit on a bigger book", async () => {
    // Two credits, one purchase: the second credit came with the Print plan and
    // its book has no per-page price, so the purchase must not shrink it.
    queueWithGrants({
      entries: bigBook,
      credits: 2,
      grants: [{ id: "g1", metadata: { page_count: 28 }, triggered_at: "2026-09-01" }],
    });

    const res = await POST(post(validBody()));

    expect(res.status).toBe(200);
    expect(db.rpcs).toEqual([{ fn: "try_consume_book_credit", args: { p_user_id: "user_1" } }]);
  });

  it("marks the purchase spent once Gelato has accepted the order", async () => {
    queueWithGrants({
      credits: 1,
      grants: [{ id: "g1", metadata: { page_count: 28, stripe_session_id: "cs_1" }, triggered_at: "2026-09-01" }],
    });

    await POST(post(validBody()));

    const spent = db.updates.find(u => u.table === "events_log");
    expect(spent?.values).toMatchObject({
      metadata: { page_count: 28, stripe_session_id: "cs_1", consumed_by: "gel_1" },
    });
  });

  it("spends nothing when the credit did not come from a purchase", async () => {
    queueWithGrants({ credits: 1, grants: [] });

    const res = await POST(post(validBody()));

    expect(res.status).toBe(200);
    expect(db.updates.find(u => u.table === "events_log")).toBeUndefined();
  });

  it("ignores a purchase already spent on another book", async () => {
    queueWithGrants({
      entries: bigBook,
      credits: 1,
      grants: [{ id: "g1", metadata: { page_count: 200, consumed_by: "gelato-order-0" }, triggered_at: "2026-09-01" }],
    });

    const res = await POST(post(validBody()));

    // The only grant is spent, so nothing caps this order.
    expect(res.status).toBe(200);
  });
});

describe("the free plan cannot order a book", () => {
  // The rule lived in canOrderBook and was called nowhere: only the order
  // page's button was greyed out, while the API accepted. Same shape as the
  // ten-entry cap, which had no server-side effect until a trigger gave it one.
  it("refuses before consuming anything", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
    db.queueRead({ data: [] });                       // entries
    db.queueRead({ data: [] });                       // stories
    db.queueRead({ data: [] });                       // milestones
    db.queueRead({ data: { plan: "free", book_credits: 1 } });

    const res = await POST(post(validBody()));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "upgrade_required" });
    expect(db.rpcs).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still serves a paid plan", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: { plan: "digital", book_credits: 1 } });
    db.queueRead({ data: [] });                       // grants
    db.queueRpc({ data: true, error: null });

    const res = await POST(post(validBody()));

    expect(res.status).toBe(200);
  });
});

/**
 * The price of an extra book, and the ceiling it buys.
 *
 * The buyer declares which chapters and which year they are about to order.
 * That declaration is only ever used to SELECT database rows, never as a price,
 * and the page count it produces is written into the Stripe session so
 * `/api/gelato/order` can refuse a larger book later. Declaring a small book to
 * pay less therefore buys a small book.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

let user: { id: string; email: string } | null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
}));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

const sessionCreate = vi.fn(async (..._args: unknown[]) => ({ url: "https://stripe.test/session" }));
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (...a: unknown[]) => sessionCreate(...a) } } },
}));

import { POST } from "./route";

const PET_ID = "eeee0002-0005-0005-0005-000000000002";
const S1 = "aaaa0001-0000-0000-0000-000000000001";
const S2 = "aaaa0002-0000-0000-0000-000000000002";

function post(body: unknown) {
  return new Request("http://localhost/api/stripe/book-checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/** Reads in order: pet, buyer's plan, stories, entries, milestones. */
function queueContent(opts: { stories?: unknown[]; entries?: unknown[]; milestones?: unknown[]; plan?: string } = {}) {
  db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
  db.queueRead({ data: { plan: opts.plan ?? "digital" } });
  db.queueRead({ data: opts.stories ?? [] });
  db.queueRead({ data: opts.entries ?? [] });
  db.queueRead({ data: opts.milestones ?? [] });
}

const story = (id: string, period_start: string, period_end: string) =>
  ({ id, period_start, period_end, created_at: period_start });
const photoEntry = (id: string, entry_date: string, count = 2) =>
  ({ id, entry_date, photo_urls: Array.from({ length: count }, (_, i) => `https://x/${id}-${i}.jpg`) });

/** What the created Stripe session charges, in major units. */
function sessionArgs(): { line_items: { price_data: { unit_amount: number } }[]; metadata: Record<string, string> } {
  return sessionCreate.mock.calls[0][0] as never;
}

function chargedAmount(): number {
  return sessionArgs().line_items[0].price_data.unit_amount / 100;
}

function sessionMetadata(): Record<string, string> {
  return sessionArgs().metadata;
}

beforeEach(() => {
  db = createSupabaseStub();
  user = { id: "user_1", email: "buyer@example.com" };
  sessionCreate.mockClear();
});

describe("guards", () => {
  it("refuses an anonymous caller", async () => {
    user = null;
    expect((await POST(post({ petId: PET_ID }))).status).toBe(401);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("refuses a petId that is not a uuid", async () => {
    expect((await POST(post({ petId: "nope" }))).status).toBe(400);
  });

  it("refuses a pet the caller does not own", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "someone_else" } });
    expect((await POST(post({ petId: PET_ID }))).status).toBe(403);
    expect(sessionCreate).not.toHaveBeenCalled();
  });
});

describe("price of the declared book", () => {
  it("charges for the chapters declared, not for everything the pet holds", async () => {
    // 60 photos, all of them inside the second chapter's period. Declaring only
    // the first chapter buys a book that does not carry them.
    const entries = Array.from({ length: 30 }, (_, i) => photoEntry(`e${i}`, "2026-06-15"));
    queueContent({
      stories: [story(S1, "2026-01-01", "2026-01-31"), story(S2, "2026-06-01", "2026-06-30")],
      entries,
    });

    await POST(post({ petId: PET_ID, storyIds: [S2] }));

    // Every photo sits inside the declared chapter: 1 chapter + dedication +
    // tributes, so the printer's 28-page floor and its floor price.
    expect(chargedAmount()).toBe(28);
    expect(sessionMetadata().page_count).toBe("28");
  });

  it("charges more when the declared selection leaves the photos unclaimed", async () => {
    const entries = Array.from({ length: 30 }, (_, i) => photoEntry(`e${i}`, "2026-06-15"));
    queueContent({
      stories: [story(S1, "2026-01-01", "2026-01-31"), story(S2, "2026-06-01", "2026-06-30")],
      entries,
    });

    // Same content, but the chapter covering the photos is left out: they now
    // need 30 pages of their own.
    await POST(post({ petId: PET_ID, storyIds: [S1] }));

    expect(Number(sessionMetadata().page_count)).toBe(36);
    expect(chargedAmount()).toBeGreaterThan(28);
  });

  it("keeps only the declared year", async () => {
    queueContent({
      stories: [story(S1, "2025-01-01", "2025-01-31"), story(S2, "2026-06-01", "2026-06-30")],
      entries: [photoEntry("e1", "2025-03-02"), photoEntry("e2", "2026-03-02")],
      milestones: [{ id: "m1", achieved_at: "2025-05-01" }, { id: "m2", achieved_at: "2026-05-01" }],
    });

    await POST(post({ petId: PET_ID, storyIds: [S1, S2], year: 2026 }));

    // 2026 only: one chapter, one unclaimed entry of two photos, one milestone,
    // plus dedication and tributes. Under the floor, so 28 pages.
    expect(sessionMetadata().page_count).toBe("28");
  });

  it("ignores a selection that is not a list of uuids and prices the worst case", async () => {
    // Eight chapters on purpose: a selection that matches nothing would price
    // one placeholder chapter (36 pages), while the worst case prices all eight
    // (40). Without that gap the test would pass with the guard removed.
    const stories = Array.from({ length: 8 }, (_, i) =>
      story(`aaaa000${i}-0000-0000-0000-00000000000${i}`, `2026-0${i + 1}-01`, `2026-0${i + 1}-28`));
    const entries = Array.from({ length: 30 }, (_, i) => photoEntry(`e${i}`, "2026-11-15"));
    queueContent({ stories, entries });

    await POST(post({ petId: PET_ID, storyIds: ["'; drop table stories; --"] }));

    // 8 chapters + 30 photo pages + dedication + tributes = 40.
    expect(Number(sessionMetadata().page_count)).toBe(40);
  });

  it("prices the worst case when nothing is declared, so an older client never underpays", async () => {
    const entries = Array.from({ length: 30 }, (_, i) => photoEntry(`e${i}`, "2026-06-15"));
    queueContent({
      stories: [story(S1, "2026-01-01", "2026-01-31"), story(S2, "2026-06-01", "2026-06-30")],
      entries,
    });

    await POST(post({ petId: PET_ID }));

    // 2 chapters + 30 photo pages + dedication + tributes = 34 -> 36.
    expect(Number(sessionMetadata().page_count)).toBe(36);
  });

  it("writes the page count into the session, which is what caps the order later", async () => {
    queueContent();

    await POST(post({ petId: PET_ID, storyIds: [S1] }));

    expect(sessionMetadata()).toMatchObject({
      user_id: "user_1",
      plan: "book_only",
      pet_id: PET_ID,
      page_count: "28",
    });
  });
});

describe("the free plan cannot buy a book", () => {
  it("refuses before creating a Stripe session", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
    db.queueRead({ data: { plan: "free" } });

    const res = await POST(post({ petId: PET_ID }));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "upgrade_required" });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("sells to a subscriber who has no credit left, which is the whole point", async () => {
    db.queueRead({ data: { id: PET_ID, user_id: "user_1" } });
    db.queueRead({ data: { plan: "digital" } });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });
    db.queueRead({ data: [] });

    await POST(post({ petId: PET_ID, storyIds: [S1] }));

    expect(sessionCreate).toHaveBeenCalledTimes(1);
  });
});

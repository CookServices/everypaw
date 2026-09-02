/**
 * A gift is paid for once. The rules that matter here are that it goes out
 * exactly once on the day it is due, and that a failed send is retried rather
 * than lost.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));
vi.mock("@/lib/auth", () => ({ verifyCronRoute: () => null }));

const send = vi.fn(async (_payload: Record<string, unknown>) => ({ data: { id: "e_1" }, error: null }));
vi.mock("@/lib/resend", () => ({ sendEmail: (payload: Record<string, unknown>) => send(payload) }));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { GET } from "./route";

const GIFT = {
  id: "g_1",
  promo_code: "GIFT-ABC123",
  recipient_email: "someone@example.com",
  sender_name: "Julien",
  message: "Joyeux anniversaire",
  locale: "fr",
  deliver_on: "2026-09-02",
};

const req = () => new Request("http://localhost/api/cron/gift-deliveries");

beforeEach(() => {
  db = createSupabaseStub();
  send.mockClear();
  send.mockImplementation(async () => ({ data: { id: "e_1" }, error: null }));
});

describe("due gifts", () => {
  it("sends the gift and keeps it marked as sent", async () => {
    db.queueRead({ data: [GIFT] });   // due rows
    db.queueRead({ count: 1 });        // claim

    const res = await GET(req());
    const body = await res.json();

    expect(body).toEqual({ due: 1, sent: 1, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1);

    const claim = db.updates.find(u => (u.values as Record<string, unknown>).sent_at);
    expect(claim).toBeDefined();
    // The claim is written before the send, never after it.
    expect(db.updates.filter(u => (u.values as Record<string, unknown>).sent_at === null)).toHaveLength(0);
  });

  it("skips a row another run has already claimed", async () => {
    db.queueRead({ data: [GIFT] });
    db.queueRead({ count: 0 });        // claim lost the race

    const body = await (await GET(req())).json();

    expect(send).not.toHaveBeenCalled();
    expect(body.sent).toBe(0);
  });

  it("hands the row back when the send fails, so tomorrow retries it", async () => {
    db.queueRead({ data: [GIFT] });
    db.queueRead({ count: 1 });
    send.mockRejectedValueOnce(new Error("resend down"));

    const body = await (await GET(req())).json();

    expect(body).toEqual({ due: 1, sent: 0, failed: 1 });
    const release = db.updates.filter(u => (u.values as Record<string, unknown>).sent_at === null);
    expect(release).toHaveLength(1);
  });

  it("does nothing when nothing is due", async () => {
    db.queueRead({ data: [] });

    const body = await (await GET(req())).json();

    expect(body).toEqual({ due: 0, sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});

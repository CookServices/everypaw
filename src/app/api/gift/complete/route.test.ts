/**
 * A gift bought for a later date must wait for that date.
 *
 * The buyer picks any day, often months out for a birthday or Christmas, and no
 * provider schedules that far (Resend caps at 30 days). A gift that leaves
 * immediately spoils the surprise it was bought for, so the dated ones go to
 * `gift_deliveries` and a daily cron sends them on the day.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

const sessionRetrieve = vi.fn();
const promoCreate = vi.fn(async (..._a: unknown[]) => ({ code: "GIFT-XYZ" }));
const piRetrieve = vi.fn(async (..._a: unknown[]) => ({ id: "pi_1", metadata: {} }));
const piUpdate = vi.fn(async (..._a: unknown[]) => ({}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { retrieve: (...a: unknown[]) => sessionRetrieve(...a) } },
    promotionCodes: { create: (...a: unknown[]) => promoCreate(...a) },
    paymentIntents: {
      retrieve: (...a: unknown[]) => piRetrieve(...a),
      update: (...a: unknown[]) => piUpdate(...a),
    },
  },
}));

const sendEmail = vi.fn(async (..._a: unknown[]) => ({ error: null }));
vi.mock("@/lib/resend", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { POST } from "./route";

function post(sessionId = "cs_gift_1") {
  return new Request("http://localhost/api/gift/complete", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
    headers: { "Content-Type": "application/json" },
  });
}

function paidGift(metadata: Record<string, string> = {}) {
  return {
    payment_status: "paid",
    payment_intent: { id: "pi_1", metadata: {} },
    metadata: {
      gift: "true",
      recipient_email: "friend@example.com",
      recipient_name: "Alex",
      sender_name: "Julien",
      message: "Joyeux Noël",
      locale: "fr",
      plan: "print",
      ...metadata,
    },
  };
}

beforeEach(() => {
  db = createSupabaseStub();
  sessionRetrieve.mockReset();
  promoCreate.mockClear();
  piUpdate.mockClear();
  sendEmail.mockClear();
  vi.stubEnv("STRIPE_GIFT_COUPON_ID", "coupon_1");
});

describe("a dated gift waits", () => {
  it("goes to the queue instead of the recipient's inbox", async () => {
    const nextChristmas = `${new Date().getFullYear() + 1}-12-24`;
    sessionRetrieve.mockResolvedValue(paidGift({ scheduled_date: nextChristmas }));

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ scheduledFor: nextChristmas });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.upserts).toEqual([{
      table: "gift_deliveries",
      row: expect.objectContaining({
        checkout_session_id: "cs_gift_1",
        promo_code: "GIFT-XYZ",
        recipient_email: "friend@example.com",
        deliver_on: nextChristmas,
        locale: "fr",
      }),
    }]);
  });

  it("sends straight away when no date was picked", async () => {
    sessionRetrieve.mockResolvedValue(paidGift());

    await POST(post());

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(db.upserts).toHaveLength(0);
  });

  it("sends straight away for a date that has already passed", async () => {
    sessionRetrieve.mockResolvedValue(paidGift({ scheduled_date: "2020-01-01" }));

    await POST(post());

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(db.upserts).toHaveLength(0);
  });

  it("refuses a session that was never paid", async () => {
    sessionRetrieve.mockResolvedValue({ ...paidGift(), payment_status: "unpaid" });

    const res = await POST(post());

    expect(res.status).toBe(402);
    expect(promoCreate).not.toHaveBeenCalled();
    expect(db.upserts).toHaveLength(0);
  });

  it("does nothing twice when the payment already carries a sent gift", async () => {
    sessionRetrieve.mockResolvedValue({
      ...paidGift({ scheduled_date: "2030-12-24" }),
      payment_intent: { id: "pi_1", metadata: { gift_email_sent: "true" } },
    });

    await POST(post());

    expect(promoCreate).not.toHaveBeenCalled();
    expect(db.upserts).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

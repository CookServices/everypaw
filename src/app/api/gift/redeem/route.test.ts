/**
 * Tests for gift redemption by a user who already pays for a subscription.
 *
 * That path defers the gift through a subscription schedule, exactly like an
 * upgrade does. Two things must hold: the promotion code is burned only once the
 * gift is actually scheduled, and a subscription already set to cancel is
 * refused rather than silently un-cancelled by the schedule's end_behavior.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

// PRICE_MAP is read from the environment when stripe-helpers is first imported.
vi.hoisted(() => {
  process.env.STRIPE_PRICE_ID_DIGITAL_EUR = "price_digital_eur";
  process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR = "price_print_eur";
  process.env.STRIPE_GIFT_COUPON_ID = "coupon_free";
});

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

const promoList = vi.fn();
const promoUpdate = vi.fn();
const subRetrieve = vi.fn();
const scheduleCreate = vi.fn();
const scheduleUpdate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    promotionCodes: {
      list: (...a: unknown[]) => promoList(...a),
      update: (...a: unknown[]) => promoUpdate(...a),
    },
    subscriptions: { retrieve: (...a: unknown[]) => subRetrieve(...a) },
    subscriptionSchedules: {
      create: (...a: unknown[]) => scheduleCreate(...a),
      update: (...a: unknown[]) => scheduleUpdate(...a),
      retrieve: vi.fn(),
    },
  },
}));

let db: ReturnType<typeof createSupabaseStub>;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user_1", email: "u@example.com" } } }) },
    from: (table: string) => db.client.from(table),
  }),
}));
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { POST } from "./route";

const PERIOD_END = 1800000000;

function post(code = "GIFT-ABC123") {
  return new Request("http://localhost/api/gift/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
    headers: { "content-type": "application/json", "x-vercel-ip-country": "FR" },
  });
}

/** A valid, unused gift code for a Print plan, held by a paying subscriber. */
function setup(subscription: Record<string, unknown>) {
  promoList.mockResolvedValue({ data: [{ id: "promo_1", active: true, metadata: { plan: "print" } }] });
  db.queueRead({ data: { stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1", plan: "digital" } });
  subRetrieve.mockResolvedValue({
    id: "sub_1",
    items: { data: [{ price: { id: "price_digital_eur" } }] },
    current_period_end: PERIOD_END,
    ...subscription,
  });
  scheduleCreate.mockResolvedValue({ id: "sub_sched_1", phases: [{ start_date: 1700000000 }] });
  scheduleUpdate.mockResolvedValue({ id: "sub_sched_1" });
  promoUpdate.mockResolvedValue({ id: "promo_1", active: false });
}

beforeEach(() => {
  db = createSupabaseStub();
  promoList.mockReset();
  promoUpdate.mockReset();
  subRetrieve.mockReset();
  scheduleCreate.mockReset();
  scheduleUpdate.mockReset();
});

describe("subscriber with a pending cancellation", () => {
  it("refuses the redemption instead of lifting the cancellation", async () => {
    setup({ cancel_at_period_end: true, schedule: null });

    const res = await POST(post());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("cancel_pending");
    expect(scheduleCreate).not.toHaveBeenCalled();
    expect(scheduleUpdate).not.toHaveBeenCalled();
  });

  it("leaves the gift code usable for later", async () => {
    setup({ cancel_at_period_end: true, schedule: null });

    await POST(post());

    expect(promoUpdate).not.toHaveBeenCalled();
  });
});

describe("subscriber without a pending cancellation", () => {
  it("schedules the gift for the next renewal and burns the code", async () => {
    setup({ cancel_at_period_end: false, schedule: null });

    const res = await POST(post());
    const body = await res.json();

    expect(body).toMatchObject({ scheduled: true, activatesAt: PERIOD_END, plan: "print_annual" });
    expect(scheduleCreate).toHaveBeenCalledWith({ from_subscription: "sub_1" });
    expect(promoUpdate).toHaveBeenCalledWith("promo_1", { active: false });

    // Phase 1 keeps the current price until the pivot, phase 2 is the gifted plan.
    const [, update] = scheduleUpdate.mock.calls[0] as [string, Record<string, unknown>];
    const phases = update.phases as Array<Record<string, unknown>>;
    expect(phases[0]).toMatchObject({ end_date: PERIOD_END });
    expect(phases[1].items).toEqual([{ price: "price_print_eur", quantity: 1 }]);
  });
});

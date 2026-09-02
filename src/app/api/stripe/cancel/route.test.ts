/**
 * Tests for the cancellation route.
 *
 * The rule that matters here: a subscription driven by a schedule (a pending
 * upgrade, or a redeemed gift) must have that schedule released BEFORE
 * cancel_at_period_end is set. A schedule's phases and end_behavior decide what
 * happens at the pivot date, so cancelling underneath one either fails or is
 * silently undone, and the user keeps being billed after being told otherwise.
 *
 * If the release fails, nothing is cancelled and the caller gets an error: a
 * half-applied cancellation that reports success is the outcome to avoid.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSupabaseStub } from "@/lib/test-utils/supabase-stub";

vi.mock("next/headers", () => ({ cookies: () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@/lib/log", () => ({ log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} } }));

const subRetrieve = vi.fn();
const subUpdate = vi.fn();
const scheduleRelease = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: (...a: unknown[]) => subRetrieve(...a),
      update: (...a: unknown[]) => subUpdate(...a),
    },
    subscriptionSchedules: { release: (...a: unknown[]) => scheduleRelease(...a) },
  },
}));

let db: ReturnType<typeof createSupabaseStub>;
let authUser: { id: string } | null = { id: "user_1" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authUser } }) },
    from: (table: string) => db.client.from(table),
  }),
}));
vi.mock("@/lib/plan", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/plan")>()),
  getServiceSupabase: () => db.client,
}));

import { POST } from "./route";

/** Profile row read by the handler, then the subscription Stripe returns. */
function setup(subscription: Record<string, unknown>) {
  db.queueRead({ data: { stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1" } });
  subRetrieve.mockResolvedValue({ id: "sub_1", ...subscription });
  subUpdate.mockResolvedValue({ cancel_at: 1800000000, current_period_end: 1800000000 });
}

beforeEach(() => {
  db = createSupabaseStub();
  authUser = { id: "user_1" };
  subRetrieve.mockReset();
  subUpdate.mockReset();
  scheduleRelease.mockReset();
});

describe("cancellation without a pending plan change", () => {
  it("sets cancel_at_period_end and releases nothing", async () => {
    setup({ schedule: null });

    const res = await POST();
    const body = await res.json();

    expect(scheduleRelease).not.toHaveBeenCalled();
    expect(subUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    expect(body.success).toBe(true);
    expect(body.dropped_scheduled_change).toBe(false);
    expect(body.cancel_at).toBe(1800000000);
  });
});

describe("cancellation with a pending plan change", () => {
  it("releases the schedule before cancelling, and says so", async () => {
    setup({ schedule: "sub_sched_1" });

    const res = await POST();
    const body = await res.json();

    expect(scheduleRelease).toHaveBeenCalledWith("sub_sched_1");
    expect(subUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    expect(body.dropped_scheduled_change).toBe(true);
  });

  it("reads the schedule id when Stripe expands it into an object", async () => {
    setup({ schedule: { id: "sub_sched_2", object: "subscription_schedule" } });

    await POST();

    expect(scheduleRelease).toHaveBeenCalledWith("sub_sched_2");
  });

  it("cancels nothing when the release fails", async () => {
    setup({ schedule: "sub_sched_1" });
    scheduleRelease.mockRejectedValue(new Error("schedule already released"));

    const res = await POST();

    expect(res.status).toBe(500);
    expect(subUpdate).not.toHaveBeenCalled();
  });
});

describe("guards", () => {
  it("401s an anonymous caller without touching Stripe", async () => {
    authUser = null;

    const res = await POST();

    expect(res.status).toBe(401);
    expect(subRetrieve).not.toHaveBeenCalled();
  });

  it("400s when the profile has no subscription to cancel", async () => {
    db.queueRead({ data: { stripe_subscription_id: null, stripe_customer_id: null } });

    const res = await POST();

    expect(res.status).toBe(400);
    expect(subUpdate).not.toHaveBeenCalled();
  });
});

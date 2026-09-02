/**
 * Shared Stripe helpers, single source of truth for PRICE_MAP and subscription utilities.
 * Import from here in all /api/stripe/* routes to avoid drift between copies.
 */

import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/plan";
import { log } from "@/lib/log";
import type { Currency } from "@/lib/currency";

// ── Price map ─────────────────────────────────────────────────────────────────

export const PRICE_MAP: Record<string, Record<Currency, string | undefined>> = {
  digital: {
    EUR: process.env.STRIPE_PRICE_ID_DIGITAL_EUR,
    USD: process.env.STRIPE_PRICE_ID_DIGITAL_USD,
  },
  print_annual: {
    EUR: process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR,
    USD: process.env.STRIPE_PRICE_PRINT_ANNUAL_USD,
  },
};

// ── attachedScheduleId ────────────────────────────────────────────────────────

/**
 * ID of the subscription schedule driving this subscription, if any.
 * Stripe returns either the ID or the expanded object, depending on the call.
 *
 * A schedule owns the subscription's future: its phases and `end_behavior`
 * decide what happens at period end. Any route about to change that future
 * (upgrade, gift redemption, cancellation) has to look here first.
 */
export function attachedScheduleId(subscription: Stripe.Subscription): string | null {
  const schedule = subscription.schedule;
  if (!schedule) return null;
  return typeof schedule === "string" ? schedule : schedule.id;
}

// ── resolveSubscriptionId ─────────────────────────────────────────────────────

/**
 * Returns the active subscription ID for a user.
 * Falls back to a live Stripe lookup if the DB value is missing,
 * and backfills the DB on success.
 */
export async function resolveSubscriptionId(
  stripe: Stripe,
  userId: string,
  subscriptionId: string | null,
  customerId: string | null,
): Promise<string | null> {
  if (subscriptionId) return subscriptionId;
  if (!customerId) return null;
  try {
    const list = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const sub = list.data[0];
    if (sub) {
      await getServiceSupabase().from("profiles").update({ stripe_subscription_id: sub.id }).eq("id", userId);
      return sub.id;
    }
  } catch (err) {
    log.error("[stripe-helpers] resolveSubscriptionId error:", err);
  }
  return null;
}

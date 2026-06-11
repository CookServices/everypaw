/**
 * Shared Stripe helpers, single source of truth for PRICE_MAP and subscription utilities.
 * Import from here in all /api/stripe/* routes to avoid drift between copies.
 */

import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/plan";
import type { Currency } from "@/lib/currency";

// ── Price map ─────────────────────────────────────────────────────────────────

export const PRICE_MAP: Record<string, Record<Currency, string | undefined>> = {
  digital: {
    EUR: process.env.STRIPE_PRICE_ID_DIGITAL_EUR,
    USD: process.env.STRIPE_PRICE_ID_DIGITAL_USD,
  },
  digital_annual: {
    EUR: process.env.STRIPE_PRICE_ID_DIGITAL_ANNUAL_EUR,
    USD: process.env.STRIPE_PRICE_ID_DIGITAL_ANNUAL_USD,
  },
  print_monthly: {
    EUR: process.env.STRIPE_PRICE_ID_PRINT_EUR,
    USD: process.env.STRIPE_PRICE_ID_PRINT_USD,
  },
  print_annual: {
    EUR: process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR ?? process.env.STRIPE_PRICE_PRINT_ANNUAL,
    USD: process.env.STRIPE_PRICE_PRINT_ANNUAL_USD ?? process.env.STRIPE_PRICE_PRINT_ANNUAL,
  },
};

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
    console.error("[stripe-helpers] resolveSubscriptionId error:", err);
  }
  return null;
}

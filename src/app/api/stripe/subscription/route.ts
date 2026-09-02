import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase, priceIdToPlan } from "@/lib/plan";
import { attachedScheduleId } from "@/lib/stripe-helpers";

import { stripe } from "@/lib/stripe";

function formatSubscription(sub: Stripe.Subscription) {
  return {
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    cancel_at: sub.cancel_at,
    current_period_end: sub.current_period_end,
    interval: (sub.items.data[0]?.plan?.interval ?? "month") as "month" | "year",
  };
}

/**
 * A plan change scheduled for the next renewal, if one is pending.
 *
 * `upgrade` and `gift/redeem` both defer the change through a subscription
 * schedule: phase 1 is the current plan, phase 2 the new one. Without this, the
 * pending change existed only in the toast shown at the moment of the click and
 * was invisible on the next page load.
 */
async function pendingPlanChange(sub: Stripe.Subscription) {
  const scheduleId = attachedScheduleId(sub);
  if (!scheduleId) return null;

  try {
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    const nextPhase = schedule.phases[1];
    if (!nextPhase) return null;

    const price = nextPhase.items?.[0]?.price;
    const priceId = typeof price === "string" ? price : price?.id;
    return {
      plan: priceId ? priceIdToPlan(priceId) : null,
      at: nextPhase.start_date,
    };
  } catch (err) {
    // Never fail the whole subscription read over the pending-change extra.
    log.error("[stripe/subscription] schedule retrieve error:", err);
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Fast path: subscription ID already stored
  if (profile?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      return NextResponse.json({
        plan: profile.plan ?? "free",
        subscription: formatSubscription(sub),
        scheduled_change: await pendingPlanChange(sub),
      });
    } catch (err) {
      log.error("[stripe/subscription] retrieve error:", err);
    }
  }

  // Fallback: look up active subscription via customer ID and backfill stripe_subscription_id
  if (profile?.stripe_customer_id) {
    try {
      const list = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active", limit: 1 });
      const sub = list.data[0];
      if (sub) {
        await getServiceSupabase()
          .from("profiles")
          .update({ stripe_subscription_id: sub.id })
          .eq("id", user.id);
        return NextResponse.json({
          plan: profile.plan ?? "free",
          subscription: formatSubscription(sub),
          scheduled_change: await pendingPlanChange(sub),
        });
      }
    } catch (err) {
      log.error("[stripe/subscription] customer lookup error:", err);
    }
  }

  return NextResponse.json({ plan: profile?.plan ?? "free", subscription: null });
}

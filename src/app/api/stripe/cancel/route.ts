import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attachedScheduleId, resolveSubscriptionId } from "@/lib/stripe-helpers";

import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const subscriptionId = await resolveSubscriptionId(
    stripe,
    user.id,
    profile?.stripe_subscription_id ?? null,
    profile?.stripe_customer_id ?? null,
  );

  if (!subscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    // A pending plan change (upgrade, or a redeemed gift) lives in a subscription
    // schedule whose phase 2 starts exactly at current_period_end, with
    // end_behavior "release". Setting cancel_at_period_end while that schedule is
    // attached is not a cancellation: Stripe either refuses the update, or the
    // schedule takes over at the pivot date and the user keeps being billed on the
    // new plan after being told the subscription was cancelled (backlog #12b).
    //
    // Releasing the schedule detaches it and leaves the subscription on its current
    // price, so the cancellation below behaves like any other. The pending plan
    // change is dropped on purpose - the user asked to leave.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const scheduleId = attachedScheduleId(subscription);
    if (scheduleId) {
      await stripe.subscriptionSchedules.release(scheduleId);
      log.debug(`[stripe/cancel] user ${user.id} released pending schedule ${scheduleId}`);
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    log.debug(`[stripe/cancel] user ${user.id} scheduled cancellation at ${updated.cancel_at}`);
    return NextResponse.json({
      success: true,
      cancel_at: updated.cancel_at,
      current_period_end: updated.current_period_end,
      dropped_scheduled_change: !!scheduleId,
    });
  } catch (err) {
    log.error("[stripe/cancel] Error:", err);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}

import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSubscriptionId } from "@/lib/stripe-helpers";

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
    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    log.debug(`[stripe/cancel] user ${user.id} scheduled cancellation at ${updated.cancel_at}`);
    return NextResponse.json({
      success: true,
      cancel_at: updated.cancel_at,
      current_period_end: updated.current_period_end,
    });
  } catch (err) {
    log.error("[stripe/cancel] Error:", err);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}

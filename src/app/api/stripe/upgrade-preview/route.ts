import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PRICE_MAP, resolveSubscriptionId } from "@/lib/stripe-helpers";

import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const newPlan = searchParams.get("newPlan");

  // Explicit allowlist (3-plan system: free, digital monthly, print annual)
  const ALLOWED_PLANS = ["digital", "print_annual"];
  if (!newPlan || !ALLOWED_PLANS.includes(newPlan) || !PRICE_MAP[newPlan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.stripe_customer_id ?? null;
  const subscriptionId = await resolveSubscriptionId(
    stripe,
    user.id,
    profile?.stripe_subscription_id ?? null,
    customerId,
  );

  if (!subscriptionId || !customerId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Mirrors the guard in stripe/upgrade: a scheduled cancellation must be reactivated first,
    // creating a subscription schedule would silently discard it (backlog #12).
    if (subscription.cancel_at_period_end) {
      return NextResponse.json({ error: "Reactivate your subscription before changing plans" }, { status: 400 });
    }

    // Plan changes are now always deferred to period end (no proration, no immediate charge).
    // The preview simply tells the client when the change will take effect.
    return NextResponse.json({
      scheduledDate: subscription.current_period_end,
    });
  } catch (err) {
    log.error("[stripe/upgrade-preview] Error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

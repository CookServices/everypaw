import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PRICE_MAP, resolveSubscriptionId } from "@/lib/stripe-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const newPlan = searchParams.get("newPlan");

  // Explicit allowlist, PRICE_MAP also has print_monthly but that plan is not offered (3-plan system)
  const ALLOWED_PLANS = ["digital", "digital_annual", "print_annual"];
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

    // Plan changes are now always deferred to period end (no proration, no immediate charge).
    // The preview simply tells the client when the change will take effect.
    return NextResponse.json({
      scheduledDate: subscription.current_period_end,
    });
  } catch (err) {
    console.error("[stripe/upgrade-preview] Error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

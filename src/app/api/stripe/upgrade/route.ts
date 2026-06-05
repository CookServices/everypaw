import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/currency";
import { PRICE_MAP, resolveSubscriptionId } from "@/lib/stripe-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPlan } = await req.json();

  // Explicit allowlist — PRICE_MAP also has print_monthly but that plan is not offered (3-plan system)
  const ALLOWED_PLANS = ["digital", "digital_annual", "print_annual"];
  if (!newPlan || !ALLOWED_PLANS.includes(newPlan) || !PRICE_MAP[newPlan]) {
    return NextResponse.json({ error: "Invalid plan or missing price ID" }, { status: 400 });
  }

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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });

    // Use the subscription's existing currency so EUR/USD stays consistent throughout the lifecycle
    const subCurrency = (subscription.currency?.toUpperCase() ?? "USD") as Currency;
    const newPriceId = PRICE_MAP[newPlan]?.[subCurrency];

    if (!newPriceId) {
      console.error("[stripe/upgrade] Missing price ID for plan:", newPlan, "currency:", subCurrency);
      return NextResponse.json({ error: "Missing price ID for this plan/currency combination" }, { status: 400 });
    }

    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "always_invoice",
    });

    // Map plan key to valid DB plan value ("digital_annual" → "digital", etc.)
    const dbPlan = newPlan.startsWith("digital") ? "digital" : "print";

    // Stripe succeeded — update DB. If this fails, the webhook will reconcile.
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ plan: dbPlan, is_premium: true })
      .eq("id", user.id);

    if (dbError) {
      console.error("[stripe/upgrade] DB update failed after Stripe success — webhook will reconcile:", dbError);
    }

    console.log(`[stripe/upgrade] user ${user.id} → plan: ${newPlan} (${subCurrency})`);
    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err) {
    console.error("[stripe/upgrade] Error:", err);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 500 });
  }
}

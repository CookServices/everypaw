import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, Record<Currency, string | undefined>> = {
  digital: {
    EUR: process.env.STRIPE_PRICE_ID_DIGITAL_EUR,
    USD: process.env.STRIPE_PRICE_ID_DIGITAL_USD,
  },
  print: {
    EUR: process.env.STRIPE_PRICE_ID_PRINT_EUR,
    USD: process.env.STRIPE_PRICE_ID_PRINT_USD,
  },
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPlan } = await req.json();

  if (!newPlan || !PRICE_MAP[newPlan]) {
    return NextResponse.json({ error: "Invalid plan or missing price ID" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });

    // Use the subscription's existing currency so EUR/USD stays consistent throughout the lifecycle
    const subCurrency = (subscription.currency?.toUpperCase() ?? "USD") as Currency;
    const newPriceId = PRICE_MAP[newPlan]?.[subCurrency];

    if (!newPriceId) {
      console.error("[stripe/upgrade] Missing price ID for plan:", newPlan, "currency:", subCurrency);
      return NextResponse.json({ error: "Missing price ID for this plan/currency combination" }, { status: 400 });
    }

    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "always_invoice",
    });

    // Stripe succeeded — update DB. If this fails, the webhook will reconcile.
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ plan: newPlan, is_premium: true })
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

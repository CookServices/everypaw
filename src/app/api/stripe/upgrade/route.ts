import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { priceIdToPlan } from "@/lib/plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const VALID_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_DIGITAL_MONTHLY,
  process.env.STRIPE_PRICE_ID_DIGITAL,
  process.env.STRIPE_PRICE_PRINT_MONTHLY,
  process.env.STRIPE_PRICE_ID_PRINT,
].filter(Boolean));

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPriceId } = await req.json();

  if (!newPriceId || !VALID_PRICE_IDS.has(newPriceId)) {
    return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
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

    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "always_invoice",
    });

    const newPlan = priceIdToPlan(newPriceId) ?? "digital";
    await supabase
      .from("profiles")
      .update({ plan: newPlan, is_premium: true })
      .eq("id", user.id);

    console.log(`[stripe/upgrade] user ${user.id} upgraded to plan: ${newPlan}`);
    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err) {
    console.error("[stripe/upgrade] Error:", err);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 500 });
  }
}

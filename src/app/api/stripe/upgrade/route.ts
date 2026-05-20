import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, string | undefined> = {
  digital: process.env.STRIPE_PRICE_ID_DIGITAL,
  print:   process.env.STRIPE_PRICE_ID_PRINT,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPlan } = await req.json();

  if (!newPlan || !PRICE_MAP[newPlan]) {
    return NextResponse.json({ error: "Invalid plan or missing price ID" }, { status: 400 });
  }

  const newPriceId = PRICE_MAP[newPlan]!;

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

    await supabase
      .from("profiles")
      .update({ plan: newPlan, is_premium: true })
      .eq("id", user.id);

    console.log(`[stripe/upgrade] user ${user.id} → plan: ${newPlan}`);
    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err) {
    console.error("[stripe/upgrade] Error:", err);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 500 });
  }
}

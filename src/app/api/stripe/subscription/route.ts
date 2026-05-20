import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ plan: profile?.plan ?? "free", subscription: null });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    return NextResponse.json({
      plan: profile.plan ?? "free",
      subscription: {
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancel_at: subscription.cancel_at,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (err) {
    console.error("[stripe/subscription] Stripe fetch error:", err);
    return NextResponse.json({ plan: profile.plan ?? "free", subscription: null });
  }
}

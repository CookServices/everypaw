import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    console.log(`[stripe/cancel] user ${user.id} scheduled cancellation at ${updated.cancel_at}`);
    return NextResponse.json({
      success: true,
      cancel_at: updated.cancel_at,
      current_period_end: updated.current_period_end,
    });
  } catch (err) {
    console.error("[stripe/cancel] Error:", err);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}

import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function formatSubscription(sub: Stripe.Subscription) {
  return {
    status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end,
    cancel_at: sub.cancel_at,
    current_period_end: sub.current_period_end,
    interval: (sub.items.data[0]?.plan?.interval ?? "month") as "month" | "year",
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Fast path: subscription ID already stored
  if (profile?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      return NextResponse.json({ plan: profile.plan ?? "free", subscription: formatSubscription(sub) });
    } catch (err) {
      log.error("[stripe/subscription] retrieve error:", err);
    }
  }

  // Fallback: look up active subscription via customer ID and backfill stripe_subscription_id
  if (profile?.stripe_customer_id) {
    try {
      const list = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active", limit: 1 });
      const sub = list.data[0];
      if (sub) {
        await getServiceSupabase()
          .from("profiles")
          .update({ stripe_subscription_id: sub.id })
          .eq("id", user.id);
        return NextResponse.json({ plan: profile.plan ?? "free", subscription: formatSubscription(sub) });
      }
    } catch (err) {
      log.error("[stripe/subscription] customer lookup error:", err);
    }
  }

  return NextResponse.json({ plan: profile?.plan ?? "free", subscription: null });
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function resolveSubscriptionId(
  userId: string,
  subscriptionId: string | null,
  customerId: string | null,
): Promise<string | null> {
  if (subscriptionId) return subscriptionId;
  if (!customerId) return null;
  try {
    // Subscription is still active (cancel_at_period_end=true), so status = "active"
    const list = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const sub = list.data[0];
    if (sub) {
      await getServiceSupabase().from("profiles").update({ stripe_subscription_id: sub.id }).eq("id", userId);
      return sub.id;
    }
  } catch (err) {
    console.error("[stripe/reactivate] customer lookup error:", err);
  }
  return null;
}

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
    user.id,
    profile?.stripe_subscription_id ?? null,
    profile?.stripe_customer_id ?? null,
  );

  if (!subscriptionId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    console.log(`[stripe/reactivate] user ${user.id} reactivated subscription ${subscriptionId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[stripe/reactivate] Error:", err);
    return NextResponse.json({ error: "Reactivation failed" }, { status: 500 });
  }
}

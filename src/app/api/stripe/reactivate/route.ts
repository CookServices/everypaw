import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSubscriptionId } from "@/lib/stripe-helpers";

import { stripe } from "@/lib/stripe";

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
    stripe,
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

    log.debug(`[stripe/reactivate] user ${user.id} reactivated subscription ${subscriptionId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("[stripe/reactivate] Error:", err);
    return NextResponse.json({ error: "Reactivation failed" }, { status: 500 });
  }
}

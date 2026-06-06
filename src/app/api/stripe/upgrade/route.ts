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
    const currentPriceId = subscription.items.data[0]?.price.id;
    if (!currentPriceId) return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });

    // Use the subscription's existing currency so EUR/USD stays consistent throughout the lifecycle
    const subCurrency = (subscription.currency?.toUpperCase() ?? "USD") as Currency;
    const newPriceId = PRICE_MAP[newPlan]?.[subCurrency];

    if (!newPriceId) {
      console.error("[stripe/upgrade] Missing price ID for plan:", newPlan, "currency:", subCurrency);
      return NextResponse.json({ error: "Missing price ID for this plan/currency combination" }, { status: 400 });
    }

    if (currentPriceId === newPriceId) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    const periodEnd = subscription.current_period_end;

    // Schedule the plan change at end of current billing period via subscription schedules.
    // This avoids any proration charge and any $0 invoice — the new price applies cleanly
    // at the next renewal, as if the user had subscribed to the new plan from day one.
    const existingScheduleId = typeof subscription.schedule === "string"
      ? subscription.schedule
      : (subscription.schedule as Stripe.SubscriptionSchedule | null)?.id ?? null;

    let schedule: Stripe.SubscriptionSchedule;

    if (existingScheduleId) {
      schedule = await stripe.subscriptionSchedules.retrieve(existingScheduleId);
    } else {
      schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscriptionId,
      });
    }

    // Phase 1: keep current plan until end of billing period (no change, no proration)
    // Phase 2: switch to new plan — charged at full price on next renewal
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          start_date: schedule.phases[0].start_date,
          end_date: periodEnd,
          items: [{ price: currentPriceId, quantity: 1 }],
          proration_behavior: "none",
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          proration_behavior: "none",
        },
      ],
    });

    // DB plan is NOT updated here — the webhook customer.subscription.updated will fire
    // when phase 2 starts (new price kicks in) and reconcile the DB at that point.
    console.log(`[stripe/upgrade] user ${user.id} → plan: ${newPlan} (${subCurrency}) scheduled at ${new Date(periodEnd * 1000).toISOString()}`);
    return NextResponse.json({ success: true, scheduledAt: periodEnd });
  } catch (err) {
    console.error("[stripe/upgrade] Error:", err);
    return NextResponse.json({ error: "Upgrade failed" }, { status: 500 });
  }
}

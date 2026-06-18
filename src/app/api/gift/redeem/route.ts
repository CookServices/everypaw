import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PRICE_MAP, resolveSubscriptionId } from "@/lib/stripe-helpers";
import { getCurrencyFromCountry } from "@/lib/currency";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { code } = body;
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  if (code.length > 50 || !/^[A-Z0-9_-]+$/i.test(code)) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const promotionCodes = await stripe.promotionCodes.list({ code });
    const promoCode = promotionCodes.data[0];

    if (!promoCode || !promoCode.active) {
      return NextResponse.json({ error: "Invalid or already used code" }, { status: 400 });
    }

    // Prevent gift code theft: ensure code is intended for this user if recipient is specified
    const recipientEmail = promoCode.metadata?.recipient_email;
    if (recipientEmail && recipientEmail !== user.email) {
      return NextResponse.json({ error: "This gift code is not for your account" }, { status: 403 });
    }

    // Read plan from promotion code metadata
    // Normalize: "print" (legacy) → "print_annual" to match 3-plan system
    const rawPlan = promoCode.metadata?.plan;
    const planKey = (rawPlan === "print" || rawPlan === "print_annual") ? "print_annual" : "digital";

    // Derive currency from user's country for the checkout session
    const country = req.headers.get("x-vercel-ip-country");
    const currency = getCurrencyFromCountry(country);
    const priceId = PRICE_MAP[planKey]?.[currency];

    log.debug("[gift/redeem] plan:", planKey, "currency:", currency, "priceId:", priceId ?? "(not set)");

    if (!priceId) {
      log.error(`[gift/redeem] Missing price ID for plan ${planKey} / currency ${currency}, check PRICE_MAP env vars`);
      return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
    }

    const giftCouponId = process.env.STRIPE_GIFT_COUPON_ID?.trim();
    if (!giftCouponId) {
      log.error("[gift/redeem] Missing STRIPE_GIFT_COUPON_ID");
      return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
    }

    // Check if user has an active paid subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    const hasPaidSub = profile?.plan !== "free" && !!profile?.stripe_subscription_id;

    if (hasPaidSub) {
      // User already has a paid subscription → schedule the gift to activate at period end
      // via a subscription schedule (same mechanism as plan-change deferral).
      // No checkout redirect needed, the change is applied server-side.
      const subscriptionId = await resolveSubscriptionId(
        stripe, user.id,
        profile.stripe_subscription_id ?? null,
        profile.stripe_customer_id ?? null,
      );

      if (!subscriptionId) {
        return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const currentPriceId = subscription.items.data[0]?.price.id;
      if (!currentPriceId) {
        return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });
      }

      const periodEnd = subscription.current_period_end;

      // Create or retrieve an existing schedule for this subscription
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

      // Phase 1: current plan unchanged until period end
      // Phase 2: gift plan with 100% off coupon, starting at renewal
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
            items: [{ price: priceId, quantity: 1 }],
            discounts: [{ coupon: giftCouponId }],
            proration_behavior: "none",
          },
        ],
      });

      log.debug(`[gift/redeem] user ${user.id} → gift ${planKey} scheduled for ${new Date(periodEnd * 1000).toISOString()}`);
      return NextResponse.json({ scheduled: true, activatesAt: periodEnd, plan: planKey });
    }

    // No active subscription → create a Stripe checkout session (free, 100% coupon)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      discounts: [{ coupon: giftCouponId }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?gift=activated`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/redeem?code=${code}`,
      customer_email: user.email,
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    log.error("Gift redeem error:", error);
    return NextResponse.json({ error: "Failed to redeem gift" }, { status: 500 });
  }
}

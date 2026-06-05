import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PRICE_MAP } from "@/lib/stripe-helpers";
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

    console.log("[gift/redeem] plan:", planKey, "currency:", currency, "priceId:", priceId ?? "(not set)");

    if (!priceId) {
      console.error(`[gift/redeem] Missing price ID for plan ${planKey} / currency ${currency} — check PRICE_MAP env vars`);
      return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
    }

    const giftCouponId = process.env.STRIPE_GIFT_COUPON_ID?.trim();
    if (!giftCouponId) {
      console.error("[gift/redeem] Missing STRIPE_GIFT_COUPON_ID");
      return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
    }

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
    console.error("Gift redeem error:", error);
    return NextResponse.json({ error: "Failed to redeem gift" }, { status: 500 });
  }
}

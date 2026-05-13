import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      mode: "subscription",
      discounts: [{ promotion_code: promoCode.id }],
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

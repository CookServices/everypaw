import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Support both naming conventions (STRIPE_PRICE_DIGITAL_MONTHLY or STRIPE_PRICE_ID_DIGITAL)
const PRICE_MAP: Record<string, string | undefined> = {
  digital:       process.env.STRIPE_PRICE_DIGITAL_MONTHLY ?? process.env.STRIPE_PRICE_ID_DIGITAL,
  print_monthly: process.env.STRIPE_PRICE_PRINT_MONTHLY   ?? process.env.STRIPE_PRICE_ID_PRINT,
  print_annual:  process.env.STRIPE_PRICE_PRINT_ANNUAL,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan = "digital" } = await req.json().catch(() => ({}));
  const priceId = PRICE_MAP[plan];

  console.log("[stripe/checkout] plan:", plan, "priceId:", priceId ?? "(not set)");

  if (!priceId) {
    console.error("[stripe/checkout] Missing price ID for plan:", plan, "— check STRIPE_PRICE_DIGITAL_MONTHLY / STRIPE_PRICE_ID_DIGITAL env vars");
    return NextResponse.json({ error: "Invalid plan or missing price ID" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/upgrade`,
    customer_email: user.email,
    metadata: { user_id: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}

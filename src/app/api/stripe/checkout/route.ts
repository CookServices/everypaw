import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrencyFromCountry, type Currency } from "@/lib/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, Record<Currency, string | undefined>> = {
  digital: {
    EUR: process.env.STRIPE_PRICE_ID_DIGITAL_EUR,
    USD: process.env.STRIPE_PRICE_ID_DIGITAL_USD,
  },
  print_monthly: {
    EUR: process.env.STRIPE_PRICE_ID_PRINT_EUR,
    USD: process.env.STRIPE_PRICE_ID_PRINT_USD,
  },
  print_annual: {
    EUR: process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR ?? process.env.STRIPE_PRICE_PRINT_ANNUAL,
    USD: process.env.STRIPE_PRICE_PRINT_ANNUAL_USD ?? process.env.STRIPE_PRICE_PRINT_ANNUAL,
  },
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan = "digital" } = await req.json().catch(() => ({}));

  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);
  const priceId = PRICE_MAP[plan]?.[currency];

  console.log("[stripe/checkout] plan:", plan, "country:", country ?? "unknown", "currency:", currency, "priceId:", priceId ?? "(not set)");

  if (!priceId) {
    console.error("[stripe/checkout] Missing price ID for plan:", plan, "currency:", currency, "— check STRIPE_PRICE_ID_DIGITAL_EUR/USD and STRIPE_PRICE_ID_PRINT_EUR/USD env vars");
    return NextResponse.json({ error: "Invalid plan or missing price ID" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    customer_email: user.email,
    metadata: { user_id: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}

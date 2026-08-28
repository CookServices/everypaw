import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrencyFromCountry } from "@/lib/currency";
import { PRICE_MAP } from "@/lib/stripe-helpers";

import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan = "digital" } = await req.json().catch(() => ({}));

  // Explicit allowlist (3-plan system: free, digital monthly, print annual)
  const ALLOWED_PLANS = ["digital", "print_annual"];
  if (!ALLOWED_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Guard against a second subscription: a premium user hitting this twice would
  // spawn a new Stripe customer + subscription, orphaning the first (billed but
  // no longer referenced, so uncancellable from the app).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id, is_premium")
    .eq("id", user.id)
    .single();

  if (existingProfile?.stripe_subscription_id && existingProfile.is_premium) {
    return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
  }

  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);
  const priceId = PRICE_MAP[plan]?.[currency];

  log.debug("[stripe/checkout] plan:", plan, "country:", country ?? "unknown", "currency:", currency, "priceId:", priceId ?? "(not set)");

  if (!priceId) {
    log.error("[stripe/checkout] Missing price ID for plan:", plan, "currency:", currency, ", check STRIPE_PRICE_ID_DIGITAL_EUR/USD and STRIPE_PRICE_PRINT_ANNUAL_EUR/USD env vars");
    return NextResponse.json({ error: "Invalid plan or missing price ID" }, { status: 400 });
  }

  // Reuse the existing Stripe customer when we have one so repeat purchases don't
  // fan out into duplicate customer records.
  const customerBinding = existingProfile?.stripe_customer_id
    ? { customer: existingProfile.stripe_customer_id }
    : { customer_email: user.email ?? undefined };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    ...customerBinding,
    metadata: { user_id: user.id, plan },
    custom_text: {
      terms_of_service_acceptance: {
        message: currency === "EUR"
          ? "En finalisant votre commande, vous acceptez les [Conditions générales de vente](https://everypaw.app/legal/cgv)."
          : "By completing your order, you agree to our [Terms of Service](https://everypaw.app/legal/terms).",
      },
    },
    consent_collection: { terms_of_service: "required" },
  });

  return NextResponse.json({ url: session.url });
}

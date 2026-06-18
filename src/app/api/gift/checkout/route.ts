import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { getCurrencyFromCountry } from "@/lib/currency";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { Currency } from "@/lib/currency";

const GIFT_PRICE_MAP: Record<string, Record<Currency, string | undefined>> = {
  digital: {
    EUR: process.env.STRIPE_GIFT_PRICE_ID_DIGITAL_EUR,
    USD: process.env.STRIPE_GIFT_PRICE_ID_DIGITAL_USD,
  },
  print_annual: {
    EUR: process.env.STRIPE_GIFT_PRICE_ID_PRINT_EUR,
    USD: process.env.STRIPE_GIFT_PRICE_ID_PRINT_USD,
  },
};

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`gift-checkout:${getClientIp(req)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { recipientEmail, recipientName, senderName, message, scheduledDate, locale, plan } = body;

  if (!recipientEmail || !recipientName || !senderName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
  }

  const normalizedPlan = (plan === "print" || plan === "print_annual") ? "print_annual" : "digital";

  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);
  const priceId = GIFT_PRICE_MAP[normalizedPlan]?.[currency];

  if (!priceId) {
    log.error("[gift/checkout] Missing gift price ID for plan:", normalizedPlan, "currency:", currency);
    return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const emailLocale: "fr" | "en" = locale === "fr" ? "fr" : "en";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "payment",
    success_url: `${appUrl}/gift?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/gift`,
    customer_email: recipientEmail,
    metadata: {
      gift: "true",
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      sender_name: senderName,
      message: message ?? "",
      scheduled_date: scheduledDate ?? "",
      locale: emailLocale,
      plan: normalizedPlan,
    },
    custom_text: {
      terms_of_service_acceptance: {
        message: currency === "EUR"
          ? "En finalisant votre commande, vous acceptez les [Conditions générales de vente](https://everypaw.app/legal/cgv)."
          : "By completing your order, you agree to our [Terms of Service](https://everypaw.app/legal/cgv).",
      },
    },
    consent_collection: { terms_of_service: "required" },
  });

  return NextResponse.json({ url: session.url });
}

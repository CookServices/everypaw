import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getCurrencyFromCountry } from "@/lib/currency";
import { calcGelatoBookPrice } from "@/lib/gelato-pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGE_COUNT = 500; // Gelato practical limit

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId, pageCount } = await req.json().catch(() => ({}));

  if (!pageCount || typeof pageCount !== "number" || pageCount < 28 || pageCount > MAX_PAGE_COUNT) {
    return NextResponse.json({ error: "Invalid pageCount" }, { status: 400 });
  }

  // Validate petId to prevent path manipulation in redirect URLs
  if (petId !== undefined && petId !== "" && !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  const country = req.headers.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);

  const priceInMajor = calcGelatoBookPrice(pageCount);
  const unitAmount = Math.round(priceInMajor * 100); // cents

  const productName =
    currency === "EUR"
      ? `Livre Everypaw — ${pageCount} pages`
      : `Everypaw Book — ${pageCount} pages`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: unitAmount,
          product_data: { name: productName },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pets/${petId ?? ""}/order?book_paid=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pets/${petId ?? ""}/order`,
    customer_email: user.email,
    metadata: {
      user_id: user.id,
      plan: "book_only",
      pet_id: petId ?? "",
    },
  });

  return NextResponse.json({ url: session.url });
}

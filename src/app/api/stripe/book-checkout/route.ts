import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId } = await req.json().catch(() => ({}));

  const priceId = process.env.STRIPE_PRICE_BOOK_ONCE;
  if (!priceId) {
    return NextResponse.json({ error: "Book price not configured" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?book_ordered=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/upgrade`,
    customer_email: user.email,
    metadata: {
      user_id: user.id,
      plan: "book_only",
      pet_id: petId ?? "",
    },
  });

  return NextResponse.json({ url: session.url });
}

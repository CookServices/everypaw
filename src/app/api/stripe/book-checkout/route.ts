import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";
import { getCurrencyFromCountry } from "@/lib/currency";
import { calcGelatoBookPrice } from "@/lib/gelato-pricing";
import { paginateBook } from "@/lib/book-pages";

import { stripe } from "@/lib/stripe";
import { UUID_REGEX } from "@/lib/validation";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId } = await req.json().catch(() => ({}));

  if (!petId || typeof petId !== "string" || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  const db = getServiceSupabase();

  const { data: pet } = await db.from("pets").select("id, user_id").eq("id", petId).single();
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Price must never be computed from client input: the actual page count
  // (and therefore the Gelato order placed later in /api/gelato/order) is
  // derived independently, server-side, from this pet's real content. A
  // client-supplied pageCount here would let anyone declare the cheapest
  // page count while still receiving a book sized to their full content.
  //
  // Worst case, not the exact filtered count the user will end up choosing
  // on the order screen (year filter, story selection, dedication, tributes
  // aren't known yet at checkout time): ALL of this pet's stories, every photo
  // counted as unclaimed, every milestone, dedication and tributes assumed
  // present. paginateBook is monotonic in every input, so this is always >=
  // whatever /api/gelato/order computes for any subset of the same content, at
  // the cost of sometimes charging slightly more than the final book needs.
  // The order page shows this same worst case, so the price displayed is the
  // price charged.
  const [{ count: storyCount }, { data: photoEntries }, { count: milestoneCount }] = await Promise.all([
    db.from("stories").select("id", { count: "exact", head: true }).eq("pet_id", petId),
    db.from("entries").select("photo_urls").eq("pet_id", petId).not("photo_urls", "is", null),
    db.from("milestones").select("id", { count: "exact", head: true }).eq("pet_id", petId),
  ]);

  const photoCount = (photoEntries ?? []).reduce(
    (total: number, e: { photo_urls: string[] | null }) => total + (e.photo_urls?.length ?? 0),
    0,
  );

  const pageCount = paginateBook({
    storyCount: storyCount ?? 0,
    orphanPhotoCount: photoCount,
    milestoneCount: milestoneCount ?? 0,
    hasDedication: true,
    hasTributes: true,
  }).declaredPages;

  const country = req.headers.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);

  const priceInMajor = calcGelatoBookPrice(pageCount);
  const unitAmount = Math.round(priceInMajor * 100); // cents

  const productName =
    currency === "EUR"
      ? `Livre Everypaw, ${pageCount} pages`
      : `Everypaw Book, ${pageCount} pages`;

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
    allow_promotion_codes: true,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pets/${petId}/order?book_paid=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pets/${petId}/order`,
    customer_email: user.email,
    metadata: {
      user_id: user.id,
      plan: "book_only",
      pet_id: petId,
    },
  });

  return NextResponse.json({ url: session.url });
}

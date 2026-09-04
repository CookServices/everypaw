import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";
import { getCurrencyFromCountry } from "@/lib/currency";
import { calcGelatoBookPrice } from "@/lib/gelato-pricing";
import { paginateBook } from "@/lib/book-pages";

import { stripe } from "@/lib/stripe";
import { UUID_REGEX } from "@/lib/validation";
import { collectOrphanPhotoUrls, MIN_YEAR, MAX_YEAR } from "@/lib/book-shared";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { petId, storyIds, year } = await req.json().catch(() => ({}));

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
  // The buyer declares which chapters and which year they are about to order,
  // and the price is computed for THAT book. The declaration is never trusted
  // on its own: the content behind it is read from the database, and
  // /api/gelato/order refuses to print a book larger than the pages paid for
  // (recorded in the session metadata below). Declaring a small book to pay
  // less therefore buys a small book, which is the point.
  //
  // Without a declaration (an older client, or a caller that sends only a pet)
  // the price falls back to the worst case: all chapters, every photo counted
  // as unclaimed, every milestone. paginateBook is monotonic, so that fallback
  // is never below what the final order computes.
  const declaredStoryIds: string[] | null = Array.isArray(storyIds)
    && storyIds.length > 0
    && storyIds.every((id: unknown) => typeof id === "string" && UUID_REGEX.test(id))
      ? storyIds
      : null;

  const declaredYear = Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year as number : null;

  const [{ data: stories }, { data: photoEntries }, { data: milestones }] = await Promise.all([
    db.from("stories").select("id, content, period_start, period_end, created_at").eq("pet_id", petId),
    db.from("entries").select("id, entry_date, photo_urls").eq("pet_id", petId),
    db.from("milestones").select("id, achieved_at").eq("pet_id", petId),
  ]);

  const inYear = (date: string | null) =>
    declaredYear === null || (!!date && new Date(date).getFullYear() === declaredYear);

  const selectedStories = (stories ?? []).filter(s =>
    (declaredStoryIds === null || declaredStoryIds.includes(s.id))
    && inYear(s.period_start ?? s.created_at));
  const entriesInYear = (photoEntries ?? []).filter(e => inYear(e.entry_date));
  const milestonesInYear = (milestones ?? []).filter(m => inYear(m.achieved_at));

  // With a declaration, photos inside a selected chapter are composed in that
  // chapter and cost no page of their own. Without one, they all count.
  const orphanPhotoCount = declaredStoryIds === null && declaredYear === null
    ? entriesInYear.reduce((total, e) => total + (e.photo_urls?.length ?? 0), 0)
    : collectOrphanPhotoUrls(entriesInYear, selectedStories).length;

  // Chapters are measured at their worst: the tightest layout and four photos,
  // so the count can only exceed what the final order declares.
  const pricedStories = declaredStoryIds === null && declaredYear === null
    ? (stories ?? [])
    : selectedStories;

  const pageCount = paginateBook({
    chapters: pricedStories.map(story => ({
      contentLength: (story.content ?? "").trim().length,
      layout: "split",
      photoCount: 4,
    })),
    orphanPhotoCount,
    milestoneCount: milestonesInYear.length,
    // Both are one page each and neither is known here: assumed present, which
    // can only round the price up, never below what the order will declare.
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
      // Read back by the webhook, then by /api/gelato/order as the ceiling on
      // the book this payment may print.
      page_count: String(pageCount),
    },
  });

  return NextResponse.json({ url: session.url });
}

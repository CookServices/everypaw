import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getCurrencyFromCountry } from "@/lib/currency";
import { getServiceSupabase, canOrderBook } from "@/lib/plan";
import type { Plan } from "@/lib/plan-guards";
import { generatePdfToken } from "@/lib/pdf-token";
import { paginateBook } from "@/lib/book-pages";
import { collectOrphanPhotoUrls, bestStoryIndexForDate } from "@/lib/book-shared";

import { stripe } from "@/lib/stripe";

const GELATO_PRODUCT_UID = "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver";
import { UUID_REGEX } from "@/lib/validation";

export async function POST(req: Request) {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    petId,
    shippingAddress,
    memorial,
    selectedStoryIds,
    dedicationText,
    coverPhotoUrl,
    yearFilter,
    lang,
    coverTheme,
    customTitle,
    storyLayouts,
    stripeSessionId,
    includeTributes,
  } = body;

  // Validate selectedStoryIds format to prevent injection into URL params
  if (Array.isArray(selectedStoryIds)) {
    const invalid = selectedStoryIds.find((id: unknown) => typeof id !== "string" || !UUID_REGEX.test(id));
    if (invalid !== undefined) {
      return NextResponse.json({ error: "Invalid storyId format" }, { status: 400 });
    }
  }

  // Validate coverPhotoUrl protocol, only https URLs accepted
  if (coverPhotoUrl !== undefined && coverPhotoUrl !== null && coverPhotoUrl !== "") {
    try {
      const parsed = new URL(coverPhotoUrl);
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "Invalid coverPhotoUrl" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid coverPhotoUrl" }, { status: 400 });
    }
  }

  // Validate yearFilter, must be an integer in [2000, 2100]
  if (yearFilter !== undefined && yearFilter !== null) {
    if (!Number.isInteger(yearFilter) || yearFilter < 2000 || yearFilter > 2100) {
      return NextResponse.json({ error: "Invalid yearFilter" }, { status: 400 });
    }
  }

  // Validate dedicationText, max 500 chars
  const MAX_DEDICATION = 500;
  if (dedicationText !== undefined && dedicationText !== null) {
    if (typeof dedicationText !== "string" || dedicationText.length > MAX_DEDICATION) {
      return NextResponse.json({ error: "Dedication too long (max 500 chars)" }, { status: 400 });
    }
  }

  // Validate shippingAddress fields, presence + max length
  const ADDR_MAX = 100;
  if (!shippingAddress ||
      typeof shippingAddress.firstName !== "string" || shippingAddress.firstName.length > ADDR_MAX ||
      typeof shippingAddress.lastName !== "string" || shippingAddress.lastName.length > ADDR_MAX ||
      typeof shippingAddress.addressLine1 !== "string" || shippingAddress.addressLine1.length > ADDR_MAX ||
      (shippingAddress.addressLine2 !== undefined && shippingAddress.addressLine2 !== "" &&
       (typeof shippingAddress.addressLine2 !== "string" || shippingAddress.addressLine2.length > ADDR_MAX)) ||
      typeof shippingAddress.city !== "string" || shippingAddress.city.length > ADDR_MAX ||
      typeof shippingAddress.postCode !== "string" || shippingAddress.postCode.length > 20 ||
      typeof shippingAddress.country !== "string" || shippingAddress.country.length > 3) {
    return NextResponse.json({ error: "Invalid shipping address" }, { status: 400 });
  }

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  if (!process.env.GELATO_API_KEY) {
    log.error("[gelato/order] GELATO_API_KEY is not set");
    return NextResponse.json({ error: "Order service not configured" }, { status: 500 });
  }

  const supabase = getServiceSupabase();

  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Determine currency from user's country header
  const country = req.headers.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);

  // Fetch entries + stories + milestones to compute page count accurately
  const [{ data: allEntries }, { data: allStories }, { data: allMilestones }] = await Promise.all([
    supabase.from("entries").select("id, photo_urls, entry_date").eq("pet_id", petId),
    supabase.from("stories").select("id, content, period_start, period_end, created_at").eq("pet_id", petId),
    supabase.from("milestones").select("id, achieved_at").eq("pet_id", petId),
  ]);

  const filteredEntries = yearFilter
    ? (allEntries ?? []).filter(e => new Date(e.entry_date).getFullYear() === yearFilter)
    : (allEntries ?? []);

  // Determine which stories are active (selected + year filter)
  let activeStories = (allStories ?? []);
  if (yearFilter) {
    activeStories = activeStories.filter(s => new Date(s.period_start ?? s.created_at).getFullYear() === yearFilter);
  }
  if (Array.isArray(selectedStoryIds) && selectedStoryIds.length > 0) {
    activeStories = activeStories.filter(s => selectedStoryIds.includes(s.id));
  }

  // Photos, milestones and page count all come from the shared helpers, so the
  // number declared here is exactly the number of pages book-pdf will render.
  // Gelato refuses a file whose page count contradicts the order.
  const orphanPhotoUrls = collectOrphanPhotoUrls(filteredEntries, activeStories);
  const milestones = yearFilter
    ? (allMilestones ?? []).filter(m => new Date(m.achieved_at).getFullYear() === yearFilter)
    : (allMilestones ?? []);

  // Photos composed into each chapter, counted the way book-pdf composes them
  // (best match, four per chapter at most): they eat into the text its first
  // page can hold, so they change how many pages the chapter needs.
  const chapterPhotoCount = activeStories.map(() => 0);
  for (const entry of filteredEntries) {
    if (!entry.photo_urls?.length) continue;
    const idx = bestStoryIndexForDate(new Date(entry.entry_date), activeStories);
    if (idx >= 0 && chapterPhotoCount[idx] < 4) chapterPhotoCount[idx] += 1;
  }

  const hasDedication = !!(dedicationText && dedicationText.trim().length > 0);
  const storyCount = activeStories.length;
  const pageCount = paginateBook({
    chapters: activeStories.map((story, i) => ({
      contentLength: (story.content ?? "").trim().length,
      layout: typeof storyLayouts?.[story.id] === "string" ? storyLayouts[story.id] as string : "classic",
      photoCount: chapterPhotoCount[i],
    })),
    orphanPhotoCount: orphanPhotoUrls.length,
    milestoneCount: milestones.length,
    hasDedication,
    hasTributes: !!includeTributes,
  }).declaredPages;

  // A purchased book may not be larger than the book that was paid for.
  // Book credits are a bare integer, so nothing links a payment to an order:
  // the purchases are read back from events_log, where the webhook records the
  // page count each one paid for. The cap only bites when EVERY credit held is
  // a purchased one, so a Print subscriber ordering their included book (which
  // has no per-page price) is never held to the size of an extra copy they
  // also bought.
  const { data: creditProfile } = await supabase
    .from("profiles")
    .select("plan, book_credits")
    .eq("id", user.id)
    .single();

  const { data: purchaseGrants } = await supabase
    .from("events_log")
    .select("id, metadata, triggered_at")
    .eq("user_id", user.id)
    .eq("event_type", "stripe_book_checkout")
    .order("triggered_at", { ascending: true });

  const unconsumedGrants = (purchaseGrants ?? []).filter(
    (g: { metadata: Record<string, unknown> | null }) =>
      typeof g.metadata?.page_count === "number" && !g.metadata?.consumed_by,
  ) as { id: string; metadata: Record<string, unknown> }[];

  // Le plan gratuit ne commande pas de livre. La règle existait dans
  // `canOrderBook` et n'était appliquée nulle part : seul le bouton de la page
  // de commande était grisé, l'API acceptait. Même motif que le plafond des dix
  // entrées, resté sans effet serveur jusqu'à ce qu'un trigger le pose.
  if (canOrderBook((creditProfile?.plan ?? "free") as Plan, 1) === "upgrade_required") {
    log.warn("[gelato/order] free plan cannot order, user:", user.id);
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const heldCredits = creditProfile?.book_credits ?? 0;
  const capApplies = unconsumedGrants.length > 0 && unconsumedGrants.length >= heldCredits;
  const paidPages = unconsumedGrants.reduce(
    (max, g) => Math.max(max, g.metadata.page_count as number), 0,
  );

  if (capApplies && pageCount > paidPages) {
    log.warn("[gelato/order] book larger than paid:", pageCount, ">", paidPages, "user:", user.id);
    return NextResponse.json(
      { error: "book_larger_than_paid", paidPages, pages: pageCount },
      { status: 403 },
    );
  }

  // Grant to mark spent once Gelato accepts: the cheapest one that covers this
  // book, so a bigger purchase stays available for a bigger order.
  const grantToConsume = capApplies
    ? [...unconsumedGrants]
        .sort((a, b) => (a.metadata.page_count as number) - (b.metadata.page_count as number))
        .find(g => (g.metadata.page_count as number) >= pageCount) ?? null
    : null;

  // Atomically consume a book credit before calling Gelato (prevents race
  // conditions). After the cap check on purpose: refusing an order whose credit
  // was already consumed would need a compensating restore.
  const { data: consumed, error: creditError } = await supabase.rpc("try_consume_book_credit", { p_user_id: user.id });
  if (creditError || !consumed) {
    return NextResponse.json({ error: "no_book_credits" }, { status: 403 });
  }

  // Cover dimensions: call Gelato API, fallback to formula.
  // Interior pages = pageCount (content) + 2 (endpapers). Spine empirically ~0.38mm/page for 170gsm coated silk hardcover.
  const interiorPages = pageCount + 2;
  const WRAP_BLEED_MM = 23;
  const TRIM_MM = 200;
  let coverWidthMm = TRIM_MM * 2 + Math.ceil(interiorPages * 0.38 + 0.5) + WRAP_BLEED_MM * 2;
  const coverHeightMm = TRIM_MM + WRAP_BLEED_MM * 2; // always 246mm for 200mm trim

  try {
    const dimRes = await fetch(
      `https://product.gelatoapis.com/v3/products/${GELATO_PRODUCT_UID}/cover-dimensions?pageCount=${interiorPages}`,
      { headers: { "X-API-KEY": process.env.GELATO_API_KEY! } },
    );
    if (dimRes.ok) {
      const dimData = await dimRes.json();
      if (dimData?.width && typeof dimData.width === "number") coverWidthMm = Math.round(dimData.width);
    }
  } catch { /* use formula fallback */ }

  // Build PDF URL with all params
  const pdfUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/book-pdf`);
  pdfUrl.searchParams.set("petId", petId);

  const { token: pdfToken, expires: pdfExpires } = generatePdfToken(petId);
  pdfUrl.searchParams.set("token", pdfToken);
  pdfUrl.searchParams.set("expires", String(pdfExpires));

  if (Array.isArray(selectedStoryIds) && selectedStoryIds.length > 0) {
    pdfUrl.searchParams.set("storyIds", selectedStoryIds.join(","));
  }
  if (dedicationText && dedicationText.trim().length > 0) {
    pdfUrl.searchParams.set("dedication", encodeURIComponent(dedicationText.trim()));
  }
  if (yearFilter) {
    pdfUrl.searchParams.set("year", String(yearFilter));
  }
  if (coverPhotoUrl) {
    pdfUrl.searchParams.set("coverPhoto", encodeURIComponent(coverPhotoUrl));
  }
  if (lang === "fr" || lang === "en") {
    pdfUrl.searchParams.set("lang", lang);
  }
  const VALID_THEMES = ["classic", "noir", "forest", "ocean", "rose"];
  if (typeof coverTheme === "string" && VALID_THEMES.includes(coverTheme)) {
    pdfUrl.searchParams.set("theme", coverTheme);
  }
  pdfUrl.searchParams.set("coverWidthMm", String(coverWidthMm));
  pdfUrl.searchParams.set("coverHeightMm", String(coverHeightMm));
  if (typeof customTitle === "string" && customTitle.trim().length > 0) {
    pdfUrl.searchParams.set("customTitle", encodeURIComponent(customTitle.trim().slice(0, 60)));
  }
  if (includeTributes) {
    pdfUrl.searchParams.set("includeTributes", "1");
  }
  const VALID_LAYOUT_VALUES = ["classic", "photo_hero", "split", "text_only"];
  if (storyLayouts && typeof storyLayouts === "object" && !Array.isArray(storyLayouts)) {
    const safeLayouts: Record<string, string> = {};
    for (const [k, v] of Object.entries(storyLayouts)) {
      if (UUID_REGEX.test(k) && VALID_LAYOUT_VALUES.includes(v as string)) {
        safeLayouts[k] = v as string;
      }
    }
    if (Object.keys(safeLayouts).length > 0) {
      pdfUrl.searchParams.set("layouts", JSON.stringify(safeLayouts));
    }
  }

  const orderPayload = {
    orderReferenceId: `everypaw-${petId}-${Date.now()}`,
    customerReferenceId: user.id,
    currency,
    items: [
      {
        itemReferenceId: `item-${petId}`,
        productUid: GELATO_PRODUCT_UID,
        quantity: 1,
        pageCount,
        files: [
          {
            type: "default",
            url: pdfUrl.toString(),
          },
        ],
      },
    ],
    shippingAddress: {
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2 || "",
      city: shippingAddress.city,
      postCode: shippingAddress.postCode,
      country: shippingAddress.country,
      email: user.email,
    },
  };

  // Once Gelato accepts the order the credit is spent for good; post-order
  // bookkeeping failures must NOT restore it (that would give a free book).
  let orderPlaced = false;
  try {
    const response = await fetch("https://order.gelatoapis.com/v4/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.GELATO_API_KEY!,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();
    log.debug("Gelato response:", JSON.stringify(data));

    if (!response.ok) {
      log.error("Gelato error:", data);
      // Restore the credit since the order failed
      await supabase.rpc("restore_book_credit", { p_user_id: user.id });
      return NextResponse.json({ error: "Order failed" }, { status: 400 });
    }

    orderPlaced = true;

    // Update selected stories as ordered, always filter by user_id to prevent IDOR
    if (Array.isArray(selectedStoryIds) && selectedStoryIds.length > 0) {
      await supabase.from("stories")
        .update({ status: "ordered" })
        .in("id", selectedStoryIds)
        .eq("user_id", user.id);
    } else {
      await supabase.from("stories")
        .update({ status: "ordered" })
        .eq("pet_id", petId)
        .eq("user_id", user.id);
    }

    // Fetch Stripe receipt if this was a paid extra-book order
    let stripeReceiptUrl: string | null = null;
    let stripeAmountPaid: number | null = null;
    let stripeCurrency: string | null = null;
    if (typeof stripeSessionId === "string" && stripeSessionId.startsWith("cs_")) {
      try {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
          expand: ["payment_intent.latest_charge"],
        });
        const charge = (session.payment_intent as Stripe.PaymentIntent)
          ?.latest_charge as Stripe.Charge | undefined;
        stripeReceiptUrl = charge?.receipt_url ?? null;
        stripeAmountPaid = session.amount_total ?? null;
        stripeCurrency = session.currency ?? null;
      } catch { /* non-blocking */ }
    }

    // Save or update book_config as ordered
    const configPayload = {
      user_id: user.id,
      pet_id: petId,
      name: typeof customTitle === "string" && customTitle.trim().length > 0
        ? customTitle.trim()
        : `${new Date().getFullYear()}`,
      status: "ordered",
      theme: typeof coverTheme === "string" ? coverTheme : "classic",
      custom_title: typeof customTitle === "string" ? customTitle : null,
      year_filter: yearFilter ?? null,
      selected_story_ids: Array.isArray(selectedStoryIds) ? selectedStoryIds : [],
      cover_photo_url: coverPhotoUrl ?? null,
      story_layouts: storyLayouts ?? {},
      dedication_text: dedicationText ?? null,
      gelato_order_id: data.id,
      ordered_at: new Date().toISOString(),
      page_count: pageCount,
      stripe_receipt_url: stripeReceiptUrl,
      stripe_amount_paid: stripeAmountPaid,
      stripe_currency: stripeCurrency,
    };
    const bookConfigId = body.bookConfigId;
    if (bookConfigId && /^[0-9a-f-]{36}$/i.test(bookConfigId)) {
      await supabase.from("book_configs")
        .update(configPayload)
        .eq("id", bookConfigId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("book_configs").insert(configPayload);
    }

    // Mark the purchase spent, so its allowance cannot fund a second book.
    // After Gelato accepted: a grant burned on an order that never shipped
    // would cost the buyer the book they paid for.
    if (grantToConsume) {
      await supabase.from("events_log")
        .update({ metadata: { ...grantToConsume.metadata, consumed_by: data.id } })
        .eq("id", grantToConsume.id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ orderId: data.id, status: data.orderStatus });
  } catch (error) {
    log.error("Gelato order error:", error);
    // Only restore the credit if the order never reached Gelato
    if (!orderPlaced) {
      await supabase.rpc("restore_book_credit", { p_user_id: user.id });
    }
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}

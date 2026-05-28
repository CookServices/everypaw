import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getCurrencyFromCountry } from "@/lib/currency";
import { getServiceSupabase } from "@/lib/plan";
import { generatePdfToken } from "@/lib/pdf-token";
import { calcPageCount } from "@/lib/book";

const GELATO_PRODUCT_UID = "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  } = await req.json();

  // Validate selectedStoryIds format to prevent injection into URL params
  if (Array.isArray(selectedStoryIds)) {
    const invalid = selectedStoryIds.find((id: unknown) => typeof id !== "string" || !UUID_REGEX.test(id));
    if (invalid !== undefined) {
      return NextResponse.json({ error: "Invalid storyId format" }, { status: 400 });
    }
  }

  // Validate coverPhotoUrl protocol — only https URLs accepted
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

  // Validate shippingAddress fields — presence + max length
  const ADDR_MAX = 100;
  if (!shippingAddress ||
      typeof shippingAddress.firstName !== "string" || shippingAddress.firstName.length > ADDR_MAX ||
      typeof shippingAddress.lastName !== "string" || shippingAddress.lastName.length > ADDR_MAX ||
      typeof shippingAddress.addressLine1 !== "string" || shippingAddress.addressLine1.length > ADDR_MAX ||
      typeof shippingAddress.city !== "string" || shippingAddress.city.length > ADDR_MAX ||
      typeof shippingAddress.postCode !== "string" || shippingAddress.postCode.length > 20 ||
      typeof shippingAddress.country !== "string" || shippingAddress.country.length > 3) {
    return NextResponse.json({ error: "Invalid shipping address" }, { status: 400 });
  }

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  if (!process.env.GELATO_API_KEY) {
    console.error("[gelato/order] GELATO_API_KEY is not set");
    return NextResponse.json({ error: "Order service not configured" }, { status: 500 });
  }

  const supabase = getServiceSupabase();

  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Atomically consume a book credit before calling Gelato (prevents race conditions)
  const { data: consumed, error: creditError } = await supabase.rpc("try_consume_book_credit", { p_user_id: user.id });
  if (creditError || !consumed) {
    return NextResponse.json({ error: "no_book_credits" }, { status: 403 });
  }

  // Determine currency from user's country header
  const country = req.headers.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);

  // Fetch entries + stories to compute page count accurately
  const [{ data: allEntries }, { data: allStories }] = await Promise.all([
    supabase.from("entries").select("id, photo_urls, entry_date").eq("pet_id", petId),
    supabase.from("stories").select("id, period_start, period_end, created_at").eq("pet_id", petId),
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

  // hasOrphanPhotos: entries with photos that don't fall in any active story's period
  const hasOrphanPhotos = filteredEntries.some(e => {
    if (!e.photo_urls?.length) return false;
    const d = new Date(e.entry_date);
    return !activeStories.some(story => {
      const start = story.period_start ? new Date(story.period_start) : null;
      const end = story.period_end ? new Date(story.period_end) : null;
      return !!start && d >= start && (!end || d <= end);
    });
  });

  const hasDedication = !!(dedicationText && dedicationText.trim().length > 0);
  const storyCount = activeStories.length;
  const pageCount = calcPageCount(storyCount, hasOrphanPhotos, hasDedication);

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
  if (typeof customTitle === "string" && customTitle.trim().length > 0) {
    pdfUrl.searchParams.set("customTitle", encodeURIComponent(customTitle.trim().slice(0, 60)));
  }
  const VALID_LAYOUT_VALUES = ["classic", "photo_hero", "split", "text_only"];
  const UUID_REGEX_LOCAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (storyLayouts && typeof storyLayouts === "object" && !Array.isArray(storyLayouts)) {
    const safeLayouts: Record<string, string> = {};
    for (const [k, v] of Object.entries(storyLayouts)) {
      if (UUID_REGEX_LOCAL.test(k) && VALID_LAYOUT_VALUES.includes(v as string)) {
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
    console.log("Gelato response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("Gelato error:", data);
      // Restore the credit since the order failed
      await supabase.rpc("restore_book_credit", { p_user_id: user.id });
      return NextResponse.json({ error: "Order failed" }, { status: 400 });
    }

    // Update selected stories as ordered — always filter by user_id to prevent IDOR
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

    return NextResponse.json({ orderId: data.id, status: data.orderStatus });
  } catch (error) {
    console.error("Gelato order error:", error);
    // Restore the credit since the order failed
    await supabase.rpc("restore_book_credit", { p_user_id: user.id });
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrencyFromCountry } from "@/lib/currency";
import { getUserPlan, canOrderBook } from "@/lib/plan";
import { generatePdfToken } from "@/lib/pdf-token";

const GELATO_PRODUCT_UID = "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver";

function calcPageCount(storiesCount: number, hasPhotos: boolean, hasDedication: boolean): number {
  // 1 cover + 1 back cover + stories + optional dedication + optional photos page
  const total = 2 + (hasDedication ? 1 : 0) + storiesCount + (hasPhotos ? 1 : 0);
  const rounded = total % 2 === 0 ? total : total + 1; // must be even
  return Math.max(20, rounded); // Gelato minimum 20 pages
}

export async function POST(req: Request) {
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Guard: check if user can order a book
  const { plan, bookCredits } = await getUserPlan();
  const blocked = canOrderBook(plan, bookCredits);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

  const {
    petId,
    shippingAddress,
    memorial,
    selectedStoryIds,
    dedicationText,
    coverPhotoUrl,
    yearFilter,
  } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Determine currency from user's country header
  const country = req.headers.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);

  // Count entries with photos to calculate pageCount
  let entriesQuery = supabase
    .from("entries")
    .select("photo_urls, entry_date")
    .eq("pet_id", petId);
  const { data: allEntries } = await entriesQuery;

  const filteredEntries = yearFilter
    ? (allEntries ?? []).filter(e => new Date(e.entry_date).getFullYear() === yearFilter)
    : (allEntries ?? []);

  const hasPhotos = filteredEntries.some(e => e.photo_urls?.length > 0);
  const hasDedication = !!(dedicationText && dedicationText.trim().length > 0);

  // Determine story count for page calculation
  const storyCount = Array.isArray(selectedStoryIds) && selectedStoryIds.length > 0
    ? selectedStoryIds.length
    : 0;

  const pageCount = calcPageCount(storyCount, hasPhotos, hasDedication);

  // Build PDF URL with all params
  const pdfUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/preview-pdf`);
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
      return NextResponse.json({ error: "Order failed", details: data }, { status: 400 });
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

    // Consume one book credit for non-print-plan users
    if (plan !== "print") {
      await supabase.rpc("decrement_book_credits", { p_user_id: user.id });
    }

    return NextResponse.json({ orderId: data.id, status: data.orderStatus });
  } catch (error) {
    console.error("Gelato order error:", error);
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}

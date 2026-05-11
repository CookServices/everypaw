import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GELATO_PRODUCT_UID = "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petId, shippingAddress } = await req.json();

  const [{ data: pet }, { data: stories }, { data: entries }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    supabase.from("stories").select("*").eq("pet_id", petId).order("created_at", { ascending: true }),
    supabase.from("entries").select("*").eq("pet_id", petId).order("entry_date", { ascending: true }),
  ]);

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  const photos = entries
    ?.filter(e => e.photo_urls?.length > 0)
    .flatMap(e => e.photo_urls)
    .slice(0, 20) || [];

  const pages = [
    {
      pageNumber: 1,
      images: [{
        url: photos[0] || "https://everypaw.app/favicon.png",
        position: "cover",
      }],
    },
    ...( stories?.map((story, i) => ({
      pageNumber: i + 2,
      texts: [
        { text: story.title || `${pet.name}'s Story`, fontSize: 24, fontFamily: "Georgia" },
        { text: story.content, fontSize: 12, fontFamily: "Georgia" },
      ],
    })) || []),
    ...photos.slice(1).map((url, i) => ({
      pageNumber: (stories?.length || 0) + i + 2,
      images: [{ url, position: "full" }],
    })),
  ];

  const orderPayload = {
    orderReferenceId: `everypaw-${petId}-${Date.now()}`,
    customerReferenceId: user.id,
    currency: "USD",
    items: [
      {
        itemReferenceId: `item-${petId}`,
        productUid: GELATO_PRODUCT_UID,
        quantity: 1,
        pages,
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

    if (!response.ok) {
      console.error("Gelato error:", data);
      return NextResponse.json({ error: "Order failed", details: data }, { status: 400 });
    }

    await supabase.from("stories").update({ status: "ordered" }).eq("pet_id", petId);

    return NextResponse.json({ orderId: data.id, status: data.orderStatus });
  } catch (error) {
    console.error("Gelato order error:", error);
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}

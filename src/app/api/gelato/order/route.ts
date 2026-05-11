import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GELATO_PRODUCT_UID = "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver";

export async function POST(req: Request) {
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petId, shippingAddress } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).single();

  console.log("Pet found:", pet?.name, "User:", user?.id);

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  const orderPayload = {
    orderReferenceId: `everypaw-${petId}-${Date.now()}`,
    customerReferenceId: user.id,
    currency: "USD",
    items: [
      {
        itemReferenceId: `item-${petId}`,
        productUid: GELATO_PRODUCT_UID,
        quantity: 1,
        pageCount: 28,
        files: [
          {
            type: "default",
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/preview-pdf?petId=${petId}`,
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

  console.log("Sending to Gelato:", JSON.stringify(orderPayload));

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

    await supabase.from("stories").update({ status: "ordered" }).eq("pet_id", petId);

    return NextResponse.json({ orderId: data.id, status: data.orderStatus });
  } catch (error) {
    console.error("Gelato order error:", error);
    return NextResponse.json({ error: "Order failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/gelato/status/[orderId]
// Proxies Gelato order status, requires user to own a book_config with that orderId
export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = params.orderId;
  if (!orderId || orderId.length > 100) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  // Verify ownership, user must own a book_config with this Gelato order ID
  const { data: config } = await supabase
    .from("book_configs")
    .select("id")
    .eq("user_id", user.id)
    .eq("gelato_order_id", orderId)
    .maybeSingle();

  if (!config) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.GELATO_API_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const res = await fetch(`https://order.gelatoapis.com/v4/orders/${orderId}`, {
    headers: { "X-API-KEY": process.env.GELATO_API_KEY },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Gelato error" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    orderStatus: data.orderStatus,
    fulfillmentStatus: data.fulfillmentStatus,
    shipments: (data.shipments ?? []).map((s: Record<string, unknown>) => ({
      trackingCode: s.trackingCode,
      trackingUrl: s.trackingUrl,
      carrier: s.carrier,
      shippedAt: s.shippedAt,
    })),
  });
}

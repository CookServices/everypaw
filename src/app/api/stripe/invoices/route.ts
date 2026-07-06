import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { stripe } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const list = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit: 24,
    });

    const invoices = list.data
      .filter(inv => inv.status === "paid")
      .map(inv => ({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
        period_start: inv.period_start,
        period_end: inv.period_end,
      }));

    return NextResponse.json({ invoices });
  } catch (err) {
    log.error("[stripe/invoices] Error:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/currency";
import { PRICE_MAP, resolveSubscriptionId } from "@/lib/stripe-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const newPlan = searchParams.get("newPlan");

  if (!newPlan || !PRICE_MAP[newPlan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.stripe_customer_id ?? null;
  const subscriptionId = await resolveSubscriptionId(
    stripe,
    user.id,
    profile?.stripe_subscription_id ?? null,
    customerId,
  );

  if (!subscriptionId || !customerId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "Subscription item not found" }, { status: 400 });

    const subCurrency = (subscription.currency?.toUpperCase() ?? "USD") as Currency;
    const newPriceId = PRICE_MAP[newPlan]?.[subCurrency];
    if (!newPriceId) {
      return NextResponse.json({ error: "Missing price ID" }, { status: 400 });
    }

    const prorationDate = Math.floor(Date.now() / 1000);

    // Fetch upcoming invoice (proration preview)
    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: subscriptionId,
      subscription_items: [{ id: itemId, price: newPriceId }],
      subscription_proration_date: prorationDate,
    });

    // Fetch default payment method for card info
    let cardLast4: string | null = null;
    let cardBrand: string | null = null;

    try {
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ["invoice_settings.default_payment_method"],
      }) as Stripe.Customer;

      const pm = customer.invoice_settings?.default_payment_method;
      if (pm && typeof pm !== "string" && pm.card) {
        cardLast4 = pm.card.last4;
        cardBrand = pm.card.brand;
      }
    } catch (err) {
      console.error("[stripe/upgrade-preview] card lookup error:", err);
    }

    return NextResponse.json({
      amountDue: upcoming.amount_due,
      currency: upcoming.currency,
      cardLast4,
      cardBrand,
    });
  } catch (err) {
    console.error("[stripe/upgrade-preview] Error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

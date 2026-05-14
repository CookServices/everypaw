import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase, priceIdToPlan } from "@/lib/plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const metaPlan = session.metadata?.plan;

    if (!userId) {
      console.error("No user_id in session metadata");
      return NextResponse.json({ received: true });
    }

    // One-time book purchase
    if (session.mode === "payment" && metaPlan === "book_only") {
      const { error } = await supabase.rpc("increment_book_credits", { p_user_id: userId });

      if (error) {
        console.error("book_credits increment error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      console.log("Book credit added for user:", userId);
      return NextResponse.json({ received: true });
    }

    // Subscription checkout — determine plan from line items
    if (session.mode === "subscription") {
      // Expand the line items to get the price ID
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });

      const priceId = fullSession.line_items?.data?.[0]?.price?.id;
      const plan = priceId ? priceIdToPlan(priceId) : "digital";

      const { error } = await supabase
        .from("profiles")
        .update({
          plan: plan ?? "digital",
          is_premium: true,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          // Award 1 book credit immediately for Print annual (value delivered upfront)
          ...(plan === "print" ? { book_credits: 1 } : {}),
        })
        .eq("id", userId);

      if (error) {
        console.error("Supabase plan update error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      console.log(`User ${userId} upgraded to plan: ${plan}`);
    }
  }

  // ── customer.subscription.deleted ─────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: "free",
        is_premium: false,
        stripe_subscription_id: null,
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      console.error("Supabase downgrade error:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    console.log("Subscription cancelled for customer:", customerId);
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  // Handles plan changes (e.g. digital → print upgrade)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? priceIdToPlan(priceId) : null;

    if (plan) {
      await supabase
        .from("profiles")
        .update({ plan, is_premium: true })
        .eq("stripe_customer_id", customerId);
    }
  }

  return NextResponse.json({ received: true });
}

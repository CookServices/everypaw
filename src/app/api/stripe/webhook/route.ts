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

  console.log("[webhook] event:", event.id, event.type);

  const supabase = getServiceSupabase();

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const metaPlan = session.metadata?.plan;

    if (!userId) {
      console.error("[webhook] No user_id in session metadata, event:", event.id);
      return NextResponse.json({ received: true });
    }

    // One-time book purchase
    if (session.mode === "payment" && metaPlan === "book_only") {
      // Dedup: check if this Stripe event was already processed
      const { data: existing } = await supabase
        .from("events_log")
        .select("id")
        .eq("user_id", userId)
        .eq("event_type", "stripe_book_checkout")
        .contains("metadata", { stripe_event_id: event.id })
        .maybeSingle();

      if (existing) {
        console.log("[webhook] duplicate book_checkout, skipping:", event.id);
        return NextResponse.json({ received: true });
      }

      const { error } = await supabase.rpc("increment_book_credits", { p_user_id: userId });

      if (error) {
        console.error("book_credits increment error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      await supabase.from("events_log").insert({
        user_id: userId,
        event_type: "stripe_book_checkout",
        metadata: { stripe_event_id: event.id, stripe_session_id: session.id },
      });

      console.log("[webhook] book credit added for user:", userId, "event:", event.id);
      return NextResponse.json({ received: true });
    }

    // Subscription checkout — determine plan from line items
    if (session.mode === "subscription") {
      // Dedup: check if this subscription was already activated via stripe_customer_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_subscription_id, is_premium")
        .eq("id", userId)
        .single();

      if (profile?.stripe_subscription_id === session.subscription && profile?.is_premium) {
        console.log("[webhook] duplicate checkout.session.completed, skipping:", event.id);
        return NextResponse.json({ received: true });
      }

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

      console.log(`[webhook] user ${userId} upgraded to plan: ${plan}, event: ${event.id}`);
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

    console.log("[webhook] subscription cancelled for customer:", customerId, "event:", event.id);
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  // Handles plan changes, cancellations scheduled, and immediate cancellations
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? priceIdToPlan(priceId) : null;

    // Subscription became fully canceled via updated event
    if (subscription.status === "canceled") {
      await supabase
        .from("profiles")
        .update({ plan: "free", is_premium: false, stripe_subscription_id: null })
        .eq("stripe_customer_id", customerId);

      console.log("[webhook] subscription.updated → status=canceled, downgraded to free:", customerId, "event:", event.id);
      return NextResponse.json({ received: true });
    }

    // Plan change (upgrade/downgrade)
    if (plan && !subscription.cancel_at_period_end) {
      await supabase
        .from("profiles")
        .update({ plan, is_premium: true })
        .eq("stripe_customer_id", customerId);

      console.log("[webhook] subscription.updated → plan change:", plan, "for customer:", customerId, "event:", event.id);
    }

    // cancel_at_period_end = true → scheduled cancellation, keep access until period end
    if (subscription.cancel_at_period_end) {
      console.log(
        "[webhook] subscription.updated → cancel_at_period_end scheduled for customer:",
        customerId,
        "cancel_at:", subscription.cancel_at,
        "event:", event.id,
      );
      // is_premium stays true — customer.subscription.deleted handles the actual downgrade
    }
  }

  return NextResponse.json({ received: true });
}

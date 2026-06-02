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
        })
        .eq("id", userId);

      if (error) {
        console.error("Supabase plan update error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      // Book credits are awarded exclusively via invoice.payment_succeeded to avoid race conditions

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
      const { data: canceledProfile } = await supabase
        .from("profiles")
        .update({ plan: "free", is_premium: false, stripe_subscription_id: null }, { count: "exact" })
        .eq("stripe_customer_id", customerId)
        .select("id")
        .single();

      if (canceledProfile) {
        await supabase.from("events_log").insert({
          user_id: canceledProfile.id,
          event_type: "stripe_subscription_updated",
          metadata: { stripe_event_id: event.id, status: "canceled" },
        });
      }

      console.log("[webhook] subscription.updated → status=canceled, downgraded to free:", customerId, "event:", event.id);
      return NextResponse.json({ received: true });
    }

    // Plan change (upgrade/downgrade)
    if (plan && !subscription.cancel_at_period_end) {
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update({ plan, is_premium: true, subscription_renewal_date: subscription.current_period_end })
        .eq("stripe_customer_id", customerId)
        .select("id")
        .single();

      if (updatedProfile) {
        await supabase.from("events_log").insert({
          user_id: updatedProfile.id,
          event_type: "stripe_subscription_updated",
          metadata: { stripe_event_id: event.id, plan, status: subscription.status },
        });
      }

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

  // ── invoice.payment_succeeded ─────────────────────────────────────────────
  // Awards 1 book credit to Print subscribers on first payment and renewals.
  // Single source of truth for Print book credits — checkout.session.completed no longer awards them.
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const billingReason = invoice.billing_reason;

    if (billingReason === "subscription_cycle" || billingReason === "subscription_create") {
      const priceId = invoice.lines?.data?.[0]?.price?.id;
      const printPriceIds = [
        process.env.STRIPE_PRICE_ID_PRINT_EUR,
        process.env.STRIPE_PRICE_ID_PRINT_USD,
        process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR,
        process.env.STRIPE_PRICE_PRINT_ANNUAL_USD,
        process.env.STRIPE_PRICE_PRINT_ANNUAL,
      ].filter(Boolean);

      if (!priceId || !printPriceIds.includes(priceId)) {
        return NextResponse.json({ received: true });
      }

      const customerId = invoice.customer as string;
      const { data: invoiceProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!invoiceProfile?.id) {
        console.error("[webhook] invoice.payment_succeeded: no profile for customer:", customerId, "event:", event.id);
        return NextResponse.json({ received: true });
      }

      const userId = invoiceProfile.id;
      const invoiceSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;

      // Idempotence strategy differs by billing reason:
      // - subscription_create: dedup by subscription ID (checkout.session.completed may have already awarded the credit)
      // - subscription_cycle: dedup by stripe_event_id (unique per renewal)
      let alreadyProcessed = false;

      if (billingReason === "subscription_create" && invoiceSubscriptionId) {
        const { data: existingSubCredit } = await supabase
          .from("events_log")
          .select("id")
          .eq("user_id", userId)
          .eq("event_type", "stripe_print_subscription_credit")
          .contains("metadata", { stripe_subscription_id: invoiceSubscriptionId })
          .maybeSingle();
        alreadyProcessed = !!existingSubCredit;
      } else {
        const { data: existingInvoice } = await supabase
          .from("events_log")
          .select("id")
          .eq("user_id", userId)
          .contains("metadata", { stripe_event_id: event.id })
          .maybeSingle();
        alreadyProcessed = !!existingInvoice;
      }

      if (alreadyProcessed) {
        console.log("[webhook] duplicate invoice.payment_succeeded, skipping:", event.id, "billing_reason:", billingReason);
        return NextResponse.json({ received: true });
      }

      const { error: creditError } = await supabase.rpc("increment_book_credits", { p_user_id: userId });

      if (creditError) {
        console.error("[webhook] increment_book_credits error:", creditError, "event:", event.id);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      // Store renewal date from invoice period end
      const renewalTs = invoice.lines?.data?.[0]?.period?.end ?? null;
      if (renewalTs) {
        await supabase.from("profiles").update({ subscription_renewal_date: renewalTs }).eq("id", userId);
      }

      await supabase.from("events_log").insert({
        user_id: userId,
        event_type: billingReason === "subscription_create" ? "stripe_print_subscription_credit" : "stripe_invoice_book_credit",
        metadata: {
          stripe_event_id: event.id,
          billing_reason: billingReason,
          customer_id: customerId,
          ...(invoiceSubscriptionId ? { stripe_subscription_id: invoiceSubscriptionId } : {}),
          source: "invoice",
        },
      });

      console.log("[webhook] book credit added via invoice for user:", userId, "billing_reason:", billingReason, "event:", event.id);
    }
  }

  return NextResponse.json({ received: true });
}

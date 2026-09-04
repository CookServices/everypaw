import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import Stripe from "stripe";
import { getServiceSupabase, priceIdToPlan } from "@/lib/plan";
import { buildPaymentFailedEmail } from "@/lib/auth-emails";
import { analyticsConfigured, recordPurchaseOnce } from "@/lib/analytics-server";

import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    log.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  log.debug("[webhook] event:", event.id, event.type);

  const supabase = getServiceSupabase();

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const metaPlan = session.metadata?.plan;

    if (!userId) {
      log.error("[webhook] No user_id in session metadata, event:", event.id);
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
        log.debug("[webhook] duplicate book_checkout, skipping:", event.id);
        return NextResponse.json({ received: true });
      }

      const { error } = await supabase.rpc("increment_book_credits", { p_user_id: userId });

      if (error) {
        log.error("book_credits increment error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      await supabase.from("events_log").insert({
        user_id: userId,
        event_type: "stripe_book_checkout",
        metadata: { stripe_event_id: event.id, stripe_session_id: session.id },
      });

      await recordPurchaseOnce(supabase, {
        userId,
        plan: "book_only",
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "eur",
        eventId: event.id,
        billingReason: "book_purchase",
      });

      log.debug("[webhook] book credit added for user:", userId, "event:", event.id);
      return NextResponse.json({ received: true });
    }

    // Subscription checkout, determine plan from line items
    if (session.mode === "subscription") {
      // Dedup: check if this subscription was already activated via stripe_customer_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_subscription_id, is_premium")
        .eq("id", userId)
        .single();

      if (profile?.stripe_subscription_id === session.subscription && profile?.is_premium) {
        log.debug("[webhook] duplicate checkout.session.completed, skipping:", event.id);
        return NextResponse.json({ received: true });
      }

      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });

      const priceId = fullSession.line_items?.data?.[0]?.price?.id;
      let plan = priceId ? priceIdToPlan(priceId) : null;

      // priceIdToPlan can return null if STRIPE_PRICE_ID_* env vars are misnamed
      // (see .env.local.example). Fall back to the plan captured in the checkout
      // metadata rather than silently defaulting a Print buyer to "digital".
      if (!plan) {
        log.error("[webhook] priceIdToPlan returned null for priceId:", priceId, "falling back to metadata plan:", metaPlan);
        plan = metaPlan === "print_annual" ? "print" : "digital";
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          plan,
          is_premium: true,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        })
        .eq("id", userId);

      if (error) {
        log.error("Supabase plan update error:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      // Book credits are awarded exclusively via invoice.payment_succeeded to avoid race conditions

      log.debug(`[webhook] user ${userId} upgraded to plan: ${plan}, event: ${event.id}`);
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
        payment_past_due: false,
      })
      .eq("stripe_customer_id", customerId);

    if (error) {
      log.error("Supabase downgrade error:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    log.debug("[webhook] subscription cancelled for customer:", customerId, "event:", event.id);
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

      log.debug("[webhook] subscription.updated → status=canceled, downgraded to free:", customerId, "event:", event.id);
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

      log.debug("[webhook] subscription.updated → plan change:", plan, "for customer:", customerId, "event:", event.id);
    }

    // cancel_at_period_end = true → scheduled cancellation, keep access until period end
    if (subscription.cancel_at_period_end) {
      log.debug(
        "[webhook] subscription.updated → cancel_at_period_end scheduled for customer:",
        customerId,
        "cancel_at:", subscription.cancel_at,
        "event:", event.id,
      );
      // is_premium stays true, customer.subscription.deleted handles the actual downgrade
    }
  }

  // ── invoice.payment_succeeded ─────────────────────────────────────────────
  // Awards 1 book credit to Print subscribers on first payment and renewals.
  // Single source of truth for Print book credits, checkout.session.completed no longer awards them.
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const billingReason = invoice.billing_reason;

    // Clear past-due flag on any successful payment, before the book-credit
    // gates below (Print-only price filter, 365-day guard) can return early
    const paidCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
    if (paidCustomerId) {
      await supabase
        .from("profiles")
        .update({ payment_past_due: false })
        .eq("stripe_customer_id", paidCustomerId)
        .eq("payment_past_due", true);
    }

    if (billingReason === "subscription_cycle" || billingReason === "subscription_create") {
      // Reported here, above the Print-only gate: a Digital invoice returns
      // early below and its revenue would otherwise never be counted. The whole
      // block is skipped when no destination is configured, so the money paths
      // below run exactly as they did before.
      if (analyticsConfigured()) {
        const analyticsCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
        const { data: buyerProfile } = analyticsCustomerId
          ? await supabase.from("profiles").select("id").eq("stripe_customer_id", analyticsCustomerId).single()
          : { data: null };

        if (buyerProfile?.id) {
          const paidPriceId = invoice.lines?.data?.[0]?.price?.id;
          await recordPurchaseOnce(supabase, {
            userId: buyerProfile.id,
            plan: (paidPriceId ? priceIdToPlan(paidPriceId) : null) ?? "unknown",
            amountCents: invoice.amount_paid ?? 0,
            currency: invoice.currency ?? "eur",
            eventId: event.id,
            billingReason,
          });
        } else {
          log.error("[webhook] analytics: no profile for customer:", analyticsCustomerId, "event:", event.id);
        }
      }

      const priceId = invoice.lines?.data?.[0]?.price?.id;
      const printPriceIds = [
        process.env.STRIPE_PRICE_PRINT_ANNUAL_EUR,
        process.env.STRIPE_PRICE_PRINT_ANNUAL_USD,
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
        log.error("[webhook] invoice.payment_succeeded: no profile for customer:", customerId, "event:", event.id);
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
        // Filtered by event_type on purpose: the analytics row written above
        // carries the same stripe_event_id, and without this filter it would
        // look like the credit had already been granted.
        const { data: existingInvoice } = await supabase
          .from("events_log")
          .select("id")
          .eq("user_id", userId)
          .eq("event_type", "stripe_invoice_book_credit")
          .contains("metadata", { stripe_event_id: event.id })
          .maybeSingle();
        alreadyProcessed = !!existingInvoice;
      }

      if (alreadyProcessed) {
        log.debug("[webhook] duplicate invoice.payment_succeeded, skipping:", event.id, "billing_reason:", billingReason);
        return NextResponse.json({ received: true });
      }

      // Annual cadence guard: max 1 book credit per 365 days regardless of subscription churn
      const { data: profileForCredit } = await supabase
        .from("profiles")
        .select("last_book_credit_at")
        .eq("id", userId)
        .single();

      if (profileForCredit?.last_book_credit_at) {
        // Tolerance below 365d: last_book_credit_at is stamped at webhook-processing
        // time, but the annual renewal fires ~365d later, landing a few seconds/hours
        // short of 365 and wrongly skipping the credit. 350d absorbs the drift while
        // still blocking any genuine sub-annual churn (monthly Print is not eligible).
        const daysSinceLast = (Date.now() - new Date(profileForCredit.last_book_credit_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < 350) {
          log.debug(`[webhook] book credit skipped, last credit was ${Math.floor(daysSinceLast)}d ago (< 350d), user: ${userId}`);
          return NextResponse.json({ received: true });
        }
      }

      const { error: creditError } = await supabase.rpc("increment_book_credits", { p_user_id: userId });

      if (creditError) {
        log.error("[webhook] increment_book_credits error:", creditError, "event:", event.id);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      // Store renewal date + last_book_credit_at
      const renewalTs = invoice.lines?.data?.[0]?.period?.end ?? null;
      await supabase.from("profiles").update({
        ...(renewalTs ? { subscription_renewal_date: renewalTs } : {}),
        last_book_credit_at: new Date().toISOString(),
      }).eq("id", userId);

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

      log.debug("[webhook] book credit added via invoice for user:", userId, "billing_reason:", billingReason, "event:", event.id);
    }
  }

  // ── invoice.payment_failed ────────────────────────────────────────────────
  // Sets payment_past_due flag + sends email. Does NOT downgrade, Stripe retries,
  // customer.subscription.deleted handles the final downgrade.
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    // Idempotence: skip if this exact event was already processed (Stripe redelivery)
    const { data: existingFailEvent } = await supabase
      .from("events_log")
      .select("id")
      .eq("event_type", "stripe_payment_failed")
      .contains("metadata", { stripe_event_id: event.id })
      .maybeSingle();

    if (existingFailEvent) {
      log.debug("[webhook] duplicate invoice.payment_failed, skipping:", event.id);
      return NextResponse.json({ received: true });
    }

    const { data: failedProfile } = await supabase
      .from("profiles")
      .update({ payment_past_due: true })
      .eq("stripe_customer_id", customerId)
      .select("id, email, language")
      .single();

    if (!failedProfile?.id) {
      log.error("[webhook] invoice.payment_failed: no profile for customer:", customerId, "event:", event.id);
      return NextResponse.json({ received: true });
    }

    const userId = failedProfile.id;
    const userEmail = failedProfile.email as string | undefined;

    // Log to events_log
    await supabase.from("events_log").insert({
      user_id: userId,
      event_type: "stripe_payment_failed",
      metadata: {
        stripe_event_id: event.id,
        customer_id: customerId,
        attempt_count: invoice.attempt_count ?? null,
      },
    });

    // Email only on the first failed attempt, Stripe retries on its own schedule,
    // one email per attempt would spam the user. Flag stays set until payment succeeds.
    const attemptCount = invoice.attempt_count ?? 1;
    if (userEmail && attemptCount <= 1) {
      try {
        const lang: "fr" | "en" =
          (failedProfile.language as string | undefined)?.startsWith("en")
            ? "en"
            : "fr";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${appUrl}/dashboard/settings`,
        });

        const { subject, html } = buildPaymentFailedEmail(lang, portalSession.url);
        const { error: emailError } = await sendEmail({
          from: "Everypaw <noreply@everypaw.app>",
          to: userEmail,
          subject,
          html,
        });

        if (emailError) {
          log.error("[webhook] invoice.payment_failed: email send error:", emailError, "event:", event.id);
        } else {
          log.debug("[webhook] payment failed email sent to:", userEmail, "attempt:", invoice.attempt_count, "event:", event.id);
        }
      } catch (emailErr) {
        log.error("[webhook] invoice.payment_failed: unexpected email error:", emailErr, "event:", event.id);
      }
    }

    log.debug("[webhook] payment_past_due set for user:", userId, "attempt:", invoice.attempt_count, "event:", event.id);
  }

  return NextResponse.json({ received: true });
}

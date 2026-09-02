import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/plan";
import { buildGiftEmailHtml, giftCopy, giftDeliveryDay } from "@/lib/gift-email";

export async function POST(req: Request) {
  const { sessionId } = await req.json();
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  if (session.metadata?.gift !== "true") {
    return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
  }

  // Idempotency: mark the payment intent after sending to prevent duplicate emails on repeated calls
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.metadata?.gift_email_sent === "true") {
    return NextResponse.json({ success: true });
  }

  const { recipient_email, recipient_name, sender_name, message, scheduled_date, locale, plan } = session.metadata!;

  const giftCouponId = process.env.STRIPE_GIFT_COUPON_ID;
  if (!giftCouponId) {
    log.error("[gift/complete] STRIPE_GIFT_COUPON_ID env var is not set");
    return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
  }

  const emailLocale: "fr" | "en" = locale === "fr" ? "fr" : "en";

  // A gift bought for a later date is stored rather than sent: the buyer picks
  // any date, often months out for a birthday or Christmas, and no provider
  // schedules that far. /api/cron/gift-deliveries sends it on the day.
  const deliverOn = giftDeliveryDay(scheduled_date);

  // The code is valid a year from the day the recipient receives it, not from
  // the day it was bought: a gift bought in June for December would otherwise
  // reach them with half its life already spent.
  const validityStart = deliverOn ? new Date(`${deliverOn}T00:00:00Z`).getTime() : Date.now();
  const expiresAt = Math.floor(validityStart / 1000) + 365 * 24 * 60 * 60;

  // Idempotent: same sessionId → same promo code from Stripe
  const promotionCode = await stripe.promotionCodes.create(
    {
      coupon: giftCouponId,
      max_redemptions: 1,
      expires_at: expiresAt,
      metadata: {
        recipient_email,
        recipient_name,
        sender_name,
        plan: (plan === "print" || plan === "print_annual") ? "print_annual" : "digital",
        checkout_session_id: sessionId,
      },
    },
    { idempotencyKey: `gift-complete-${sessionId}` },
  );

  const redeemUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redeem?code=${promotionCode.code}`;
  const c = giftCopy[emailLocale];

  if (deliverOn) {
    // Unique on checkout_session_id, so a replayed call updates the same row
    // instead of queuing the gift twice.
    const { error: queueError } = await getServiceSupabase()
      .from("gift_deliveries")
      .upsert(
        {
          checkout_session_id: sessionId,
          promo_code: promotionCode.code,
          recipient_email,
          sender_name: sender_name ?? "",
          message: message ?? "",
          locale: emailLocale,
          deliver_on: deliverOn,
        },
        { onConflict: "checkout_session_id" },
      );

    if (queueError) {
      log.error("[gift/complete] could not queue the scheduled gift:", queueError);
      return NextResponse.json({ error: "Could not schedule the gift" }, { status: 500 });
    }

    log.debug(`[gift/complete] gift ${promotionCode.code} queued for ${deliverOn}`);
    return NextResponse.json({ success: true, code: promotionCode.code, scheduledFor: deliverOn });
  }

  const emailPayload: Parameters<typeof sendEmail>[0] = {
    from: "Everypaw <hello@everypaw.app>",
    to: recipient_email,
    subject: c.subject(),
    html: buildGiftEmailHtml({
      locale: emailLocale,
      senderName: sender_name,
      message: message ?? "",
      code: promotionCode.code,
      redeemUrl,
    }),
  };

  // Claim the send with a fresh read + immediate flag write BEFORE the slow
  // Resend call, so concurrent/duplicate invocations skip instead of re-sending.
  if (pi?.id) {
    const fresh = await stripe.paymentIntents.retrieve(pi.id);
    if (fresh.metadata?.gift_email_sent === "true") {
      return NextResponse.json({ success: true, code: promotionCode.code });
    }
    await stripe.paymentIntents.update(pi.id, {
      metadata: { ...fresh.metadata, gift_email_sent: "true" },
    });
  }

  try {
    await sendEmail(emailPayload);
  } catch (err) {
    // Release the claim so a retry can resend after a genuine send failure.
    if (pi?.id) {
      await stripe.paymentIntents.update(pi.id, {
        metadata: { ...pi.metadata, gift_email_sent: "" },
      });
    }
    throw err;
  }

  return NextResponse.json({ success: true, code: promotionCode.code });
}

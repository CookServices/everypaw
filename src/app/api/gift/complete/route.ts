import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { stripe } from "@/lib/stripe";
import { escapeHtml } from "@/lib/html";
import { baseLayout, emoji, heading, paragraph, quote, codeBox, ctaButton, finePrint } from "@/lib/email-templates";

const copy = {
  fr: {
    subject: () => `🎁 Vous avez reçu un cadeau Everypaw !`,
    heading: "Vous avez reçu un cadeau !",
    body: (sender: string) =>
      `<strong>${sender}</strong> vous offre 12 mois d'Everypaw Premium, le journal IA qui transforme les moments du quotidien de votre animal en un beau livre imprimé.`,
    codeLabel: "Votre code cadeau :",
    cta: "Activer mon cadeau",
    footer: "Code valable 12 mois · Usage unique. Aucune carte bancaire requise pour l'activer.",
  },
  en: {
    subject: () => `🎁 You've received an Everypaw gift!`,
    heading: "You've received a gift!",
    body: (sender: string) =>
      `<strong>${sender}</strong> gifted you 12 months of Everypaw Premium, the AI journal that turns your pet's daily moments into a beautiful printed book.`,
    codeLabel: "Your gift code:",
    cta: "Activate my gift",
    footer: "Code valid for 12 months · Single use. No credit card required to redeem.",
  },
};

function buildEmailHtml({
  locale,
  senderName,
  message,
  code,
  redeemUrl,
}: {
  locale: "fr" | "en";
  senderName: string;
  message: string;
  code: string;
  redeemUrl: string;
}): string {
  const c = copy[locale] ?? copy.en;
  return baseLayout(
    emoji("🎁") +
    heading(c.heading) +
    paragraph(c.body(escapeHtml(senderName))) +
    (message ? quote(`"${escapeHtml(message)}"`) : "") +
    paragraph(c.codeLabel) +
    codeBox(code) +
    ctaButton(redeemUrl, c.cta) +
    finePrint(c.footer),
    "",
    locale,
  );
}

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
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const redeemUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redeem?code=${promotionCode.code}`;
  const c = copy[emailLocale];

  const emailPayload: Parameters<typeof resend.emails.send>[0] = {
    from: "Everypaw <hello@everypaw.app>",
    to: recipient_email,
    subject: c.subject(),
    html: buildEmailHtml({
      locale: emailLocale,
      senderName: sender_name,
      message: message ?? "",
      code: promotionCode.code,
      redeemUrl,
    }),
    ...(scheduled_date ? { scheduledAt: new Date(scheduled_date + "T08:00:00Z").toISOString() } : {}),
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
    await resend.emails.send(emailPayload);
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

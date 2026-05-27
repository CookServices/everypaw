import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/html";

const copy = {
  fr: {
    subject: (_sender: string) => `🎁 Vous avez reçu un cadeau Everypaw !`,
    heading: "Vous avez reçu un cadeau !",
    body: (sender: string) =>
      `<strong>${sender}</strong> vous offre 12 mois d'Everypaw Premium , le journal IA qui transforme les moments du quotidien de votre animal en un beau livre imprimé.`,
    codeLabel: "Votre code cadeau :",
    cta: "Activer mon cadeau →",
    footer: "Ce cadeau vous donne 12 mois d'Everypaw Premium gratuitement. Aucune carte bancaire requise pour l'activer.",
  },
  en: {
    subject: (_sender: string) => `🎁 You've received an Everypaw gift!`,
    heading: "You've received a gift!",
    body: (sender: string) =>
      `<strong>${sender}</strong> gifted you 12 months of Everypaw Premium , the AI journal that turns your pet's daily moments into a beautiful printed book.`,
    codeLabel: "Your gift code:",
    cta: "Activate my gift →",
    footer: "This gift gives you 12 months of Everypaw Premium for free. No credit card required to redeem.",
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
  return `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
      <p style="font-size: 28px; margin: 0 0 8px;">🎁</p>
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">${c.heading}</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 16px;">
        ${c.body(escapeHtml(senderName))}
      </p>
      ${message ? `
      <div style="background: #F7F2EA; border-left: 3px solid #C8813A; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
        <p style="font-size: 15px; font-style: italic; color: #3D2B1F; margin: 0;">"${escapeHtml(message)}"</p>
      </div>
      ` : ""}
      <p style="font-size: 15px; color: #7A5C44; margin: 0 0 8px;">${c.codeLabel}</p>
      <div style="background: #3D2B1F; color: #F7C27A; font-family: monospace; font-size: 1.5rem; padding: 16px 24px; border-radius: 12px; text-align: center; letter-spacing: .15em; margin: 0 0 24px;">${code}</div>
      <a href="${redeemUrl}" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 14px 28px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 15px; font-weight: 500;">${c.cta}</a>
      <p style="font-size: 12px; color: #7A5C44; margin-top: 32px; font-family: sans-serif;">${c.footer}</p>
    </div>
  `;
}

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`gift:${getClientIp(req)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { recipientEmail, recipientName, senderName, message, scheduledDate, locale, plan } = body;

  if (!recipientEmail || !recipientName || !senderName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
  }
  if (typeof senderName !== "string" || senderName.length > 100) {
    return NextResponse.json({ error: "Invalid sender name" }, { status: 400 });
  }
  if (typeof recipientName !== "string" || recipientName.length > 100) {
    return NextResponse.json({ error: "Invalid recipient name" }, { status: 400 });
  }
  if (message !== undefined && (typeof message !== "string" || message.length > 500)) {
    return NextResponse.json({ error: "Message too long (max 500 chars)" }, { status: 400 });
  }

  if (scheduledDate) {
    if (typeof scheduledDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      return NextResponse.json({ error: "Invalid scheduledDate format (expected YYYY-MM-DD)" }, { status: 400 });
    }
    const sendAt = new Date(scheduledDate + "T08:00:00Z");
    if (isNaN(sendAt.getTime()) || sendAt <= new Date()) {
      return NextResponse.json({ error: "Scheduled date must be a valid future date" }, { status: 400 });
    }
  }

  const emailLocale: "fr" | "en" = locale === "fr" ? "fr" : "en";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const giftCouponId = process.env.STRIPE_GIFT_COUPON_ID;
  if (!giftCouponId) {
    console.error("[gift/create] STRIPE_GIFT_COUPON_ID env var is not set");
    return NextResponse.json({ error: "Gift service not configured" }, { status: 500 });
  }

  try {
    const promotionCode = await stripe.promotionCodes.create({
      coupon: giftCouponId,
      max_redemptions: 1,
      metadata: {
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        sender_name: senderName,
        plan: plan === "print" ? "print" : "digital",
      },
    });

    const redeemUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redeem?code=${promotionCode.code}`;
    const c = copy[emailLocale];

    const emailPayload: Parameters<typeof resend.emails.send>[0] = {
      from: "Everypaw <hello@everypaw.app>",
      to: recipientEmail,
      reply_to: user.email ?? undefined,
      subject: c.subject(senderName),
      html: buildEmailHtml({
        locale: emailLocale,
        senderName,
        message: message ?? "",
        code: promotionCode.code,
        redeemUrl,
      }),
      ...(scheduledDate ? { scheduledAt: new Date(scheduledDate + "T08:00:00Z").toISOString() } : {}),
    };

    await resend.emails.send(emailPayload);

    return NextResponse.json({ success: true, code: promotionCode.code });
  } catch (error) {
    console.error("Gift creation error:", error);
    return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
  }
}

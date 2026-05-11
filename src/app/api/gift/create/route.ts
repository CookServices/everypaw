import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

export async function POST(req: Request) {
  const { recipientEmail, recipientName, senderName, message } = await req.json();

  if (!recipientEmail || !recipientName || !senderName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const promotionCode = await stripe.promotionCodes.create({
      coupon: process.env.STRIPE_GIFT_COUPON_ID!,
      max_redemptions: 1,
      metadata: {
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        sender_name: senderName,
      },
    });

    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: recipientEmail,
      subject: `${senderName} offered you an Everypaw subscription 🐾`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
          <p style="font-size: 28px; margin: 0 0 8px;">🎁</p>
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You've received a gift!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 16px;">
            <strong>${senderName}</strong> offered you 12 months of Everypaw Premium — the AI journal that turns your pet's daily moments into a beautiful printed book.
          </p>
          ${message ? `
          <div style="background: #F7F2EA; border-left: 3px solid #C8813A; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
            <p style="font-size: 15px; font-style: italic; color: #3D2B1F; margin: 0;">"${message}"</p>
          </div>
          ` : ""}
          <p style="font-size: 15px; color: #7A5C44; margin: 0 0 8px;">Your gift code:</p>
          <div style="background: #3D2B1F; color: #F7C27A; font-family: monospace; font-size: 1.5rem; padding: 16px 24px; border-radius: 12px; text-align: center; letter-spacing: .15em; margin: 0 0 24px;">${promotionCode.code}</div>
          <a href="https://everypaw.app/redeem?code=${promotionCode.code}" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 14px 28px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 15px; font-weight: 500;">Activate my gift →</a>
          <p style="font-size: 12px; color: #7A5C44; margin-top: 32px; font-family: sans-serif;">This gift gives you 12 months of Everypaw Premium for free. No credit card required to redeem.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, code: promotionCode.code });
  } catch (error) {
    console.error("Gift creation error:", error);
    return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
  }
}

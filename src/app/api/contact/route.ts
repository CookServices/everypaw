import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/html";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SUBJECT_ROUTING: Record<string, string> = {
  "Question générale":           "hello@everypaw.app",
  "Problème technique":          "hello@everypaw.app",
  "Commande & livraison":        "orders@everypaw.app",
  "Facturation & abonnement":    "hello@everypaw.app",
  "Autre":                       "hello@everypaw.app",
};

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`contact:${getClientIp(req)}`, 3, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: { subject?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, email, message } = body;

  // Server-side validation
  if (!subject || !SUBJECT_ROUTING[subject]) {
    return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!message || message.trim().length < 20) {
    return NextResponse.json({ error: "Message too short" }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
  }

  const to = SUBJECT_ROUTING[subject];
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "Everypaw Contact <noreply@everypaw.app>",
      to,
      reply_to: email,
      subject: `[Contact] ${escapeHtml(subject!)}`,
      html: `
        <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="font-family: Georgia, serif; color: #3D2B1F; margin-bottom: 8px;">[Contact] ${escapeHtml(subject!)}</h2>
          <p style="color: #7A5C44; font-size: 14px; margin-bottom: 24px;">
            De : <strong>${escapeHtml(email!)}</strong>
          </p>
          <div style="background: #F7F2EA; border-radius: 12px; padding: 20px; color: #3D2B1F; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">
            ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid rgba(61,43,31,.1);" />
          <p style="color: #9A8070; font-size: 12px; margin: 0;">
            Message envoyé depuis le formulaire de contact Everypaw
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("[contact] Resend error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}

import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { baseLayout, heroSection, paragraph, quote, divider, colorSection, ctaButton, BRAND } from "@/lib/email-templates";

const SUBJECT_ROUTING: Record<string, string> = {
  "Question générale":           "hello@everypaw.app",
  "Problème technique":          "hello@everypaw.app",
  "Commande & livraison":        "orders@everypaw.app",
  "Facturation & abonnement":    "hello@everypaw.app",
  "Autre":                       "hello@everypaw.app",
};

export async function POST(req: Request) {
  const { allowed } = await checkRateLimitDb(`contact:${getClientIp(req)}`, 3, 60_000);
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

  try {
    await sendEmail({
      from: "Everypaw Contact <noreply@everypaw.app>",
      to,
      replyTo: email,
      subject: `[Contact] ${escapeHtml(subject!)}`,
      html: baseLayout(
        heroSection("💬", escapeHtml(subject!)) +
        paragraph(`<strong>From:</strong> ${escapeHtml(email!)}`) +
        quote(`"${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}"`) +
        divider() +
        colorSection(
          `<strong>Direct reply:</strong> ${escapeHtml(email!)}`,
          BRAND.accent,
          "#FDFAF5"
        ),
        "",
        "fr"
      ),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("[contact] Resend error:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}

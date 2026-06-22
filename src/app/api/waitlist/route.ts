import { log } from "@/lib/log";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/html";
import { baseLayout, emoji, heading, paragraph } from "@/lib/email-templates";

export async function POST(req: Request) {
  const { allowed } = await checkRateLimitDb(`waitlist:${getClientIp(req)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    // 1. Confirmation email to the user
    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: email,
      subject: "You're on the list 🐾",
      html: baseLayout(
        emoji("🐾") +
        heading("You're on the Everypaw waitlist.") +
        paragraph("We're building something special, an AI journal that turns your pet's daily moments into a beautiful printed book.") +
        paragraph(`As one of our first members, you'll get <strong style="color:#C8813A;">50% off</strong> when we launch. We'll be in touch soon.`) +
        paragraph("The Everypaw team"),
        "",
        "en",
      ),
    });

    // 2. Internal notification (optional, only if env var is set)
    const notifTo = process.env.WAITLIST_TO_EMAIL;
    if (notifTo) {
      await resend.emails.send({
        from: "Everypaw Waitlist <hello@everypaw.app>",
        to: notifTo,
        subject: `New waitlist signup: ${email}`,
        html: `<p>New signup: <strong>${escapeHtml(email)}</strong></p>`,
      });
    } else {
      log.warn("[waitlist] WAITLIST_TO_EMAIL not set, skipping internal notification");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}

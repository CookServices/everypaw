import { log } from "@/lib/log";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml } from "@/lib/html";
import { baseLayout, heroSection, paragraph, quote, divider, colorSection, BRAND } from "@/lib/email-templates";

export async function POST(req: Request) {
  const { allowed } = await checkRateLimitDb(`suggestion:${getClientIp(req)}`, 3, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { message } = await req.json();

  if (!message || typeof message !== "string" || message.trim().length < 3) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  let userEmail = "unknown";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) userEmail = user.email;
  } catch {
    // non-blocking
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error: resendError } = await resend.emails.send({
      from: "Everypaw <noreply@everypaw.app>",
      to: "julien.mauduit@gmail.com",
      reply_to: userEmail !== "unknown" ? userEmail : undefined,
      subject: "💡 Nouvelle suggestion Everypaw",
      html: baseLayout(
        heroSection("💡", "Nouvelle suggestion Everypaw") +
        paragraph(`<strong>From:</strong> ${escapeHtml(userEmail)}`) +
        quote(`"${escapeHtml(message)}"`) +
        divider() +
        (userEmail !== "unknown" ? colorSection(
          `<strong>Reply directly:</strong> <a href="mailto:${escapeHtml(userEmail)}" style="color:#FDFAF5;text-decoration:underline;">${escapeHtml(userEmail)}</a>`,
          BRAND.accent,
          "#FDFAF5"
        ) : ""),
        "",
        "fr"
      ),
    });
    if (resendError) {
      log.error("[suggestion] Resend error:", resendError);
      return NextResponse.json({ error: "Failed to send suggestion" }, { status: 500 });
    }
  } catch (err) {
    log.error("[suggestion] Unexpected error:", err);
    return NextResponse.json({ error: "Failed to send suggestion" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { allowed } = checkRateLimit(`suggestion:${getClientIp(req)}`, 3, 60_000);
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
      to: "hello@everypaw.app",
      reply_to: userEmail !== "unknown" ? userEmail : undefined,
      subject: "💡 Nouvelle suggestion Everypaw",
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
          <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
          <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px;">Nouvelle suggestion Everypaw</h1>
          <p style="font-size: 13px; color: #9A8070; margin: 0 0 20px;">De : <strong>${userEmail}</strong></p>
          <div style="background: #FAF6EF; border-left: 3px solid #C8813A; padding: 16px 20px; border-radius: 8px; font-size: 15px; line-height: 1.7; color: #3D2B1F; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          ${userEmail !== "unknown" ? `<p style="font-size: 13px; color: #9A8070; margin: 20px 0 0;">Répondre directement à : <a href="mailto:${userEmail}" style="color: #C8813A;">${userEmail}</a></p>` : ""}
        </div>
      `,
    });
    if (resendError) {
      console.error("[suggestion] Resend error:", resendError);
      return NextResponse.json({ error: "Failed to send suggestion" }, { status: 500 });
    }
  } catch (err) {
    console.error("[suggestion] Unexpected error:", err);
    return NextResponse.json({ error: "Failed to send suggestion" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildConfirmSignupEmail } from "@/lib/auth-emails";
import { getProfileLocale } from "@/lib/locale";
import { verifyBearer, validateRedirectTo } from "@/lib/auth";

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!verifyBearer(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; data?: { token_hash?: string; redirect_to?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = body.email;
  const tokenHash = body.data?.token_hash;
  const redirectTo = validateRedirectTo(
    body.data?.redirect_to,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  );

  if (!email || !tokenHash) {
    return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
  }

  const confirmUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token_hash=${tokenHash}&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`;

  const lang = await getProfileLocale(email);

  const { subject, html } = buildConfirmSignupEmail(lang, confirmUrl);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({ from: "Everypaw <noreply@everypaw.app>", to: email, subject, html });
    if (error) {
      log.error("[emails/confirm-signup] Resend error:", error);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  } catch (err) {
    log.error("[emails/confirm-signup] Unexpected error:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({});
}

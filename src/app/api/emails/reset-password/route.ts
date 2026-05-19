import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { buildResetPasswordEmail } from "@/lib/auth-emails";

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: { email?: string; data?: { token_hash?: string; redirect_to?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = body.email;
  const tokenHash = body.data?.token_hash;
  const redirectTo = body.data?.redirect_to ?? `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`;

  if (!email || !tokenHash) {
    return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token_hash=${tokenHash}&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`;

  let lang: "fr" | "en" = "fr";
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("locale, language").eq("email", email).single();
    if (profile?.locale?.startsWith("en") || profile?.language?.startsWith("en")) lang = "en";
  } catch {}

  const { subject, html } = buildResetPasswordEmail(lang, resetUrl);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({ from: "Everypaw <noreply@everypaw.app>", to: email, subject, html });
    if (error) {
      console.error("[emails/reset-password] Resend error:", error);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("[emails/reset-password] Unexpected error:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({});
}

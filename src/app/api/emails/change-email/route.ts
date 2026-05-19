import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { buildChangeEmailEmail } from "@/lib/auth-emails";

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: { email?: string; data?: { token_hash_new?: string; token_hash?: string; redirect_to?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const newEmail = body.email;
  const tokenHash = body.data?.token_hash_new ?? body.data?.token_hash;
  const redirectTo = body.data?.redirect_to ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

  if (!newEmail || !tokenHash) {
    return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
  }

  const confirmUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token_hash=${tokenHash}&type=email_change&redirect_to=${encodeURIComponent(redirectTo)}`;

  let lang: "fr" | "en" = "fr";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("locale, language").eq("id", user.id).single();
      if (profile?.locale?.startsWith("en") || profile?.language?.startsWith("en")) lang = "en";
    }
  } catch {}

  const { subject, html } = buildChangeEmailEmail(lang, confirmUrl, newEmail);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({ from: "Everypaw <noreply@everypaw.app>", to: newEmail, subject, html });
    if (error) {
      console.error("[emails/change-email] Resend error:", error);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("[emails/change-email] Unexpected error:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({});
}

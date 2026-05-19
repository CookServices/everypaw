import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import {
  buildConfirmSignupEmail,
  buildResetPasswordEmail,
  buildChangeEmailEmail,
} from "@/lib/auth-emails";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(req: Request) {
  // Verify Supabase hook secret
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    user?: { email?: string; new_email?: string };
    email?: string;
    email_data?: {
      email_action_type?: string;
      token_hash?: string;
      token_hash_new?: string;
      token?: string;
      redirect_to?: string;
      new_email?: string;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log("[auth-hook] payload:", JSON.stringify(body).slice(0, 400));

  const actionType = body.email_data?.email_action_type;
  const email = body.user?.email ?? body.email ?? "";
  const tokenHash = body.email_data?.token_hash ?? "";
  const tokenHashNew = body.email_data?.token_hash_new ?? tokenHash;
  const redirectTo = body.email_data?.redirect_to;

  if (!email) {
    console.error("[auth-hook] Missing email in payload");
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  if (!actionType) {
    console.error("[auth-hook] Missing email_action_type in payload");
    return NextResponse.json({ error: "Missing email_action_type" }, { status: 400 });
  }

  // Detect language from profile
  let lang: "fr" | "en" = "fr";
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("locale, language")
      .eq("email", email)
      .single();
    if (profile?.locale?.startsWith("en") || profile?.language?.startsWith("en")) lang = "en";
  } catch {}

  const resend = new Resend(process.env.RESEND_API_KEY);
  let subject: string;
  let html: string;
  let toEmail = email;

  if (actionType === "signup") {
    const confirmUrl = `${SUPABASE_URL}/auth/v1/verify?token_hash=${tokenHash}&type=signup&redirect_to=${encodeURIComponent(redirectTo ?? `${APP_URL}/dashboard`)}`;
    ({ subject, html } = buildConfirmSignupEmail(lang, confirmUrl));

  } else if (actionType === "recovery") {
    const resetUrl = `${SUPABASE_URL}/auth/v1/verify?token_hash=${tokenHash}&type=recovery&redirect_to=${encodeURIComponent(redirectTo ?? `${APP_URL}/auth/update-password`)}`;
    ({ subject, html } = buildResetPasswordEmail(lang, resetUrl));

  } else if (actionType === "email_change") {
    const newEmail = body.user?.new_email ?? body.email_data?.new_email ?? email;
    toEmail = newEmail;
    const confirmUrl = `${SUPABASE_URL}/auth/v1/verify?token_hash=${tokenHashNew}&type=email_change&redirect_to=${encodeURIComponent(redirectTo ?? `${APP_URL}/dashboard`)}`;
    ({ subject, html } = buildChangeEmailEmail(lang, confirmUrl, newEmail));

  } else {
    console.warn("[auth-hook] Unknown email_action_type:", actionType);
    return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 });
  }

  console.log("[auth-hook] Sending email type:", actionType, "to:", toEmail, "lang:", lang);

  try {
    const { error } = await resend.emails.send({
      from: "Everypaw <noreply@everypaw.app>",
      to: toEmail,
      subject,
      html,
    });
    if (error) {
      console.error("[auth-hook] Resend error:", error);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("[auth-hook] Unexpected error:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  console.log("[auth-hook] Email sent successfully for action:", actionType);
  return NextResponse.json({});
}

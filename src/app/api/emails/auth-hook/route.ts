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
      token?: string;
      token_hash?: string;
      token_hash_new?: string;
      token_new?: string;
      redirect_to?: string;
      new_email?: string;
      confirmation_url?: string;
      [key: string]: unknown;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Log payload complet pour diagnostiquer les champs disponibles
  console.log("[auth-hook] FULL payload:", JSON.stringify(body, null, 2));

  const actionType = body.email_data?.email_action_type;
  const email = body.user?.email ?? body.email ?? "";
  const tokenHash = body.email_data?.token_hash ?? "";
  const tokenHashNew = body.email_data?.token_hash_new ?? tokenHash;
  const token = body.email_data?.token ?? tokenHash;
  const confirmationUrl = body.email_data?.confirmation_url;
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

  // Build the action URL: use confirmation_url if Supabase provides it,
  // otherwise construct with token_hash + action type.
  const buildUrl = (type: string, fallbackRedirect: string) =>
    confirmationUrl
    ?? `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(redirectTo ?? fallbackRedirect)}`;

  if (actionType === "signup") {
    const url = buildUrl("signup", `${APP_URL}/dashboard`);
    console.log("[auth-hook] signup url:", url);
    ({ subject, html } = buildConfirmSignupEmail(lang, url));

  } else if (actionType === "recovery") {
    const url = buildUrl("recovery", `${APP_URL}/auth/update-password`);
    console.log("[auth-hook] recovery url:", url);
    ({ subject, html } = buildResetPasswordEmail(lang, url));

  } else if (actionType === "email_change") {
    const newEmail = body.user?.new_email ?? body.email_data?.new_email ?? email;
    toEmail = newEmail;
    // email_change uses token_hash_new for the new address confirmation
    const changeUrl = confirmationUrl
      ?? `${SUPABASE_URL}/auth/v1/verify?token=${tokenHashNew || tokenHash}&type=email_change&redirect_to=${encodeURIComponent(redirectTo ?? `${APP_URL}/dashboard`)}`;
    console.log("[auth-hook] email_change url:", changeUrl);
    ({ subject, html } = buildChangeEmailEmail(lang, changeUrl, newEmail));

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

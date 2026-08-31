import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";
import { getProfileLocale } from "@/lib/locale";
import { isSafeRelativePath } from "@/lib/validation";
import {
  buildConfirmSignupEmail,
  buildResetPasswordEmail,
  buildChangeEmailEmail,
} from "@/lib/auth-emails";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(req: Request) {
  // Verify Supabase hook HMAC signature, fail-closed (no secret = reject all)
  const secret = (process.env.SUPABASE_HOOK_SECRET ?? "").trim();
  if (!secret) {
    log.error("[auth-hook] SUPABASE_HOOK_SECRET is not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();

  // ── Standard Webhooks signature verification ──────────────────────────────
  // Supabase Auth Hooks follow the Standard Webhooks spec:
  //   - Headers: webhook-id, webhook-timestamp, webhook-signature
  //   - Signed content: "<webhook-id>.<webhook-timestamp>.<raw-body>"
  //   - Secret format: "v1,whsec_<base64>", strip prefix, then base64-decode to get HMAC key
  //   - Algorithm: HMAC-SHA256, output base64-encoded, prefixed with "v1,"
  //   - Ref: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
  const webhookId        = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const webhookSignature = req.headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    log.error("[auth-hook] Missing Standard Webhooks headers");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  // Strip known Supabase prefixes ("v1,whsec_", "v1,", "whsec_") to get the raw base64 key
  const secretB64 = secret.replace(/^v1,whsec_/, "").replace(/^v1,/, "").replace(/^whsec_/, "");
  const secretBytes = Buffer.from(secretB64, "base64");
  const expectedSig = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // Header may contain multiple space-separated signatures (key rotation support)
  const providedSigs = webhookSignature.split(" ").map(s => s.startsWith("v1,") ? s.slice(3) : s);
  const valid = providedSigs.some(sig => {
    try {
      const sigBuf = Buffer.from(sig, "base64");
      const expBuf = Buffer.from(expectedSig, "base64");
      return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  });

  if (!valid) {
    log.error("[auth-hook] Signature mismatch, check SUPABASE_HOOK_SECRET in Vercel.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const actionType = body.email_data?.email_action_type;
  const email = body.user?.email ?? body.email ?? "";
  const tokenHash = body.email_data?.token_hash ?? "";
  const tokenHashNew = body.email_data?.token_hash_new ?? tokenHash;
  const rawConfirmationUrl = body.email_data?.confirmation_url;
  const redirectTo = body.email_data?.redirect_to;

  // Validate confirmation_url is from our Supabase instance (prevent open redirect injection)
  let confirmationUrl: string | undefined;
  if (rawConfirmationUrl) {
    try {
      const parsed = new URL(rawConfirmationUrl);
      const supabaseHost = new URL(SUPABASE_URL).hostname;
      if (parsed.hostname !== supabaseHost || parsed.protocol !== "https:") {
        log.error("[auth-hook] Invalid confirmation_url domain:", rawConfirmationUrl);
        return NextResponse.json({ error: "Invalid confirmation URL" }, { status: 400 });
      }
      confirmationUrl = rawConfirmationUrl;
    } catch {
      log.error("[auth-hook] Malformed confirmation_url:", rawConfirmationUrl);
      return NextResponse.json({ error: "Invalid confirmation URL" }, { status: 400 });
    }
  }

  if (!email) {
    log.error("[auth-hook] Missing email in payload");
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  if (!actionType) {
    log.error("[auth-hook] Missing email_action_type in payload");
    return NextResponse.json({ error: "Missing email_action_type" }, { status: 400 });
  }

  const lang = await getProfileLocale(email);

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
    // Signup confirmation never uses Supabase's own confirmation_url: that link
    // is PKCE-based (token=pkce_...) and requires the code_verifier stored in
    // the browser that started the signup. Opened from another device or an
    // email app's webview, that verifier is missing and the exchange fails
    // silently. Instead we build our own link to /auth/confirm, which verifies
    // token_hash server-side (verifyOtp) — no browser state required.
    if (!tokenHash) {
      log.error("[auth-hook] Missing token_hash for signup, cannot build confirm link");
      return NextResponse.json({ error: "Missing token_hash" }, { status: 400 });
    }
    let signupNext = "/dashboard";
    if (redirectTo) {
      try {
        const n = new URL(redirectTo).searchParams.get("next");
        if (isSafeRelativePath(n)) signupNext = n;
      } catch {}
    }
    const url = `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=${encodeURIComponent(signupNext)}`;
    log.debug("[auth-hook] signup url:", url);
    ({ subject, html } = buildConfirmSignupEmail(lang, url));

  } else if (actionType === "recovery") {
    const url = buildUrl("recovery", `${APP_URL}/auth/update-password`);
    log.debug("[auth-hook] recovery url:", url);
    ({ subject, html } = buildResetPasswordEmail(lang, url));

  } else if (actionType === "email_change") {
    const newEmail = body.user?.new_email ?? body.email_data?.new_email ?? email;
    toEmail = newEmail;
    // email_change uses token_hash_new for the new address confirmation
    const changeUrl = confirmationUrl
      ?? `${SUPABASE_URL}/auth/v1/verify?token=${tokenHashNew}&type=email_change&redirect_to=${encodeURIComponent(redirectTo ?? `${APP_URL}/dashboard`)}`;
    log.debug("[auth-hook] email_change url:", changeUrl);
    ({ subject, html } = buildChangeEmailEmail(lang, changeUrl, newEmail));

  } else {
    log.warn("[auth-hook] Unknown email_action_type:", actionType);
    return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 });
  }

  log.debug("[auth-hook] Sending email type:", actionType, "to:", toEmail, "lang:", lang);

  try {
    const { error } = await resend.emails.send({
      from: "Everypaw <noreply@everypaw.app>",
      to: toEmail,
      subject,
      html,
    });
    if (error) {
      log.error("[auth-hook] Resend error:", error);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  } catch (err) {
    log.error("[auth-hook] Unexpected error:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  log.debug("[auth-hook] Email sent successfully for action:", actionType);
  return NextResponse.json({});
}

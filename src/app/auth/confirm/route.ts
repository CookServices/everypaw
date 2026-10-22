import { createClient } from "@/lib/supabase/server";
import { isSafeRelativePath } from "@/lib/validation";
import { log } from "@/lib/log";
import { resolveAcceptLanguage, resolveLocale } from "@/lib/resolve-locale";
import { NextResponse } from "next/server";

const SUPPORTED_TYPES = ["signup", "recovery", "email_change"] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

function isSupportedType(value: string | null): value is SupportedType {
  return value === "signup" || value === "recovery" || value === "email_change";
}

// Server-side signup/recovery/email_change confirmation via verifyOtp(token_hash).
// Unlike the PKCE code exchange in /auth/callback, this does not depend on any
// state stored in the browser that made the original request, so it works from
// any device.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (!tokenHash || !isSupportedType(type)) {
    log.error("[auth/confirm] Missing or unsupported params", { hasTokenHash: !!tokenHash, type });
    return NextResponse.redirect(`${origin}/auth/login?auth_error=confirm_failed`);
  }

  const failureRedirect = type === "recovery"
    ? `${origin}/auth/update-password?auth_error=confirm_failed`
    : type === "email_change"
    ? `${origin}/dashboard/settings?auth_error=confirm_failed`
    : `${origin}/auth/login?auth_error=confirm_failed`;
  const defaultDestination = type === "recovery"
    ? "/auth/update-password"
    : type === "email_change"
    ? "/dashboard/settings"
    : "/dashboard";
  const destination = isSafeRelativePath(next) ? next : defaultDestination;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    log.error("[auth/confirm] verifyOtp failed", {
      type,
      message: error.message,
      status: (error as { status?: number }).status,
    });
    return NextResponse.redirect(failureRedirect);
  }

  // Persist the user's language onto the profile once, so localized emails
  // and chapters target the right language: the one chosen on the signup
  // page (user_metadata), else the browser's.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const metaLanguage = user.user_metadata?.language;
    const language = metaLanguage
      ? resolveLocale(metaLanguage)
      : resolveAcceptLanguage(request.headers.get("accept-language"));
    await supabase.from("profiles").update({ language }).eq("id", user.id).is("language", null);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}

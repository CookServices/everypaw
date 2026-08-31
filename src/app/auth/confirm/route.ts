import { createClient } from "@/lib/supabase/server";
import { isSafeRelativePath } from "@/lib/validation";
import { log } from "@/lib/log";
import { NextResponse } from "next/server";

// Server-side signup confirmation via verifyOtp(token_hash). Unlike the PKCE
// code exchange in /auth/callback, this does not depend on any state stored
// in the browser that requested the signup, so it works from any device.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const destination = isSafeRelativePath(next) ? next : "/dashboard";

  if (!tokenHash || type !== "signup") {
    log.error("[auth/confirm] Missing or unsupported params", { hasTokenHash: !!tokenHash, type });
    return NextResponse.redirect(`${origin}/auth/login?auth_error=confirm_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });

  if (error) {
    log.error("[auth/confirm] verifyOtp failed", {
      message: error.message,
      status: (error as { status?: number }).status,
    });
    return NextResponse.redirect(`${origin}/auth/login?auth_error=confirm_failed`);
  }

  // Persist the signup language (from user_metadata) onto the profile once,
  // so localized emails can target the right language.
  const { data: { user } } = await supabase.auth.getUser();
  const lang = user?.user_metadata?.language;
  if (user && (lang === "fr" || lang === "en")) {
    await supabase.from("profiles").update({ language: lang }).eq("id", user.id).is("language", null);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}

import { createClient } from "@/lib/supabase/server";
import { isSafeRelativePath } from "@/lib/validation";
import { log } from "@/lib/log";
import { resolveAcceptLanguage, resolveLocale } from "@/lib/resolve-locale";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      log.error("[auth/callback] exchangeCodeForSession failed", {
        message: error.message,
        status: (error as { status?: number }).status,
      });
      return NextResponse.redirect(`${origin}/auth/login?auth_error=exchange_failed`);
    }

    // Persist the user's language onto the profile once, so localized emails
    // and chapters target the right language: the one chosen on the signup
    // page (user_metadata), else the browser's, since Google sign-ins carry none.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const metaLanguage = user.user_metadata?.language;
      const language = metaLanguage
        ? resolveLocale(metaLanguage)
        : resolveAcceptLanguage(request.headers.get("accept-language"));
      await supabase.from("profiles").update({ language }).eq("id", user.id).is("language", null);
    }
  }

  // Honour redirect param, must be a relative path (no protocol-relative or absolute URLs)
  const destination = isSafeRelativePath(next) ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${destination}`);
}

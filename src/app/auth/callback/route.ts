import { createClient } from "@/lib/supabase/server";
import { isSafeRelativePath } from "@/lib/validation";
import { log } from "@/lib/log";
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

    // Persist the signup language (from user_metadata) onto the profile once,
    // so localized emails can target the right language.
    const { data: { user } } = await supabase.auth.getUser();
    const lang = user?.user_metadata?.language;
    if (user && (lang === "fr" || lang === "en")) {
      await supabase.from("profiles").update({ language: lang }).eq("id", user.id).is("language", null);
    }
  }

  // Honour redirect param, must be a relative path (no protocol-relative or absolute URLs)
  const destination = isSafeRelativePath(next) ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${destination}`);
}

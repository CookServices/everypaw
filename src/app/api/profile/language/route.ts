import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Safety net for accounts that still have no language: the dashboard sends
 * the browser's, already resolved to "fr" or "en". Never overwrites a
 * language already set, so neither a signup choice nor a later setting is
 * ever replaced from here.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const language = body?.language;
  if (language !== "fr" && language !== "en") {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ language })
    .eq("id", user.id)
    .is("language", null);

  if (error) {
    log.error("[profile/language] update failed:", error);
    return NextResponse.json({ error: "Could not save the language" }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}

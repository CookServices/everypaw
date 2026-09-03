import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { UUID_REGEX } from "@/lib/validation";
import { log } from "@/lib/log";

/**
 * Records that a user opened a book preview for one of their pets (spec P1-1).
 *
 * `events_log` is UNIQUE (user_id, pet_id, event_type), so this is a boolean
 * fact, not a counter: opening the preview ten times leaves one row, and the
 * duplicate insert is expected rather than an error. That is exactly the shape
 * the funnel query needs, which counts users, not openings.
 *
 * Written with the service role because `events_log` has no client insert
 * policy; ownership is checked first with the caller's own session, so RLS
 * still decides which pets they may claim.
 */
// Not exported: Next rejects any export from a route file beyond its handlers
// and its route segment config.
const EVENT_TYPE = "book_preview_opened";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const petId = body?.petId;
  if (typeof petId !== "string" || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  // Owner only, to match `/api/preview-pdf` POST: it refuses everyone else,
  // so nobody else can have opened the preview this event claims to record.
  const { data: pet } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await getServiceSupabase()
    .from("events_log")
    .insert({ user_id: user.id, pet_id: petId, event_type: EVENT_TYPE });

  // 23505: the user had already opened a preview for this pet. Nothing to do.
  if (error && error.code !== "23505") {
    log.error("[events/book-preview] insert failed:", error);
    return NextResponse.json({ error: "Could not record the event" }, { status: 500 });
  }

  return NextResponse.json({ recorded: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { UUID_REGEX } from "@/lib/validation";
import { log } from "@/lib/log";

/**
 * Records that a free user clicked an upsell CTA on one of their pets.
 *
 * Same shape as `/api/events/book-preview`: `events_log` is UNIQUE (user_id,
 * pet_id, event_type), so each source is its own event type and the row is a
 * boolean fact, not a counter. A repeated click is expected, not an error.
 *
 * The client sends a source, never an event type: the mapping is a closed
 * allowlist here, so nobody can write an arbitrary event_type into the table.
 */
// Not exported: Next rejects any export from a route file beyond its handlers
// and its route segment config.
const EVENT_TYPES: Record<string, string> = {
  story: "upsell_click_story",
  book: "upsell_click_book",
  backfill: "upsell_click_backfill",
  next_chapter: "upsell_click_next_chapter",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const petId = body?.petId;
  const source = body?.source;
  if (typeof petId !== "string" || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }
  const eventType = typeof source === "string" && Object.prototype.hasOwnProperty.call(EVENT_TYPES, source)
    ? EVENT_TYPES[source]
    : null;
  if (!eventType) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  // Owner only: the CTAs live on the owner's pet page and dashboard.
  const { data: pet } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await getServiceSupabase()
    .from("events_log")
    .insert({ user_id: user.id, pet_id: petId, event_type: eventType });

  // 23505: the user had already clicked this CTA for this pet. Nothing to do.
  if (error && error.code !== "23505") {
    log.error("[events/upsell-click] insert failed:", error);
    return NextResponse.json({ error: "Could not record the event" }, { status: 500 });
  }

  return NextResponse.json({ recorded: true });
}

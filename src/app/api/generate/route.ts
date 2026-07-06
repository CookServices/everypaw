import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, canGenerateStory } from "@/lib/plan";
import { stripEmDash, buildStoryPrompt, type StoryStyle } from "@/lib/story";
import { callClaude, parseStoryResponse, AnthropicError } from "@/lib/anthropic";
import { UUID_REGEX } from "@/lib/validation";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Rate limit: 10 generations per user per day (UTC) ─────────────────────
  const todayUTC = new Date().toISOString().split("T")[0];
  const { count: todayCount } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", `${todayUTC}T00:00:00.000Z`);

  if ((todayCount ?? 0) >= 10) {
    log.warn("[generate] rate limit hit for user:", user.id, "todayCount:", todayCount);
    return NextResponse.json(
      { error: "daily_generation_limit", message: "You have reached the limit of 10 story generations per day. Try again tomorrow." },
      { status: 429 },
    );
  }

  const { petId, style, periodStart, periodEnd } = await req.json();

  if (!petId) return NextResponse.json({ error: "Missing petId" }, { status: 400 });
  if (!UUID_REGEX.test(petId)) return NextResponse.json({ error: "Invalid petId" }, { status: 400 });

  // Validate date format (YYYY-MM-DD) to prevent unexpected DB behavior
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  if (periodStart && !DATE_REGEX.test(periodStart)) {
    return NextResponse.json({ error: "Invalid periodStart format" }, { status: 400 });
  }
  if (periodEnd && !DATE_REGEX.test(periodEnd)) {
    return NextResponse.json({ error: "Invalid periodEnd format" }, { status: 400 });
  }

  // Whitelist style values to prevent prompt injection
  const VALID_STYLES = ["poetic", "humorous", "classic", "epic", "tender"];
  if (style && !VALID_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }

  // Re-fetch all data from DB, never trust client-supplied pet details or entry content
  const [{ data: pet }, { data: profile }] = await Promise.all([
    supabase.from("pets").select("id, user_id, name, species, bio").eq("id", petId).single(),
    supabase.from("profiles").select("language").eq("id", user.id).single(),
  ]);

  const lang = (profile?.language || "fr").toLowerCase().startsWith("fr") ? "French" : "English";
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) {
    log.error("[generate] 403 Forbidden: pet.user_id", pet.user_id, "!= user.id", user.id);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Plan gate ──────────────────────────────────────────────────────────────
  const { plan } = await getUserPlan();

  const { count: storyCount } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("story_type", "in", "(origins,birthday)");

  log.debug("[generate] plan gate: plan=", plan, "storyCount=", storyCount);

  const blocked = canGenerateStory(plan, storyCount ?? 0);
  if (blocked === "story_limit") {
    log.warn("[generate] 403 story_limit: plan=", plan, "storyCount=", storyCount);
    return NextResponse.json({ error: "story_limit" }, { status: 403 });
  }

  // ── Fetch entries from DB (never trust client-supplied content) ────────────
  let entriesQuery = supabase
    .from("entries")
    .select("entry_date, content, mood")
    .eq("pet_id", petId)
    .eq("user_id", user.id)
    .order("entry_date", { ascending: true })
    .limit(50);

  if (periodStart) entriesQuery = entriesQuery.gte("entry_date", periodStart.slice(0, 10));
  if (periodEnd) entriesQuery = entriesQuery.lte("entry_date", periodEnd.slice(0, 10));

  const { data: entries } = await entriesQuery;

  if (!entries || entries.length < 3) {
    return NextResponse.json({ error: "Need at least 3 entries" }, { status: 400 });
  }

  // Shared prompt builder (single source of truth with the cron path in lib/story.ts)
  const prompt = buildStoryPrompt(
    { id: pet.id, name: pet.name, species: pet.species, bio: pet.bio },
    entries,
    lang,
    style as StoryStyle | undefined,
  );

  log.debug("[generate] params:", { petId, style, periodStart, periodEnd, entriesCount: entries?.length });

  try {
    log.debug("[generate] calling Anthropic model=claude-sonnet-4-6");
    const text = await callClaude({ prompt, maxTokens: 1200 });
    log.debug("[generate] raw text length:", text.length);

    const parsed = parseStoryResponse(text);
    const title = stripEmDash(parsed.title);
    const story = stripEmDash(parsed.story);
    log.debug("[generate] parsed title:", title, "| story length:", story?.length);

    // Compute period dates (must be YYYY-MM-DD), entries sorted ASC so [0]=oldest, [last]=most recent
    const today = new Date().toISOString().split("T")[0];
    const firstEntry: string | undefined = entries[0]?.entry_date;
    const lastEntry: string | undefined = entries[entries.length - 1]?.entry_date;
    const finalPeriodStart = (periodStart || firstEntry || today).slice(0, 10);
    const finalPeriodEnd = (
      periodEnd
        ? [periodEnd, lastEntry ?? today, today].sort().at(0)!
        : lastEntry ?? today
    ).slice(0, 10);

    log.debug("[generate] INSERT payload:", { pet_id: petId, style: style ?? "classic", period_start: finalPeriodStart, period_end: finalPeriodEnd });

    const { data: saved, error: insertError } = await supabase
      .from("stories")
      .insert({
        pet_id: petId,
        user_id: user.id,
        title,
        content: story,
        style: style ?? "classic",
        period_start: finalPeriodStart,
        period_end: finalPeriodEnd,
        status: "published",
      })
      .select()
      .single();

    if (insertError) {
      log.error("[generate] Supabase INSERT error:", insertError.message);
      return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
    }

    log.debug("[generate] story saved, id:", saved?.id);
    return NextResponse.json({ title, story, id: saved?.id });
  } catch (error) {
    log.error("[generate] Unexpected error:", error);
    const status = error instanceof AnthropicError ? error.status : 500;
    return NextResponse.json({ error: "Generation failed" }, { status: status === 503 ? 503 : 500 });
  }
}

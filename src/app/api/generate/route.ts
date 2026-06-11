import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, canGenerateStory } from "@/lib/plan";
import { escapeXml } from "@/lib/html";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    console.warn("[generate] rate limit hit for user:", user.id, "todayCount:", todayCount);
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

  // Re-fetch all data from DB — never trust client-supplied pet details or entry content
  const [{ data: pet }, { data: profile }] = await Promise.all([
    supabase.from("pets").select("id, user_id, name, species, bio").eq("id", petId).single(),
    supabase.from("profiles").select("locale, language").eq("id", user.id).single(),
  ]);

  const lang = (profile?.locale || profile?.language || "fr").toLowerCase().startsWith("fr") ? "French" : "English";
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) {
    console.error("[generate] 403 Forbidden: pet.user_id", pet.user_id, "!= user.id", user.id);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Plan gate ──────────────────────────────────────────────────────────────
  const { plan } = await getUserPlan();

  const { count: storyCount } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("story_type", "in", "(origins,birthday)");

  console.log("[generate] plan gate: plan=", plan, "storyCount=", storyCount);

  const blocked = canGenerateStory(plan, storyCount ?? 0);
  if (blocked === "story_limit") {
    console.warn("[generate] 403 story_limit: plan=", plan, "storyCount=", storyCount);
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

  const petName = pet.name;
  const species = pet.species;
  const bio = pet.bio;

  const entriesText = entries
    .map((e: { entry_date: string; content: string; mood?: string }) =>
      `[${e.entry_date}] ${e.content}`
    )
    .join("\n");

  const STYLE_DESCRIPTIONS: Record<string, string> = {
    poetic:   "Write in a poetic, lyrical style with rich metaphors and emotional imagery. Use beautiful language.",
    humorous: "Write with humor and wit — light, playful, full of amusing observations and gentle self-deprecating comedy.",
    classic:  "Write in a classic, clean narrative style — sober, well-structured, timeless.",
    epic:     "Write in an epic, adventurous, dramatic style. Make everyday moments feel heroic.",
    tender:   "Write like a love letter — deeply warm, intimate, soft, full of tenderness and affection.",
  };

  const prompt = `You are writing a warm, emotional, first-person narrative story for a pet journal called Everypaw.

IMPORTANT: Write this story entirely in ${lang}. Do not use any other language.
${style ? `STYLE: ${STYLE_DESCRIPTIONS[style] ?? ""}` : ""}

<pet_details>
  <name>${escapeXml(petName)}</name>
  <species>${escapeXml(species || "")}</species>
  <bio>${escapeXml(bio || "Not provided")}</bio>
</pet_details>

<journal_entries>
${escapeXml(entriesText)}
</journal_entries>

Write a beautiful narrative story of 400-500 words, structured in exactly 3 paragraphs. Separate each paragraph with a blank line. Do NOT include any section labels or headers (no "INTRO", "DÉVELOPPEMENT", "CHUTE", or similar):

Paragraph 1: Set the mood of the period — evoke atmosphere, season, daily rhythm. Do NOT list events; paint a feeling.

Paragraphs 2-3: Bring to life the key moments from the journal entries. Use sensory details (smells, textures, sounds). Weave entries into a flowing narrative — never list them. Show emotion through action and sensation.

Paragraph 4: End with a tender, introspective note from the pet's point of view — a small reflection or realization. Close with a single memorable, resonant sentence.

Style rules (follow strictly):
- First-person voice: the pet is the narrator throughout
- Use the pet's name (from pet_details) at least 3 times naturally in the text
- Reference the species (from pet_details) or breed at least once
- Do NOT mechanically list journal entries — transform them into narrative
- Tone: warm, intimate, slightly poetic — like a letter to the reader
- Target exactly 400-500 words (count carefully)

Also generate a short evocative title (5 words max).

You MUST respond with valid JSON only, no other text:
{"title": "...", "story": "..."}`;

  console.log("[generate] params:", { petId, style, periodStart, periodEnd, entriesCount: entries?.length });
  console.log("[generate] API key present:", !!process.env.ANTHROPIC_API_KEY);

  try {
    console.log("[generate] calling Anthropic model=claude-sonnet-4-6");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const anthropicData = await response.json();
    console.log("[generate] Anthropic status:", response.status, "| stop_reason:", anthropicData.stop_reason, "| error:", anthropicData.error ?? null);

    if (!response.ok) {
      console.error("[generate] Anthropic API error:", anthropicData);
      console.error("[generate] Anthropic error detail:", anthropicData.error);
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    const text = anthropicData.content?.[0]?.text || "";
    console.log("[generate] raw text length:", text.length);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[generate] No JSON in Anthropic response:", text.slice(0, 200));
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const { title, story } = parsed;
    console.log("[generate] parsed title:", title, "| story length:", story?.length);

    // Compute period dates (must be YYYY-MM-DD) — entries sorted ASC so [0]=oldest, [last]=most recent
    const today = new Date().toISOString().split("T")[0];
    const firstEntry: string | undefined = entries[0]?.entry_date;
    const lastEntry: string | undefined = entries[entries.length - 1]?.entry_date;
    const finalPeriodStart = (periodStart || firstEntry || today).slice(0, 10);
    const finalPeriodEnd = (
      periodEnd
        ? [periodEnd, lastEntry ?? today, today].sort().at(0)!
        : lastEntry ?? today
    ).slice(0, 10);

    console.log("[generate] INSERT payload:", { pet_id: petId, style: style ?? "classic", period_start: finalPeriodStart, period_end: finalPeriodEnd });

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
      console.error("[generate] Supabase INSERT error:", insertError);
      console.error("[generate] Supabase INSERT error detail:", insertError.message);
      return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
    }

    console.log("[generate] story saved, id:", saved?.id);
    return NextResponse.json({ title, story, id: saved?.id });
  } catch (error) {
    console.error("[generate] Unexpected error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

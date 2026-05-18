import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, canGenerateStory } from "@/lib/plan";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petId, petName, species, bio, entries, style } = await req.json();

  if (!petId) return NextResponse.json({ error: "Missing petId" }, { status: 400 });

  const { data: pet } = await supabase.from("pets").select("id, user_id").eq("id", petId).single();
  const { data: profile } = await supabase.from("profiles").select("locale, language").eq("id", user.id).single();
  const lang = (profile?.locale || profile?.language || "fr").toLowerCase().startsWith("fr") ? "French" : "English";
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Plan gate ──────────────────────────────────────────────────────────────
  const { plan } = await getUserPlan();

  const { count: storyCount } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const blocked = canGenerateStory(plan, storyCount ?? 0);
  if (blocked === "story_limit") {
    return NextResponse.json({ error: "story_limit" }, { status: 403 });
  }

  // ── Entries check ──────────────────────────────────────────────────────────
  if (!entries || entries.length < 3) {
    return NextResponse.json({ error: "Need at least 3 entries" }, { status: 400 });
  }

  const entriesText = entries
    .map((e: { entry_date: string; content: string; mood?: string }) =>
      `[${e.entry_date}] ${e.content}`
    )
    .join("\n");

  const prompt = `You are writing a warm, emotional, first-person narrative story for a pet journal called Everypaw.

IMPORTANT: Write this story entirely in ${lang}. Do not use any other language.
${style ? `STYLE: ${({
  poetic:   "Write in a poetic, lyrical style with rich metaphors and emotional imagery. Use beautiful language.",
  humorous: "Write with humor and wit — light, playful, full of amusing observations and gentle self-deprecating comedy.",
  classic:  "Write in a classic, clean narrative style — sober, well-structured, timeless.",
  epic:     "Write in an epic, adventurous, dramatic style. Make everyday moments feel heroic.",
  tender:   "Write like a love letter — deeply warm, intimate, soft, full of tenderness and affection.",
} as Record<string,string>)[style] ?? ""}` : ""}

Pet details:
- Name: ${petName}
- Species: ${species}
- Bio: ${bio || "Not provided"}

Journal entries written by their owner:
${entriesText}

Write a beautiful narrative story of 400-500 words, structured in exactly 3 paragraphs. Separate each paragraph with a blank line. Do NOT include any section labels or headers (no "INTRO", "DÉVELOPPEMENT", "CHUTE", or similar):

Paragraph 1: Set the mood of the period — evoke atmosphere, season, daily rhythm. Do NOT list events; paint a feeling.

Paragraphs 2-3: Bring to life the key moments from the journal entries. Use sensory details (smells, textures, sounds). Weave entries into a flowing narrative — never list them. Show emotion through action and sensation.

Paragraph 4: End with a tender, introspective note from ${petName}'s point of view — a small reflection or realization. Close with a single memorable, resonant sentence.

Style rules (follow strictly):
- First-person voice: ${petName} is the narrator throughout
- Mention ${petName}'s name at least 3 times naturally in the text
- Reference the species (${species}) or breed at least once
- Do NOT mechanically list journal entries — transform them into narrative
- Tone: warm, intimate, slightly poetic — like a letter to the reader
- Target exactly 400-500 words (count carefully)

Also generate a short evocative title (5 words max).

You MUST respond with valid JSON only, no other text:
{"title": "...", "story": "..."}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", text);
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ title: parsed.title, story: parsed.story });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

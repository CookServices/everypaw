import { escapeXml } from "@/lib/html";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoryStyle = "poetic" | "humorous" | "classic" | "epic" | "tender";

const STYLE_DESCRIPTIONS: Record<StoryStyle, string> = {
  poetic:   "Write in a poetic, lyrical style with rich metaphors and emotional imagery. Use beautiful language.",
  humorous: "Write with humor and wit — light, playful, full of amusing observations and gentle self-deprecating comedy.",
  classic:  "Write in a classic, clean narrative style — sober, well-structured, timeless.",
  epic:     "Write in an epic, adventurous, dramatic style. Make everyday moments feel heroic.",
  tender:   "Write like a love letter — deeply warm, intimate, soft, full of tenderness and affection.",
};

interface StoryPet {
  id: string;
  name: string;
  species: string | null;
  bio: string | null;
}

interface StoryEntry {
  entry_date: string;
  content: string;
  mood?: string;
}

export function buildStoryPrompt(
  pet: StoryPet,
  entries: StoryEntry[],
  lang: "French" | "English",
  style?: StoryStyle,
): string {
  const entriesText = entries
    .map((e) => `[${e.entry_date}] ${e.content}`)
    .join("\n");

  return `You are writing a warm, emotional, first-person narrative story for a pet journal called Everypaw.

IMPORTANT: Write this story entirely in ${lang}. Do not use any other language.
${style ? `STYLE: ${STYLE_DESCRIPTIONS[style]}` : ""}

<pet_details>
  <name>${escapeXml(pet.name)}</name>
  <species>${escapeXml(pet.species || "")}</species>
  <bio>${escapeXml(pet.bio || "Not provided")}</bio>
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
}

export interface GeneratedStory {
  id: string;
  title: string;
  story: string;
}

/**
 * Calls Anthropic and inserts the resulting story into `stories`.
 * Pass `monthKey` (format 'YYYY-MM') for cron-generated stories; null for user-triggered.
 * Throws on Anthropic failure or invalid response format.
 * Returns null on unique constraint violation (duplicate month_key for this pet) so callers
 * can skip gracefully.
 */
export async function generateAndSaveStory(
  supabase: SupabaseClient,
  userId: string,
  pet: StoryPet,
  entries: StoryEntry[],
  lang: "French" | "English",
  style: StoryStyle = "classic",
  monthKey: string | null = null,
): Promise<GeneratedStory | null> {
  const prompt = buildStoryPrompt(pet, entries, lang, style);

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

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${JSON.stringify(anthropicData.error)}`);
  }

  const text: string = anthropicData.content?.[0]?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON in Anthropic response: ${text.slice(0, 200)}`);
  }

  const { title, story } = JSON.parse(jsonMatch[0]) as { title: string; story: string };

  const today = new Date().toISOString().split("T")[0];
  const firstEntry = entries[0]?.entry_date;
  const lastEntry = entries[entries.length - 1]?.entry_date;
  const periodStart = (firstEntry || today).slice(0, 10);
  const periodEnd = (lastEntry || today).slice(0, 10);

  const { data: saved, error: insertError } = await supabase
    .from("stories")
    .insert({
      pet_id: pet.id,
      user_id: userId,
      title,
      content: story,
      style,
      period_start: periodStart,
      period_end: periodEnd,
      status: "published",
      ...(monthKey ? { month_key: monthKey } : {}),
    })
    .select("id")
    .single();

  if (insertError) {
    // 23505 = unique_violation — race condition on (pet_id, month_key), skip silently
    if (insertError.code === "23505") return null;
    throw new Error(`Supabase INSERT error: ${insertError.message}`);
  }

  return { id: saved.id, title, story };
}

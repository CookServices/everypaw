import { escapeXml } from "@/lib/html";
import { callClaude, parseStoryResponse } from "@/lib/anthropic";
import { canGenerateStory, type Plan } from "@/lib/plan-guards";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Strip the em dash (—) from AI-generated text. The model is told never to use it; this guarantees it. */
export function stripEmDash(s: string): string {
  return s.replace(/\s*—\s*/g, ", ");
}

export type StoryStyle = "poetic" | "humorous" | "classic" | "epic" | "tender";

const STYLE_DESCRIPTIONS: Record<StoryStyle, string> = {
  poetic:   "Write in a poetic, lyrical style with rich metaphors and emotional imagery. Use beautiful language.",
  humorous: "Write with humor and wit, light, playful, full of amusing observations and gentle self-deprecating comedy.",
  classic:  "Write in a classic, clean narrative style, sober, well-structured, timeless.",
  epic:     "Write in an epic, adventurous, dramatic style. Make everyday moments feel heroic.",
  tender:   "Write like a love letter, deeply warm, intimate, soft, full of tenderness and affection.",
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

Paragraph 1: Set the mood of the period, evoke atmosphere, season, daily rhythm. Do NOT list events; paint a feeling.

Paragraphs 2-3: Bring to life the key moments from the journal entries. Use sensory details (smells, textures, sounds). Weave entries into a flowing narrative, never list them. Show emotion through action and sensation.

Paragraph 4: End with a tender, introspective note from the pet's point of view, a small reflection or realization. Close with a single memorable, resonant sentence.

Style rules (follow strictly):
- First-person voice: the pet is the narrator throughout
- Use the pet's name (from pet_details) at least 3 times naturally in the text
- Reference the species (from pet_details) or breed at least once
- Do NOT mechanically list journal entries, transform them into narrative
- Tone: warm, intimate, slightly poetic, like a letter to the reader
- Target exactly 400-500 words (count carefully)
- NEVER use the em dash character (—). Use commas, periods, or parentheses instead.

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
export function buildOriginsPrompt(
  pet: StoryPet,
  answer1: string,
  answer2: string,
  answer3: string,
  lang: "French" | "English",
): string {
  const petName = escapeXml(pet.name);
  const petSpecies = escapeXml(pet.species || "");
  const petBio = escapeXml(pet.bio || "Not provided");
  const a1 = escapeXml(answer1);
  const a2 = answer2.trim() ? escapeXml(answer2) : null;
  const a3 = answer3.trim() ? escapeXml(answer3) : null;

  const titleEN = "Chapter 1, How it all began";
  const titleFR = "Chapitre 1, Comment tout a commencé";
  const fixedTitle = lang === "French" ? titleFR : titleEN;

  return `You are writing a warm, emotional, first-person narrative story for a pet journal called Everypaw.

IMPORTANT: Write this story entirely in ${lang}. Do not use any other language.

This is a special ORIGINS story, the very first chapter of ${petName}'s life with their family.
The title is fixed: "${fixedTitle}"

<pet_details>
  <name>${petName}</name>
  <species>${petSpecies}</species>
  <bio>${petBio}</bio>
</pet_details>

<origins_answers>
  <arrival>${a1}</arrival>${a2 ? `\n  <first_memory>${a2}</first_memory>` : ""}${a3 ? `\n  <what_makes_unique>${a3}</what_makes_unique>` : ""}
</origins_answers>

Write a beautiful narrative retrospective story of 350-450 words. The pet is the narrator (first-person voice).
Structure:
- Opening paragraph: how I arrived, the first moments with my family, paint the scene with sensory details
- Middle paragraphs (1-2): early memories, first mischief or milestone, what makes me unique
- Closing paragraph: a tender, warm note, what home means to me now. End with one resonant sentence.

Style rules:
- First-person voice throughout (I, me, my)
- Use ${petName} as a self-reference at least once naturally
- Warm, intimate, slightly poetic, like a letter to the reader
- Do NOT list facts, transform them into narrative
- Target 350-450 words
- NEVER use the em dash character (—). Use commas, periods, or parentheses instead.

You MUST respond with valid JSON only, no other text:
{"title": "${fixedTitle}", "story": "..."}`;
}

export function buildBirthdayLetterPrompt(
  pet: StoryPet,
  entries: StoryEntry[],
  lang: "French" | "English",
  age: number | null,
): string {
  const petName = escapeXml(pet.name);
  const petSpecies = escapeXml(pet.species || "");
  const petBio = escapeXml(pet.bio || "Not provided");
  const ageStr = age
    ? (lang === "French"
        ? `${age} an${age > 1 ? "s" : ""}`
        : `${age} year${age > 1 ? "s" : ""}`)
    : null;
  const fixedTitle = lang === "French"
    ? `Une lettre de ${pet.name} 🎂`
    : `A letter from ${pet.name} 🎂`;
  const entriesText = entries
    .map((e) => `[${e.entry_date}] ${e.content}`)
    .join("\n");

  return `You are writing a short, heartfelt birthday letter for a pet journal called Everypaw.

IMPORTANT: Write this letter entirely in ${lang}. Do not use any other language.

The pet is writing to their human family on their birthday${ageStr ? `, turning ${ageStr}` : ""}.

<pet_details>
  <name>${petName}</name>
  <species>${petSpecies}</species>
  <bio>${petBio}</bio>
</pet_details>

${entries.length > 0 ? `<journal_entries_this_year>\n${escapeXml(entriesText)}\n</journal_entries_this_year>` : ""}

Write a short, warm birthday letter of exactly 150-250 words.
- First-person voice: the pet is the narrator (I, me, my)
${entries.length > 0
    ? "- Weave in 1-2 specific memories from the journal entries above"
    : "- Write warmly based on the pet's species and name"}
- Tone: tender, slightly playful, full of love
- End with a warm closing sentence addressed to the human family
- NEVER use the em dash character (—). Use commas, periods, or parentheses instead.

The title is fixed: "${fixedTitle}"

You MUST respond with valid JSON only, no other text:
{"title": "${fixedTitle}", "story": "..."}`;
}

export async function generateAndSaveBirthdayLetter(
  supabase: SupabaseClient,
  userId: string,
  pet: StoryPet,
  entries: StoryEntry[],
  lang: "French" | "English",
  yearKey: string,
  age: number | null,
): Promise<GeneratedStory | null> {
  const prompt = buildBirthdayLetterPrompt(pet, entries, lang, age);
  const today = new Date().toISOString().split("T")[0];

  const text = await callClaude({ prompt, maxTokens: 600 });
  const parsed = parseStoryResponse(text);
  const title = stripEmDash(parsed.title);
  const story = stripEmDash(parsed.story);

  const { data: saved, error: insertError } = await supabase
    .from("stories")
    .insert({
      pet_id: pet.id,
      user_id: userId,
      title,
      content: story,
      style: "tender",
      period_start: `${yearKey}-01-01`,
      period_end: today,
      status: "published",
      // month_key is dual-purpose: 'YYYY-MM' for monthly stories, 'YYYY' here — it
      // just needs to be unique per (pet, period) to dedup birthday letters per year.
      month_key: yearKey,
      story_type: "birthday",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return null;
    throw new Error(`Supabase INSERT birthday letter: ${insertError.message}`);
  }

  return { id: saved.id, title, story };
}

export async function generateAndSaveStory(
  supabase: SupabaseClient,
  userId: string,
  pet: StoryPet,
  entries: StoryEntry[],
  lang: "French" | "English",
  style: StoryStyle = "classic",
  monthKey: string | null = null,
  storyType: string = "monthly",
): Promise<GeneratedStory | null> {
  const prompt = buildStoryPrompt(pet, entries, lang, style);

  const text = await callClaude({ prompt, maxTokens: 1200 });
  const parsed = parseStoryResponse(text);
  const title = stripEmDash(parsed.title);
  const story = stripEmDash(parsed.story);

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
      story_type: storyType,
    })
    .select("id")
    .single();

  if (insertError) {
    // 23505 = unique_violation, race condition on (pet_id, month_key), skip silently
    if (insertError.code === "23505") return null;
    throw new Error(`Supabase INSERT error: ${insertError.message}`);
  }

  return { id: saved.id, title, story };
}

// ── First-story nudge ────────────────────────────────────────────────────────
// Encourages a free-plan user who's already logged 3+ moments to spend their
// one included generation, in-app card first, reminder email if ignored.

export interface FirstStoryNudgeConditions {
  deceasedAt: string | null;
  plan: Plan;
  /** User's total story count, excluding story_type in (origins, birthday). */
  totalStories: number;
  /** This pet's entry count. */
  entryCount: number;
  /** This pet's story count, any status. */
  existingStoryCount: number;
}

/** Pure eligibility check, shared by the dashboard card and the reminder cron. */
export function evaluateFirstStoryNudge(c: FirstStoryNudgeConditions): boolean {
  if (c.deceasedAt) return false;
  if (canGenerateStory(c.plan, c.totalStories) !== null) return false;
  if (c.entryCount < 3) return false;
  if (c.existingStoryCount > 0) return false;
  return true;
}

/** Server-side lookup for one (user, pet) pair. Used by the first-story-nudge cron. */
export async function shouldShowFirstStoryNudge(
  supabase: SupabaseClient,
  userId: string,
  petId: string,
): Promise<boolean> {
  const [{ data: pet }, { data: profile }, { count: entryCount }, { count: existingStoryCount }, { count: totalStories }] =
    await Promise.all([
      supabase.from("pets").select("id, user_id, deceased_at").eq("id", petId).single(),
      supabase.from("profiles").select("plan").eq("id", userId).single(),
      supabase.from("entries").select("*", { count: "exact", head: true }).eq("pet_id", petId),
      supabase.from("stories").select("*", { count: "exact", head: true }).eq("pet_id", petId),
      supabase.from("stories").select("*", { count: "exact", head: true }).eq("user_id", userId).not("story_type", "in", "(origins,birthday)"),
    ]);

  if (!pet || pet.user_id !== userId) return false;

  return evaluateFirstStoryNudge({
    deceasedAt: pet.deceased_at,
    plan: (profile?.plan ?? "free") as Plan,
    totalStories: totalStories ?? 0,
    entryCount: entryCount ?? 0,
    existingStoryCount: existingStoryCount ?? 0,
  });
}

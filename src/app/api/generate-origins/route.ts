import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOriginsPrompt, stripEmDash } from "@/lib/story";
import { callClaude, parseStoryResponse } from "@/lib/anthropic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { petId, answer1, answer2 = "", answer3 = "" } = body;

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }
  if (!answer1 || answer1.trim().length < 20) {
    return NextResponse.json({ error: "answer1_required" }, { status: 400 });
  }
  if (answer1.length > 1000 || answer2.length > 1000 || answer3.length > 1000) {
    return NextResponse.json({ error: "answer_too_long" }, { status: 400 });
  }

  // Verify pet ownership (never trust client)
  const { data: pet } = await supabase
    .from("pets")
    .select("id, user_id, name, species, bio, birthdate")
    .eq("id", petId)
    .single();

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check if origins story already exists
  const { count: originsCount } = await supabase
    .from("stories")
    .select("*", { count: "exact", head: true })
    .eq("pet_id", petId)
    .eq("story_type", "origins");

  if ((originsCount ?? 0) > 0) {
    return NextResponse.json({ error: "origins_exists" }, { status: 409 });
  }

  // Detect language from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single();
  const lang: "French" | "English" = (profile?.language || "fr")
    .toLowerCase().startsWith("fr") ? "French" : "English";

  // Create entries from text answers (antidated: birthdate or today - 1 year)
  const entryDate = pet.birthdate
    ? pet.birthdate.slice(0, 10)
    : new Date(Date.now() - 365 * 864e5).toISOString().split("T")[0];

  // Insert the text answers as journal entries (tagged 'origins')
  const entriesToInsert = [
    { content: answer1.trim(), entry_date: entryDate },
    ...(answer2.trim() ? [{ content: answer2.trim(), entry_date: entryDate }] : []),
    ...(answer3.trim() ? [{ content: answer3.trim(), entry_date: entryDate }] : []),
  ].map(e => ({
    pet_id: petId,
    user_id: user.id,
    content: e.content,
    entry_date: e.entry_date,
    tags: ["origins"],
  }));

  await supabase.from("entries").insert(entriesToInsert);

  // Generate the story
  const prompt = buildOriginsPrompt(pet, answer1.trim(), answer2.trim(), answer3.trim(), lang);

  const fixedTitle = lang === "French"
    ? "Chapitre 1, Comment tout a commencé"
    : "Chapter 1, How it all began";

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Generation unavailable" }, { status: 503 });
  }

  try {
    const text = await callClaude({ prompt, maxTokens: 1200 });
    const parsed = parseStoryResponse(text);
    const story = stripEmDash(parsed.story);

    const { data: saved, error: insertError } = await supabase
      .from("stories")
      .insert({
        pet_id: petId,
        user_id: user.id,
        title: fixedTitle,
        content: story,
        style: "classic",
        period_start: entryDate,
        period_end: entryDate,
        status: "published",
        story_type: "origins",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "origins_exists" }, { status: 409 });
      }
      log.error("[generate-origins] INSERT error:", insertError.message);
      return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
    }

    return NextResponse.json({ id: saved.id, title: fixedTitle, story });
  } catch (err) {
    log.error("[generate-origins] Unexpected error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, canGenerateStory } from "@/lib/plan";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petId, petName, species, bio, entries } = await req.json();

  if (!petId) return NextResponse.json({ error: "Missing petId" }, { status: 400 });

  const { data: pet } = await supabase.from("pets").select("id, user_id").eq("id", petId).single();
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

Pet details:
- Name: ${petName}
- Species: ${species}
- Bio: ${bio || "Not provided"}

Journal entries written by their owner:
${entriesText}

Write a beautiful narrative story of approximately 300-400 words in first person as if ${petName} is narrating their own life. Warm emotional tone. Start with something memorable. End on a heartfelt note.

Also generate a short title (5 words max).

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
        max_tokens: 1000,
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

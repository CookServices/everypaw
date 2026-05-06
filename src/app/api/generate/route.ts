import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petId, petName, species, bio, entries } = await req.json();

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

Your task:
Write a beautiful narrative story of approximately 300-400 words, written in the first person as if ${petName} is narrating their own life.

Guidelines:
- Warm, emotional tone — this will be printed in a hardcover book
- Weave the specific memories from the journal entries into a flowing narrative
- Capture the pet's personality and the bond with their owner
- Start with something memorable, not "I am ${petName}"
- Include specific details from the entries to make it feel real and personal
- End on a heartfelt note

Also generate a short title (5 words max) for this story.

Respond in JSON format only:
{
  "title": "...",
  "story": "..."
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ title: parsed.title, story: parsed.story });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

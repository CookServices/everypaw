import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Last month period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const periodStartStr = periodStart.toISOString().split("T")[0];
  const periodEndStr = periodEnd.toISOString().split("T")[0];
  const monthLabel = periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("is_premium", true);

  if (!profiles) return NextResponse.json({ generated: 0, errors: 0 });

  let generated = 0;
  let errors = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, species, bio")
      .eq("user_id", profile.id);

    if (!pets || pets.length === 0) continue;

    const storiesGenerated: string[] = [];

    for (const pet of pets) {
      const { data: entries } = await supabase
        .from("entries")
        .select("content, entry_date, mood")
        .eq("pet_id", pet.id)
        .gte("entry_date", periodStartStr)
        .lte("entry_date", periodEndStr)
        .order("entry_date", { ascending: true });

      if (!entries || entries.length < 3) continue;

      const entriesText = entries
        .map((e) => `[${e.entry_date}] ${e.content}`)
        .join("\n");

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-5",
            max_tokens: 1024,
            system: [
              {
                type: "text",
                // Cached across all pets in the same cron run
                text: `You are a warm, creative writer for Everypaw, a pet journal app. Your task is to write a beautiful monthly narrative story from the perspective of a pet, based on journal entries written by their owner. The story should be written in first person as if the pet is narrating their own life. Use a warm, emotional, slightly whimsical tone. Start with something memorable from the month. End on a heartfelt note. Target 300-400 words. Also generate a short title of 5 words maximum. You MUST respond with valid JSON only, no other text: {"title": "...", "story": "..."}`,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: [
              {
                role: "user",
                content: `Generate a monthly story for ${monthLabel}.\n\nPet details:\n- Name: ${pet.name}\n- Species: ${pet.species}\n- Bio: ${pet.bio || "Not provided"}\n\nJournal entries from this month:\n${entriesText}`,
              },
            ],
          }),
        });

        const data = await response.json();
        const text = data.content?.[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          console.error(`No JSON in Claude response for pet ${pet.id}:`, text);
          errors++;
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        await supabase.from("stories").insert({
          pet_id: pet.id,
          user_id: profile.id,
          content: parsed.story,
          title: parsed.title,
          period_start: periodStartStr,
          period_end: periodEndStr,
        });

        storiesGenerated.push(pet.name);
        generated++;
      } catch (err) {
        console.error(`Story generation failed for pet ${pet.id}:`, err);
        errors++;
      }
    }

    if (storiesGenerated.length === 0) continue;

    const petNames = storiesGenerated.join(", ");
    const subject =
      storiesGenerated.length === 1
        ? `✨ ${petNames}'s ${monthLabel} story is ready`
        : `✨ Your pets' ${monthLabel} stories are ready`;

    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: profile.email,
      subject,
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
          <p style="font-size: 28px; margin: 0 0 8px;">✨</p>
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">${monthLabel} — a new chapter</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 24px;">
            ${
              storiesGenerated.length === 1
                ? `${petNames}'s story for ${monthLabel} has just been written. Head to their journal to read it.`
                : `New stories for ${petNames} are ready for ${monthLabel}. Head to your dashboard to read them.`
            }
          </p>
          <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 15px; font-weight: 500;">Read the stor${storiesGenerated.length === 1 ? "y" : "ies"} →</a>
          <p style="font-size: 13px; color: #7A5C44; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
            Every month, Everypaw turns your daily moments into a story worth keeping.<br />
            Keep adding entries — the more you write, the richer the story.
          </p>
        </div>
      `,
    });
  }

  return NextResponse.json({ generated, errors, month: monthLabel });
}

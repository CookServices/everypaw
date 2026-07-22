import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";
import { generateAndSaveStory } from "@/lib/story";
import { getProfileLocaleById } from "@/lib/locale";
import { baseLayout, emoji, eyebrow, heading, paragraph, ctaButton, unsubscribeLink, heroSection, colorSection, divider, BRAND } from "@/lib/email-templates";

// Sequential AI generation across N pets, each callClaude up to ~30s. Vercel Hobby
// caps function duration at 60s, so the batch must fit there. If the eligible-pet
// count grows past what fits in 60s, either move to Pro (raise this to 300) or
// paginate the batch across invocations. The run is idempotent, so a timeout mid-batch
// is safe: the next scheduled run (or a manual re-trigger) resumes the unprocessed pets.
export const maxDuration = 60;

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const startedAt = Date.now();
  const supabase = getServiceSupabase();
  const resend = getResendClient();

  // month_key = previous month (cron fires on the 1st of the current month)
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${monthKey}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const monthEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  // Fetch eligible pets in a single query:
  // - owner on digital or print plan (email_reminders is NOT an eligibility gate:
  //   a paying user who muted emails still gets their chapter generated in-app;
  //   only the notification email below respects email_reminders)
  // - pet not deceased
  const { data: candidates, error: queryError } = await supabase
    .from("pets")
    .select(`
      id,
      name,
      species,
      bio,
      user_id,
      profiles!inner (
        id,
        email,
        plan,
        email_reminders,
        unsubscribe_token
      )
    `)
    .is("deceased_at", null)
    .in("profiles.plan", ["digital", "print"]);

  if (queryError) {
    log.error("[monthly-story] candidates query error:", queryError);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let processed = 0;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  // Sequential loop with max 2 concurrent Anthropic calls, enforced by awaiting each
  // pet before the next. For true p-limit concurrency increase this loop can be batched,
  // but sequential is safe and avoids adding a dependency.
  for (const pet of candidates ?? []) {
    processed++;

    const profile = (
      pet as unknown as {
        profiles: {
          id: string;
          email: string;
          plan: string;
          email_reminders: boolean;
          unsubscribe_token: string | null;
        };
      }
    ).profiles;

    // Gate: >= 3 entries in the previous month
    const { count: entryCount } = await supabase
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("pet_id", pet.id)
      .gte("entry_date", monthStart)
      .lte("entry_date", monthEnd);

    if ((entryCount ?? 0) < 3) { skipped++; continue; }

    // Idempotence: skip if story already exists for this (pet, month)
    const { count: existingCount } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .eq("pet_id", pet.id)
      .eq("month_key", monthKey);

    if ((existingCount ?? 0) > 0) { skipped++; continue; }

    // Fetch entries for prompt
    const { data: entries } = await supabase
      .from("entries")
      .select("entry_date, content, mood")
      .eq("pet_id", pet.id)
      .gte("entry_date", monthStart)
      .lte("entry_date", monthEnd)
      .order("entry_date", { ascending: true })
      .limit(50);

    if (!entries || entries.length < 3) { skipped++; continue; }

    const locale = await getProfileLocaleById(profile.id);
    const lang = locale === "en" ? "English" : "French";

    try {
      const result = await generateAndSaveStory(
        supabase,
        profile.id,
        { id: pet.id, name: pet.name, species: pet.species, bio: pet.bio },
        entries,
        lang,
        "classic",
        monthKey,
      );

      if (!result) {
        // Unique constraint race, already inserted by a concurrent run
        skipped++;
        continue;
      }

      generated++;

      // Notification email respects the email opt-out (generation already happened above)
      if (!profile.email_reminders || !profile.email) continue;

      // Build email, individual per pet, with chapter title + 2-sentence extract
      const petNameSafe = escapeHtml(pet.name);
      const titleSafe = escapeHtml(result.title);
      const firstParagraph = result.story.split(/\n\n/)[0] ?? result.story;
      const sentences = firstParagraph.split(/(?<=[.!?])\s+/);
      const extractSafe = escapeHtml(sentences.slice(0, 2).join(" "));

      const unsubscribeUrl = profile.unsubscribe_token
        ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
        : "https://everypaw.app/dashboard";
      const storiesUrl = `https://everypaw.app/dashboard/pets/${pet.id}?tab=stories`;

      const subject =
        locale === "en"
          ? `${pet.name}'s new chapter is ready 📖`
          : `Le nouveau chapitre de ${pet.name} est prêt 📖`;

      const ctaLabel = locale === "en" ? "Read the chapter" : "Lire le chapitre";
      const unsubscribeLabel =
        locale === "en"
          ? "Unsubscribe from monthly story emails"
          : "Se désinscrire des emails d'histoires mensuelles";

      await resend.emails.send({
        from: "Everypaw <hello@everypaw.app>",
        to: profile.email,
        subject,
        html: baseLayout(
          heroSection("📖", `${petNameSafe}'s Story` ) +
          heading(titleSafe) +
          paragraph(extractSafe) +
          divider() +
          colorSection(
            locale === "en"
              ? `<strong>A new chapter has been written.</strong> Read the full story to see all the moments we captured this month.`
              : `<strong>Un nouveau chapitre a été écrit.</strong> Lisez l'histoire complète pour voir tous les moments capturés ce mois-ci.`,
            BRAND.accent,
            "#FDFAF5"
          ) +
          ctaButton(storiesUrl, ctaLabel),
          unsubscribeLink(unsubscribeUrl, unsubscribeLabel),
          locale === "en" ? "en" : "fr",
        ),
      });
    } catch (err) {
      log.error(`[monthly-story] error for pet ${pet.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    processed,
    generated,
    skipped,
    failed,
    durationMs: Date.now() - startedAt,
    monthKey,
  });
}

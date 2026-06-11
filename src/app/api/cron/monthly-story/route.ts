import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";
import { generateAndSaveStory } from "@/lib/story";
import { getProfileLocaleById } from "@/lib/locale";

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

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
  // - owner on digital or print plan, email_reminders = true
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
    .in("profiles.plan", ["digital", "print"])
    .eq("profiles.email_reminders", true);

  if (queryError) {
    console.error("[monthly-story] candidates query error:", queryError);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let processed = 0;
  let generated = 0;
  let skipped = 0;
  let errors = 0;

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

    if (!profile?.email) { skipped++; continue; }

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

      const ctaLabel = locale === "en" ? "Read the chapter →" : "Lire le chapitre →";
      const unsubscribeLabel =
        locale === "en"
          ? "Unsubscribe from monthly story emails"
          : "Se désinscrire des emails d'histoires mensuelles";

      await resend.emails.send({
        from: "Everypaw <hello@everypaw.app>",
        to: profile.email,
        subject,
        html: `
          <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
            <p style="font-size: 28px; margin: 0 0 8px;">📖</p>
            <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px;">${titleSafe}</h1>
            <p style="font-size: 13px; color: #7A5C44; margin: 0 0 20px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">${petNameSafe}</p>
            <p style="font-size: 16px; line-height: 1.7; color: #5A3E2B; margin: 0 0 28px;">${extractSafe}</p>
            <a href="${storiesUrl}" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 15px; font-weight: 500;">${ctaLabel}</a>
            <p style="font-size: 12px; color: #7A5C44; margin-top: 32px; font-family: sans-serif;">
              <a href="${unsubscribeUrl}" style="color: #C8813A;">${unsubscribeLabel}</a>
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error(`[monthly-story] error for pet ${pet.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ processed, generated, skipped, errors, monthKey });
}

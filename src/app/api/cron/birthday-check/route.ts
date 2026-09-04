import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { sendEmail } from "@/lib/resend";
import { generateAndSaveBirthdayLetter } from "@/lib/story";
import { getTranslations } from "@/lib/i18n";
import { baseLayout, hero, heroSection, paragraph, quote, ctaButton, ctaButtonOutline, unsubscribeLink, oneClickUnsubscribeUrl, divider, colorSection, BRAND } from "@/lib/email-templates";

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();

  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const currentYear = today.getFullYear();
  const yearKey = String(currentYear);
  const todayStr = today.toISOString().split("T")[0];
  const yearStart = `${yearKey}-01-01`;

  // Feb 29 births have no calendar match on non-leap years — fold them onto Feb 28
  // so those pets still get a birthday email 3 years out of 4.
  const isLeap = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
  const datePatterns = [`%-${mm}-${dd}`];
  if (mm === "02" && dd === "28" && !isLeap) datePatterns.push("%-02-29");
  const orFilter = datePatterns.map(p => `birthdate.like.${p}`).join(",");

  const { data: pets } = await supabase
    .from("pets")
    .select("id, user_id, name, species, bio, birthdate, photo_url")
    .or(orFilter)
    .is("deceased_at", null);

  if (!pets || pets.length === 0) return NextResponse.json({ sent: 0, letters: 0 });

  const userIds = Array.from(new Set(pets.map(p => p.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, language, unsubscribe_token, plan, book_credits")
    .eq("email_reminders", true)
    .in("id", userIds);

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0, letters: 0 });

  const profileMap: Record<string, typeof profiles[number]> = {};
  for (const p of profiles) profileMap[p.id] = p;

  // Chapters each pet already had before today. The birthday letter this cron
  // writes is excluded on purpose: counting it would make every pet qualify,
  // since it is generated a few lines below. `or` rather than `neq` because a
  // manually generated story has a null story_type, and NULL <> 'birthday' is
  // NULL in Postgres, which would drop exactly the chapters that matter.
  const { data: existingStories } = await supabase
    .from("stories")
    .select("pet_id")
    .in("pet_id", pets.map(p => p.id))
    .or("story_type.is.null,story_type.neq.birthday");

  const chaptersByPet: Record<string, number> = {};
  for (const row of existingStories ?? []) {
    chaptersByPet[row.pet_id] = (chaptersByPet[row.pet_id] ?? 0) + 1;
  }

  let sent = 0;
  let letters = 0;

  for (const pet of pets) {
    const profile = profileMap[pet.user_id];
    if (!profile?.email) continue;

    const locale = (profile.language ?? "en").toLowerCase();
    const isFR = locale.startsWith("fr");
    const lang: "French" | "English" = isFR ? "French" : "English";
    const petName = escapeHtml(pet.name);
    const birthYear = pet.birthdate ? parseInt(pet.birthdate.slice(0, 4), 10) : null;
    const age = birthYear ? currentYear - birthYear : null;
    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const ageLabel = age
      ? (isFR ? `${age} an${age > 1 ? "s" : ""}` : `${age} year${age > 1 ? "s" : ""} old`)
      : null;

    const subject = isFR
      ? `🎂 C'est l'anniversaire de ${petName} !`
      : `🎂 It's ${petName}'s birthday!`;

    // ── Birthday letter (idempotent, one per pet per year) ───────────────────
    let letterExcerpt: string | null = null;
    let storyId: string | null = null;

    try {
      const { data: existing } = await supabase
        .from("stories")
        .select("id, content")
        .eq("pet_id", pet.id)
        .eq("story_type", "birthday")
        .eq("month_key", yearKey)
        .maybeSingle();

      if (existing) {
        storyId = existing.id;
        letterExcerpt = existing.content.split("\n").find((l: string) => l.trim().length > 0)?.slice(0, 200) ?? null;
      } else {
        const { data: yearEntries } = await supabase
          .from("entries")
          .select("entry_date, content")
          .eq("pet_id", pet.id)
          .gte("entry_date", yearStart)
          .lte("entry_date", todayStr)
          .order("entry_date", { ascending: false })
          .limit(20);

        const generated = await generateAndSaveBirthdayLetter(
          supabase,
          pet.user_id,
          { id: pet.id, name: pet.name, species: pet.species as string | null, bio: pet.bio as string | null ?? null },
          (yearEntries || []).map(e => ({ entry_date: e.entry_date, content: e.content })),
          lang,
          yearKey,
          age,
        );

        if (generated) {
          storyId = generated.id;
          letterExcerpt = generated.story.split("\n").find((l: string) => l.trim().length > 0)?.slice(0, 200) ?? null;
          letters++;
        }
      }
    } catch (err) {
      log.error(`[birthday-check] letter generation failed for pet ${pet.id}:`, err);
      // email still goes out
    }

    // ── Build enriched email HTML ─────────────────────────────────────────────
    const storyUrl = storyId
      ? `https://everypaw.app/dashboard/pets/${pet.id}?tab=stories`
      : "https://everypaw.app/dashboard";
    const excerptEscaped = letterExcerpt ? escapeHtml(letterExcerpt) : null;

    const letterBlock = excerptEscaped
      ? divider() +
        quote(isFR ? `« ${excerptEscaped}… »` : `"${excerptEscaped}…"`) +
        ctaButtonOutline(storyUrl, isFR ? `Lire la lettre de ${petName}` : `Read ${petName}'s letter`)
      : "";

    // A pet with chapters already has the makings of a book. Which call to
    // action depends on whether the reader can order one today: a Print
    // subscriber holding a credit orders, everyone else is shown the plan.
    const chapters = chaptersByPet[pet.id] ?? 0;
    const canOrderNow = profile.plan === "print" && (profile.book_credits ?? 0) > 0;
    const bookCopy = getTranslations(isFR ? "fr" : "en").birthday;
    const bookBlock = chapters > 0
      ? divider() +
        paragraph(bookCopy.book_prompt.replace("{name}", petName)) +
        ctaButtonOutline(
          canOrderNow
            ? `https://everypaw.app/dashboard/pets/${pet.id}/order`
            : "https://everypaw.app/dashboard/settings",
          canOrderNow ? bookCopy.book_cta_order : bookCopy.book_cta_discover,
        )
      : "";

    const html = baseLayout(
      hero({
        photoUrl: pet.photo_url,
        photoAlt: pet.name,
        illustration: "star",
        emoji: "🎂",
        heading: isFR
          ? `Joyeux anniversaire, ${petName}${ageLabel ? `, ${ageLabel}` : ""} !`
          : `Happy birthday, ${petName}${ageLabel ? `, ${ageLabel}` : ""} !`,
      }) +
      paragraph(isFR
        ? `C'est une belle occasion de noter ce moment dans son journal. Décrivez comment ${petName} est aujourd'hui, ce qu'il ou elle aime, ce qui a changé cette année, dans quelques ans, vous serez heureux de l'avoir noté.`
        : `Today is a perfect day to add a birthday entry to ${petName}'s journal. Describe how they are right now, what they love, what's changed this year, you'll be so glad you wrote it down.`) +
      letterBlock +
      bookBlock +
      (letterBlock || bookBlock ? "<br>" : "") +
      colorSection(
        isFR
          ? `<strong>Écrire maintenant.</strong> Chaque mot que vous ajoutez devient une partie permanente de son histoire.`
          : `<strong>Write now.</strong> Every word you add becomes a permanent part of their story.`,
        BRAND.accent,
        "#FDFAF5"
      ) +
      ctaButton("https://everypaw.app/dashboard", isFR ? "Écrire une entrée d'anniversaire" : "Write a birthday entry"),
      unsubscribeLink(unsubscribeUrl, isFR ? "Se désabonner des rappels" : "Unsubscribe from reminders"),
      isFR ? "fr" : "en",
      isFR ? "C'est un jour à marquer dans le journal." : "A day worth writing down.",
    );

    await sendEmail({
      unsubscribeUrl: oneClickUnsubscribeUrl(unsubscribeUrl),
      from: "Everypaw <hello@everypaw.app>",
      to: profile.email,
      subject,
      html,
    });

    sent++;
  }

  return NextResponse.json({ sent, letters });
}

import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { sendEmail } from "@/lib/resend";
import { baseLayout, hero, heading, paragraph, ctaButton, heroSection, quote, unsubscribeLink, oneClickUnsubscribeUrl, divider, colorSection, BRAND } from "@/lib/email-templates";
import { estimateBookPages } from "@/lib/book";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

// ── Email helpers (thin wrappers over the shared template primitives) ──────────

function btn(url: string, label: string): string {
  return ctaButton(url, escapeHtml(label));
}

function wrap(body: string, unsubscribeUrl: string, unsubscribeLabel: string, lang: "fr" | "en" = "fr", preheaderText = ""): string {
  return baseLayout(body, unsubscribeLink(unsubscribeUrl, unsubscribeLabel), lang, preheaderText);
}

function h1(text: string): string {
  return heading(escapeHtml(text));
}

function p(text: string): string {
  return paragraph(escapeHtml(text));
}

function extract2Sentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 2).join(" ").trim();
}

// ── Counters ──────────────────────────────────────────────────────────────────

interface PalierStats { sent: number; skipped: number; errors: number }

// ── Locale helper ─────────────────────────────────────────────────────────────

function profileLocale(language: string | null): Locale {
  if (language?.startsWith("en")) return "en";
  return "fr";
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();

  const now = new Date();

  // Time windows, [start, end) so a profile is targeted exactly once per palier
  const ms = (h: number) => h * 3_600_000;
  const d1Start  = new Date(now.getTime() - ms(48)).toISOString();
  const d1End    = new Date(now.getTime() - ms(24)).toISOString();
  const d7Start  = new Date(now.getTime() - 8 * 86_400_000).toISOString();
  const d7End    = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const d30Start = new Date(now.getTime() - 31 * 86_400_000).toISOString();
  const d30End   = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const d1Stats:  PalierStats = { sent: 0, skipped: 0, errors: 0 };
  const d7Stats:  PalierStats = { sent: 0, skipped: 0, errors: 0 };
  const d30Stats: PalierStats = { sent: 0, skipped: 0, errors: 0 };

  // ── D1 ───────────────────────────────────────────────────────────────────────

  const { data: d1Profiles } = await supabase
    .from("profiles")
    .select("id, email, unsubscribe_token, plan, language")
    .gte("created_at", d1Start)
    .lt("created_at", d1End)
    .eq("email_reminders", true);

  for (const profile of d1Profiles ?? []) {
    if (!profile.email) { d1Stats.skipped++; continue; }

    const { data: existing } = await supabase
      .from("events_log")
      .select("id")
      .eq("user_id", profile.id)
      .eq("event_type", "retention_d1")
      .maybeSingle();

    if (existing) { d1Stats.skipped++; continue; }

    // Fetch pets (alive first)
    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, deceased_at, photo_url")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true });

    const alivePets = (pets ?? []).filter(p => !p.deceased_at);
    if ((pets ?? []).length > 0 && alivePets.length === 0) { d1Stats.skipped++; continue; }

    const locale = profileLocale(profile.language);
    const t = getTranslations(locale).retention_emails;
    const re = getTranslations(locale).retention_emails;

    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    let subject = "";
    let body = "";

    try {
      if (alivePets.length === 0) {
        // No pet yet, encourage creation
        subject = re.d1_subject_no_pet;
        body = wrap(
          hero({ illustration: "paw", emoji: "🐾", heading: re.d1_no_pet_title }) +
          p(re.d1_no_pet_body) +
          divider() +
          colorSection(
            locale === "en"
              ? "<strong>Get started in seconds.</strong> Add your first pet and start building their story today."
              : "<strong>Commencez en quelques secondes.</strong> Ajoutez votre premier animal et commencez à construire son histoire dès aujourd'hui.",
            BRAND.accent,
            "#FDFAF5"
          ) +
          btn("https://everypaw.app/dashboard/pets/new", re.d1_no_pet_cta),
          unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
          locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
        );
      } else {
        const firstPet = alivePets[0];
        const petNameSafe = escapeHtml(firstPet.name);

        const { count: entryCount } = await supabase
          .from("entries")
          .select("*", { count: "exact", head: true })
          .eq("pet_id", firstPet.id);

        const ec = entryCount ?? 0;

        if (ec === 0) {
          subject = re.d1_subject_no_entry.replace("{petName}", firstPet.name);
          body = wrap(
            hero({
              photoUrl: firstPet.photo_url,
              photoAlt: firstPet.name,
              illustration: "paw",
              emoji: "🐾",
              heading: re.d1_no_entry_title,
            }) +
            p(re.d1_no_entry_body) +
            divider() +
            colorSection(
              locale === "en"
                ? `<strong>Start ${petNameSafe}'s story.</strong> Your first entry will be the foundation of their digital journal.`
                : `<strong>Commencez l'histoire de ${petNameSafe}.</strong> Votre première entrée sera le fondement de son journal numérique.`,
              BRAND.accent,
              "#FDFAF5"
            ) +
            btn(`https://everypaw.app/dashboard/pets/${firstPet.id}`, re.d1_no_entry_cta),
            unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
            locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
          );
        } else {
          const remaining = Math.max(0, 3 - ec);
          subject = re.d1_subject_entry
            .replace("{remaining}", String(remaining))
            .replace("{petName}", firstPet.name);
          body = wrap(
            hero({
              photoUrl: firstPet.photo_url,
              photoAlt: firstPet.name,
              illustration: "paw",
              emoji: "🐾",
              heading: re.d1_entry_title.replace("{remaining}", String(remaining)),
            }) +
            p(re.d1_entry_body + ", " + petNameSafe) +
            divider() +
            colorSection(
              locale === "en"
                ? "<strong>Keep the momentum.</strong> A few more entries and you'll unlock stories and prints."
                : "<strong>Continuez l'élan.</strong> Quelques entrées de plus et vous débloquerez les histoires et les impressions.",
              BRAND.accent,
              "#FDFAF5"
            ) +
            btn(`https://everypaw.app/dashboard/pets/${firstPet.id}`, re.d1_entry_cta),
            unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
            locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
          );
        }
      }

      await sendEmail({
      unsubscribeUrl: oneClickUnsubscribeUrl(unsubscribeUrl),
        from: "Everypaw <hello@everypaw.app>",
        to: profile.email,
        subject,
        html: body,
      });

      await supabase.from("events_log").insert({
        user_id: profile.id,
        event_type: "retention_d1",
        metadata: { sent_at: now.toISOString() },
      });

      d1Stats.sent++;
    } catch (err) {
      log.error("[retention-emails] D1 error for user", profile.id, err);
      d1Stats.errors++;
    }
  }

  // ── D7 ───────────────────────────────────────────────────────────────────────

  const { data: d7Profiles } = await supabase
    .from("profiles")
    .select("id, email, unsubscribe_token, plan, language")
    .gte("created_at", d7Start)
    .lt("created_at", d7End)
    .eq("email_reminders", true);

  for (const profile of d7Profiles ?? []) {
    if (!profile.email) { d7Stats.skipped++; continue; }

    const { data: existing } = await supabase
      .from("events_log")
      .select("id")
      .eq("user_id", profile.id)
      .eq("event_type", "retention_d7")
      .maybeSingle();

    if (existing) { d7Stats.skipped++; continue; }

    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, deceased_at, photo_url")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true });

    const alivePets = (pets ?? []).filter(p => !p.deceased_at);
    if (alivePets.length === 0) { d7Stats.skipped++; continue; }

    const locale = profileLocale(profile.language);
    const re = getTranslations(locale).retention_emails;

    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const firstPet = alivePets[0];

    try {
      // Check for stories
      const { data: firstStory } = await supabase
        .from("stories")
        .select("id, title, content, pet_id")
        .eq("user_id", profile.id)
        .neq("status", "draft")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      let subject = "";
      let body = "";

      if (firstStory) {
        const storyPet = alivePets.find(p => p.id === firstStory.pet_id) ?? firstPet;
        const pages = await estimateBookPages(storyPet.id);
        const excerpt = escapeHtml(extract2Sentences(firstStory.content));
        const titleSafe = escapeHtml(firstStory.title ?? storyPet.name);

        subject = re.d7_story_subject.replace("{petName}", storyPet.name);
        body = wrap(
          hero({
              photoUrl: firstPet.photo_url,
              photoAlt: firstPet.name,
              illustration: "book",
              emoji: "📖",
              heading: re.d7_story_title,
            }) +
          `<h2 style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:${BRAND.text};margin:0 0 8px;">${titleSafe}</h2>` +
          quote(excerpt) +
          divider() +
          colorSection(
            locale === "en"
              ? `<strong>Your story is ready.</strong> ${titleSafe} has grown to <strong>${pages} pages</strong> of memories waiting to be preserved.`
              : `<strong>Votre histoire est prête.</strong> ${titleSafe} a grandi à <strong>${pages} pages</strong> de souvenirs en attente de préservation.`,
            BRAND.accent,
            "#FDFAF5"
          ) +
          btn(`https://everypaw.app/dashboard/pets/${storyPet.id}?tab=stories`, re.d7_story_cta),
          unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
          locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
        );
      } else {
        // Best entry with photo
        const { data: photoEntry } = await supabase
          .from("entries")
          .select("content, photo_urls, entry_date, pet_id")
          .eq("user_id", profile.id)
          .not("photo_urls", "is", null)
          .order("entry_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const entryPet = photoEntry
          ? (alivePets.find(p => p.id === photoEntry.pet_id) ?? firstPet)
          : firstPet;

        subject = re.d7_no_story_subject;

        const photoImg = (photoEntry?.photo_urls as string[] | null)?.[0]
          ? `<img src="${escapeHtml((photoEntry!.photo_urls as string[])[0])}" alt="" style="width:100%;max-width:280px;border-radius:12px;margin-bottom:16px;display:block;" />`
          : "";

        const entryText = photoEntry?.content
          ? quote(escapeHtml(photoEntry.content.slice(0, 200)))
          : "";

        body = wrap(
          hero({
              photoUrl: firstPet.photo_url,
              photoAlt: firstPet.name,
              illustration: "plant",
              emoji: "🌿",
              heading: re.d7_no_story_title,
            }) +
          photoImg +
          entryText +
          (entryText ? divider() : "") +
          colorSection(
            locale === "en"
              ? "<strong>More entries unlock more stories.</strong> Keep adding moments and watch AI chapters emerge from your memories."
              : "<strong>Plus d'entrées déverrouillent plus d'histoires.</strong> Continuez à ajouter des moments et regardez les chapitres IA émerger de vos souvenirs.",
            BRAND.accent,
            "#FDFAF5"
          ) +
          p(re.d7_no_story_body) +
          btn(`https://everypaw.app/dashboard/pets/${entryPet.id}`, re.d7_no_story_cta),
          unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
          locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
        );
      }

      await sendEmail({
      unsubscribeUrl: oneClickUnsubscribeUrl(unsubscribeUrl),
        from: "Everypaw <hello@everypaw.app>",
        to: profile.email,
        subject,
        html: body,
      });

      await supabase.from("events_log").insert({
        user_id: profile.id,
        event_type: "retention_d7",
        metadata: { sent_at: now.toISOString() },
      });

      d7Stats.sent++;
    } catch (err) {
      log.error("[retention-emails] D7 error for user", profile.id, err);
      d7Stats.errors++;
    }
  }

  // ── D30 ──────────────────────────────────────────────────────────────────────

  const { data: d30Profiles } = await supabase
    .from("profiles")
    .select("id, email, unsubscribe_token, plan, language")
    .gte("created_at", d30Start)
    .lt("created_at", d30End)
    .eq("email_reminders", true);

  for (const profile of d30Profiles ?? []) {
    if (!profile.email) { d30Stats.skipped++; continue; }

    const { data: existing } = await supabase
      .from("events_log")
      .select("id")
      .eq("user_id", profile.id)
      .eq("event_type", "retention_d30")
      .maybeSingle();

    if (existing) { d30Stats.skipped++; continue; }

    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, deceased_at, photo_url")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: true });

    const alivePets = (pets ?? []).filter(p => !p.deceased_at);
    if (alivePets.length === 0) { d30Stats.skipped++; continue; }

    const locale = profileLocale(profile.language);
    const re = getTranslations(locale).retention_emails;

    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const firstPet = alivePets[0];
    const isPaid = profile.plan === "digital" || profile.plan === "print";

    try {
      let subject = "";
      let body = "";

      if (!isPaid) {
        // Free user, recap + soft upsell
        const { count: entryCount } = await supabase
          .from("entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id);

        const { data: photoEntries } = await supabase
          .from("entries")
          .select("photo_urls")
          .eq("user_id", profile.id)
          .not("photo_urls", "is", null);

        const ec = entryCount ?? 0;
        const photoCount = (photoEntries ?? []).reduce(
          (acc, e) => acc + ((e.photo_urls as string[] | null)?.length ?? 0),
          0,
        );

        subject = re.d30_free_subject.replace("{petName}", firstPet.name);
        body = wrap(
          hero({
              photoUrl: firstPet.photo_url,
              photoAlt: firstPet.name,
              illustration: "book",
              emoji: "📚",
              heading: re.d30_free_title.replace("{petName}", firstPet.name),
            }) +
          p(
            re.d30_free_body
              .replace("{entries}", String(ec))
              .replace("{photos}", String(photoCount))
              .replace("{petName}", firstPet.name),
          ) +
          divider() +
          colorSection(
            locale === "en"
              ? "<strong>Unlock the full power of Everypaw.</strong> Upgrade to create printed books, AI chapters, and preserve memories forever."
              : "<strong>Déverrouillez le pouvoir complet d'Everypaw.</strong> Mettez à niveau pour créer des livres imprimés, des chapitres IA et préserver les souvenirs pour toujours.",
            BRAND.accent,
            "#FDFAF5"
          ) +
          btn("https://everypaw.app/dashboard/settings", re.d30_free_cta),
          unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
          locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
        );
      } else {
        // Paid user, pages estimate + upcoming chapter date
        const pages = await estimateBookPages(firstPet.id);

        const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
        const nextDate = nextFirst.toLocaleDateString(dateLocale, { day: "numeric", month: "long" });

        subject = re.d30_paid_subject.replace("{date}", nextDate);
        body = wrap(
          hero({
              photoUrl: firstPet.photo_url,
              photoAlt: firstPet.name,
              illustration: "star",
              emoji: "✨",
              heading: re.d30_paid_title,
            }) +
          p(
            re.d30_paid_body
              .replace("{petName}", firstPet.name)
              .replace("{pages}", String(pages)),
          ) +
          divider() +
          colorSection(
            locale === "en"
              ? `<strong>Your book is growing.</strong> ${firstPet.name}'s next chapter will be added on ${nextDate}. Keep adding moments!`
              : `<strong>Votre livre grandit.</strong> Le prochain chapitre de ${firstPet.name} sera ajouté le ${nextDate}. Continuez à ajouter des moments !`,
            BRAND.accent,
            "#FDFAF5"
          ) +
          btn(`https://everypaw.app/dashboard/pets/${firstPet.id}`, re.d30_paid_cta),
          unsubscribeUrl, re.unsubscribe, locale === "en" ? "en" : "fr",
          locale === "en" ? "A small nudge from Everypaw." : "Un petit rappel d'Everypaw.",
        );
      }

      await sendEmail({
      unsubscribeUrl: oneClickUnsubscribeUrl(unsubscribeUrl),
        from: "Everypaw <hello@everypaw.app>",
        to: profile.email,
        subject,
        html: body,
      });

      await supabase.from("events_log").insert({
        user_id: profile.id,
        event_type: "retention_d30",
        metadata: { sent_at: now.toISOString(), plan: profile.plan },
      });

      d30Stats.sent++;
    } catch (err) {
      log.error("[retention-emails] D30 error for user", profile.id, err);
      d30Stats.errors++;
    }
  }

  return NextResponse.json({ d1: d1Stats, d7: d7Stats, d30: d30Stats });
}

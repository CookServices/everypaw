import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";
import { shouldShowFirstStoryNudge } from "@/lib/story";
import { baseLayout, emoji, heading, paragraph, ctaButton, unsubscribeLink } from "@/lib/email-templates";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

function profileLocale(language: string | null): Locale {
  if (language?.startsWith("en")) return "en";
  return "fr";
}

// One reminder email, sent once, to a free-plan user who's been eligible for
// their first AI chapter (3+ entries, no story yet) for 2-3 days and hasn't
// acted on the in-app nudge.
export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const resend = getResendClient();

  const now = new Date();
  const windowStart = new Date(now.getTime() - 3 * 86_400_000).toISOString();
  const windowEnd = new Date(now.getTime() - 2 * 86_400_000).toISOString();

  const { data: candidates, error: queryError } = await supabase
    .from("pets")
    .select(`
      id,
      name,
      user_id,
      profiles!inner (
        id,
        email,
        language,
        unsubscribe_token
      )
    `)
    .is("deceased_at", null)
    .eq("profiles.email_reminders", true);

  if (queryError) {
    log.error("[first-story-nudge] candidates query error:", queryError);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const pet of candidates ?? []) {
    processed++;

    const profile = (
      pet as unknown as {
        profiles: { id: string; email: string; language: string | null; unsubscribe_token: string | null };
      }
    ).profiles;

    try {
      // Window check: most recent entry created 2-3 days ago, at least 3 entries total
      const { data: recentEntries, count: entryCount } = await supabase
        .from("entries")
        .select("created_at", { count: "exact" })
        .eq("pet_id", pet.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if ((entryCount ?? 0) < 3) { skipped++; continue; }

      const mostRecentCreatedAt = recentEntries?.[0]?.created_at;
      if (!mostRecentCreatedAt || mostRecentCreatedAt < windowStart || mostRecentCreatedAt >= windowEnd) {
        skipped++;
        continue;
      }

      const eligible = await shouldShowFirstStoryNudge(supabase, pet.user_id, pet.id);
      if (!eligible) { skipped++; continue; }

      // Idempotence: one nudge email per pet, ever
      const { data: existing } = await supabase
        .from("events_log")
        .select("id")
        .eq("user_id", pet.user_id)
        .eq("pet_id", pet.id)
        .eq("event_type", "first_story_nudge_email")
        .maybeSingle();

      if (existing) { skipped++; continue; }

      if (!profile.email) { skipped++; continue; }

      const locale = profileLocale(profile.language);
      const nudge = getTranslations(locale).first_story_nudge;

      const unsubscribeUrl = profile.unsubscribe_token
        ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
        : "https://everypaw.app/dashboard";

      const subject = nudge.email_subject.replace("{petName}", pet.name);
      const body = nudge.email_body.replace("{count}", String(entryCount ?? 0)).replace("{petName}", pet.name);

      await resend.emails.send({
        from: "Everypaw <hello@everypaw.app>",
        to: profile.email,
        subject,
        html: baseLayout(
          emoji("✨") +
          heading(escapeHtml(nudge.email_title)) +
          paragraph(escapeHtml(body)) +
          ctaButton(`https://everypaw.app/dashboard/pets/${pet.id}?tab=stories`, escapeHtml(nudge.email_cta)),
          unsubscribeLink(unsubscribeUrl, nudge.email_unsubscribe),
          locale,
        ),
      });

      await supabase.from("events_log").insert({
        user_id: pet.user_id,
        pet_id: pet.id,
        event_type: "first_story_nudge_email",
        metadata: { sent_at: now.toISOString() },
      });

      sent++;
    } catch (err) {
      log.error(`[first-story-nudge] error for pet ${pet.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ processed, sent, skipped, failed });
}

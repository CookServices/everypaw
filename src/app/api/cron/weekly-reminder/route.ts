import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";
import { getWeeklyQuestion, currentISOWeekBounds } from "@/lib/interview";
import { baseLayout, emoji, eyebrow, quote, ctaButton, paragraph, unsubscribeLink } from "@/lib/email-templates";

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const resend = getResendClient();

  const { start: weekStart, end: weekEnd } = currentISOWeekBounds();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, language, unsubscribe_token")
    .eq("email_reminders", true);

  if (!profiles) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, species")
      .eq("user_id", profile.id)
      .is("deceased_at", null)
      .order("name", { ascending: true });

    if (!pets || pets.length === 0) continue;

    const locale = (profile.language ?? "en");
    const isFrench = locale.toLowerCase().startsWith("fr");
    const firstPet = pets[0];
    const petName = firstPet.name;
    const petNameHtml = escapeHtml(petName);

    // Weekly question, same question for every user this week
    const rawQuestion = getWeeklyQuestion(locale);
    const question = rawQuestion.replace("{petName}", petName);
    const questionHtml = escapeHtml(question);

    // Count entries added this week (non-interview, as context)
    const { count: weekCount } = await supabase
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("entry_date", weekStart)
      .lte("entry_date", weekEnd);

    const entriesCount = weekCount ?? 0;

    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const subject = isFrench
      ? `✍️ ${question}`
      : `✍️ ${question}`;

    const ctaLabel = isFrench ? `Répondre pour ${petNameHtml}` : `Answer for ${petNameHtml}`;
    const weekNote = isFrench
      ? (entriesCount > 0
        ? `Tu as déjà ajouté ${entriesCount} moment${entriesCount > 1 ? "s" : ""} cette semaine, continue !`
        : "Aucun moment ajouté cette semaine, chaque détail compte.")
      : (entriesCount > 0
        ? `You've already added ${entriesCount} moment${entriesCount > 1 ? "s" : ""} this week, keep going!`
        : "No moments added this week, every small detail matters.");
    const unsubLabel = isFrench ? "Se désabonner des rappels hebdomadaires" : "Unsubscribe from weekly reminders";

    const html = baseLayout(
      emoji("🐾") +
      eyebrow(isFrench ? "Question de la semaine" : "Question of the week") +
      quote(questionHtml) +
      ctaButton("https://everypaw.app/dashboard", ctaLabel) +
      paragraph(escapeHtml(weekNote)),
      unsubscribeLink(unsubscribeUrl, unsubLabel),
      isFrench ? "fr" : "en",
    );

    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: profile.email,
      subject,
      html,
    });

    sent++;
  }

  return NextResponse.json({ sent });
}

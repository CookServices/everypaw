import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";
import { baseLayout, emoji, heading, paragraph, quote, ctaButton, unsubscribeLink, heroSection, colorSection, divider, BRAND } from "@/lib/email-templates";

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const resend = getResendClient();

  const today = new Date();
  const currentYear = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const monthDay = `${mm}-${dd}`;

  // Fetch entries on this calendar date from any past year
  const { data: entries } = await supabase
    .from("entries")
    .select("id, pet_id, content, entry_date, user_id")
    .like("entry_date", `%-${monthDay}`)
    .lt("entry_date", `${currentYear}-01-01`);

  if (!entries || entries.length === 0) return NextResponse.json({ sent: 0 });

  // Group entries by user_id
  const byUser: Record<string, typeof entries> = {};
  for (const e of entries) {
    if (!byUser[e.user_id]) byUser[e.user_id] = [];
    byUser[e.user_id].push(e);
  }

  // Fetch eligible profiles (reminders on)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, language, unsubscribe_token")
    .eq("email_reminders", true)
    .in("id", Object.keys(byUser));

  if (!profiles) return NextResponse.json({ sent: 0 });

  // Fetch pet names once
  const petIds = Array.from(new Set(entries.map(e => e.pet_id)));
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .in("id", petIds);
  const petMap: Record<string, string> = {};
  for (const p of pets ?? []) petMap[p.id] = p.name;

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    const isFR = (profile.language ?? "en").toLowerCase().startsWith("fr");
    const userEntries = byUser[profile.id] ?? [];
    if (userEntries.length === 0) continue;

    // Pick the first entry to feature (most recent past year)
    const featured = userEntries.sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0];
    const petName = escapeHtml(petMap[featured.pet_id] ?? (isFR ? "votre animal" : "your pet"));
    const yearsAgo = currentYear - parseInt(featured.entry_date.slice(0, 4), 10);
    const snippet = escapeHtml(featured.content.trim().slice(0, 120)) + (featured.content.length > 120 ? "…" : "");
    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const subject = isFR
      ? `🐾 Il y a ${yearsAgo} an${yearsAgo > 1 ? "s" : ""}, ${petName}…`
      : `🐾 ${yearsAgo} year${yearsAgo > 1 ? "s" : ""} ago, ${petName}…`;

    const dateLabel = new Date(featured.entry_date + "T12:00:00").toLocaleDateString(
      isFR ? "fr-FR" : "en-US",
      { day: "numeric", month: "long", year: "numeric" },
    );
    const printPromo = isFR
      ? `Ces souvenirs méritent d'être dans un livre. <a href="https://everypaw.app/dashboard" style="color:#C8813A;">Découvrez Everypaw Print</a>`
      : `These memories deserve to be in a book. <a href="https://everypaw.app/dashboard" style="color:#C8813A;">Discover Everypaw Print</a>`;

    const html = baseLayout(
      heroSection(
        "🐾",
        isFR
          ? `Il y a ${yearsAgo} an${yearsAgo > 1 ? "s" : ""}, ${petName}…`
          : `${yearsAgo} year${yearsAgo > 1 ? "s" : ""} ago, ${petName}…`
      ) +
      paragraph(dateLabel) +
      quote(`"${snippet}"`) +
      divider() +
      colorSection(
        isFR
          ? `<strong>Ces souvenirs méritent d'être conservés.</strong> Créez un livre photo imprimé de ${petName} et gardez ces moments à jamais.`
          : `<strong>These memories deserve to be preserved.</strong> Create a printed photo book for ${petName} and keep these moments forever.`,
        BRAND.accent,
        "#FDFAF5"
      ) +
      ctaButton("https://everypaw.app/dashboard", isFR ? `Voir le journal de ${petName}` : `See ${petName}'s journal`),
      `${printPromo}<br />${unsubscribeLink(unsubscribeUrl, isFR ? "Se désabonner des rappels" : "Unsubscribe from reminders")}`,
      isFR ? "fr" : "en",
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

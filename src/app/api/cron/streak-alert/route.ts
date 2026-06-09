import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyCronRoute } from "@/lib/auth";
import { getResendClient } from "@/lib/resend";

export async function GET(req: Request) {
  const authError = verifyCronRoute(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  const resend = getResendClient();

  const now = new Date();
  const fourDaysAgo = new Date(now); fourDaysAgo.setDate(now.getDate() - 4);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const fourDaysAgoStr = fourDaysAgo.toISOString().slice(0, 10);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, locale, language, unsubscribe_token")
    .eq("email_reminders", true);

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0 });

  const profileIds = profiles.map(p => p.id);

  // Batch: last entry per user (entries within the streak window + a bit before)
  const { data: recentEntries } = await supabase
    .from("entries")
    .select("user_id, entry_date")
    .in("user_id", profileIds)
    .gte("entry_date", sevenDaysAgoStr)
    .lte("entry_date", fourDaysAgoStr)
    .order("entry_date", { ascending: false });

  // Batch: first live pet per user
  const { data: allPets } = await supabase
    .from("pets")
    .select("user_id, id, name")
    .in("user_id", profileIds)
    .is("deceased_at", null);

  // Build maps
  const lastEntryByUser: Record<string, string> = {};
  for (const e of recentEntries ?? []) {
    if (!lastEntryByUser[e.user_id]) lastEntryByUser[e.user_id] = e.entry_date;
  }

  const petByUser: Record<string, { id: string; name: string }> = {};
  for (const p of allPets ?? []) {
    if (!petByUser[p.user_id]) petByUser[p.user_id] = { id: p.id, name: p.name };
  }

  // Also need to exclude users whose last entry is more recent than 4 days ago
  // Fetch users with entries after fourDaysAgo to exclude them
  const { data: recentExclusions } = await supabase
    .from("entries")
    .select("user_id")
    .in("user_id", profileIds)
    .gt("entry_date", fourDaysAgoStr);

  const excludedUsers = new Set((recentExclusions ?? []).map(e => e.user_id));

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;
    if (excludedUsers.has(profile.id)) continue;

    const lastEntryDate = lastEntryByUser[profile.id];
    if (!lastEntryDate) continue;

    const pet = petByUser[profile.id];
    if (!pet) continue;

    const lastDate = new Date(lastEntryDate + "T12:00:00");
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / 864e5);

    const petName = escapeHtml(pet.name);
    const isFR = (profile.locale ?? profile.language ?? "en").toLowerCase().startsWith("fr");
    const unsubscribeUrl = profile.unsubscribe_token
      ? `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`
      : "https://everypaw.app/dashboard";

    const subject = isFR
      ? `🐾 ${daysSince} jours sans entrée pour ${petName}`
      : `🐾 ${daysSince} days without an entry for ${petName}`;

    const html = isFR ? `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 12px;">Ça fait ${daysSince} jours…</h1>
        <p style="font-size: 15px; line-height: 1.7; color: #7A5C44; margin: 0 0 24px;">
          ${petName} a vécu plein de choses depuis votre dernière entrée. Pas besoin d'un grand moment —
          une phrase ou une photo, et le souvenir est sauvé pour toujours.
        </p>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Ajouter un moment →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          <a href="${unsubscribeUrl}" style="color: #9A8070;">Se désabonner des rappels</a>
        </p>
      </div>
    ` : `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 12px;">It's been ${daysSince} days…</h1>
        <p style="font-size: 15px; line-height: 1.7; color: #7A5C44; margin: 0 0 24px;">
          ${petName} has been up to so much since your last entry. It doesn't need to be big —
          one sentence or a quick photo, and the memory is saved forever.
        </p>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Add a moment →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          <a href="${unsubscribeUrl}" style="color: #9A8070;">Unsubscribe from reminders</a>
        </p>
      </div>
    `;

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

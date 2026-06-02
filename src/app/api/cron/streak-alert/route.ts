import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServiceSupabase } from "@/lib/plan";
import { escapeHtml } from "@/lib/html";
import { verifyBearer } from "@/lib/auth";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("CRON_SECRET is not set or too short (min 32 chars)");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!verifyBearer(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const now = new Date();
  // Users who last wrote between 4 and 7 days ago — streak is at risk
  const fourDaysAgo = new Date(now); fourDaysAgo.setDate(now.getDate() - 4);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, locale, language, unsubscribe_token")
    .eq("email_reminders", true);

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    // Check last entry date for this user
    const { data: lastEntries } = await supabase
      .from("entries")
      .select("entry_date")
      .eq("user_id", profile.id)
      .order("entry_date", { ascending: false })
      .limit(1);

    if (!lastEntries || lastEntries.length === 0) continue;

    const lastEntryDate = new Date(lastEntries[0].entry_date + "T12:00:00");
    // Only alert if last entry was between 4 and 7 days ago
    if (lastEntryDate > fourDaysAgo || lastEntryDate < sevenDaysAgo) continue;

    const daysSince = Math.floor((now.getTime() - lastEntryDate.getTime()) / 864e5);

    const { data: pets } = await supabase
      .from("pets")
      .select("id, name")
      .eq("user_id", profile.id)
      .is("deceased_at", null)
      .limit(3);

    if (!pets || pets.length === 0) continue;

    const petName = escapeHtml(pets[0].name);
    const isFR = (profile.locale ?? profile.language ?? "en").toLowerCase().startsWith("fr");
    const unsubscribeUrl = `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`;

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

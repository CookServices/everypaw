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
    .select("id, email, locale, language, unsubscribe_token")
    .eq("email_reminders", true)
    .in("id", Object.keys(byUser));

  if (!profiles) return NextResponse.json({ sent: 0 });

  // Fetch pet names once
  const petIds = [...new Set(entries.map(e => e.pet_id))];
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .in("id", petIds);
  const petMap: Record<string, string> = {};
  for (const p of pets ?? []) petMap[p.id] = p.name;

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    const isFR = (profile.locale ?? profile.language ?? "en").toLowerCase().startsWith("fr");
    const userEntries = byUser[profile.id] ?? [];
    if (userEntries.length === 0) continue;

    // Pick the first entry to feature (most recent past year)
    const featured = userEntries.sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0];
    const petName = escapeHtml(petMap[featured.pet_id] ?? (isFR ? "votre animal" : "your pet"));
    const yearsAgo = currentYear - parseInt(featured.entry_date.slice(0, 4), 10);
    const snippet = escapeHtml(featured.content.trim().slice(0, 120)) + (featured.content.length > 120 ? "…" : "");
    const unsubscribeUrl = `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`;

    const subject = isFR
      ? `🐾 Il y a ${yearsAgo} an${yearsAgo > 1 ? "s" : ""}, ${petName}…`
      : `🐾 ${yearsAgo} year${yearsAgo > 1 ? "s" : ""} ago, ${petName}…`;

    const html = isFR ? `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Il y a ${yearsAgo} an${yearsAgo > 1 ? "s" : ""}, ${petName}…</h1>
        <p style="font-size: 14px; color: #7A5C44; margin: 0 0 20px; font-family: sans-serif;">
          ${new Date(featured.entry_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div style="background: #F7F2EA; border-left: 3px solid #C8813A; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 0 0 24px; font-style: italic; font-size: 15px; line-height: 1.7; color: #3D2B1F;">
          "${snippet}"
        </div>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Voir le journal de ${petName} →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          Ces souvenirs méritent d'être dans un livre. <a href="https://everypaw.app/dashboard" style="color: #C8813A;">Découvrez Everypaw Print →</a><br />
          <a href="${unsubscribeUrl}" style="color: #9A8070;">Se désabonner des rappels</a>
        </p>
      </div>
    ` : `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
        <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">${yearsAgo} year${yearsAgo > 1 ? "s" : ""} ago, ${petName}…</h1>
        <p style="font-size: 14px; color: #7A5C44; margin: 0 0 20px; font-family: sans-serif;">
          ${new Date(featured.entry_date + "T12:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div style="background: #F7F2EA; border-left: 3px solid #C8813A; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 0 0 24px; font-style: italic; font-size: 15px; line-height: 1.7; color: #3D2B1F;">
          "${snippet}"
        </div>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          See ${petName}'s journal →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          These memories deserve to be in a book. <a href="https://everypaw.app/dashboard" style="color: #C8813A;">Discover Everypaw Print →</a><br />
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

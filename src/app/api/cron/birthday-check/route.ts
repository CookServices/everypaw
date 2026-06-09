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

  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  // Match pets whose birthdate ends in -MM-DD (any year)
  const { data: pets } = await supabase
    .from("pets")
    .select("id, user_id, name, species, birthdate")
    .like("birthdate", `%-${mm}-${dd}`)
    .is("deceased_at", null);

  if (!pets || pets.length === 0) return NextResponse.json({ sent: 0 });

  const userIds = Array.from(new Set(pets.map(p => p.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, locale, language, unsubscribe_token")
    .eq("email_reminders", true)
    .in("id", userIds);

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0 });

  const profileMap: Record<string, typeof profiles[number]> = {};
  for (const p of profiles) profileMap[p.id] = p;

  let sent = 0;

  for (const pet of pets) {
    const profile = profileMap[pet.user_id];
    if (!profile?.email) continue;

    const isFR = (profile.locale ?? profile.language ?? "en").toLowerCase().startsWith("fr");
    const petName = escapeHtml(pet.name);
    const currentYear = today.getFullYear();
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

    const html = isFR ? `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 36px; margin: 0 0 8px;">🎂</p>
        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">
          Joyeux anniversaire, ${petName}${ageLabel ? ` — ${ageLabel}` : ""} !
        </h1>
        <p style="font-size: 15px; line-height: 1.7; color: #7A5C44; margin: 0 0 24px;">
          C'est une belle occasion de noter ce moment dans son journal. Décrivez comment ${petName} est aujourd'hui,
          ce qu'il ou elle aime, ce qui a changé cette année — dans quelques ans, vous serez heureux de l'avoir noté.
        </p>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Écrire une entrée d'anniversaire →
        </a>
        <p style="font-size: 11px; color: #9A8070; margin-top: 32px; font-family: sans-serif; line-height: 1.5;">
          <a href="${unsubscribeUrl}" style="color: #9A8070;">Se désabonner des rappels</a>
        </p>
      </div>
    ` : `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
        <p style="font-size: 36px; margin: 0 0 8px;">🎂</p>
        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">
          Happy birthday, ${petName}${ageLabel ? ` — ${ageLabel}` : ""} !
        </h1>
        <p style="font-size: 15px; line-height: 1.7; color: #7A5C44; margin: 0 0 24px;">
          Today is a perfect day to add a birthday entry to ${petName}'s journal. Describe how they are right now,
          what they love, what's changed this year — you'll be so glad you wrote it down.
        </p>
        <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 14px; font-weight: 500;">
          Write a birthday entry →
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

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, unsubscribe_token")
    .eq("email_reminders", true);

  if (!profiles) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) continue;

    const { data: pets } = await supabase
      .from("pets")
      .select("id, name, species")
      .eq("user_id", profile.id);

    if (!pets || pets.length === 0) continue;

    const { data: recentEntries } = await supabase
      .from("entries")
      .select("content, entry_date, pet_id")
      .eq("user_id", profile.id)
      .gte("created_at", oneWeekAgo.toISOString())
      .order("entry_date", { ascending: false })
      .limit(5);

    const petNames = pets.map(p => p.name).join(", ");
    const entriesCount = recentEntries?.length || 0;
    const unsubscribeUrl = `https://everypaw.app/unsubscribe?token=${profile.unsubscribe_token}`;

    await resend.emails.send({
      from: "Everypaw <hello@everypaw.app>",
      to: profile.email,
      subject: `🐾 ${petNames} misses you this week`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #3D2B1F;">
          <p style="font-size: 28px; margin: 0 0 8px;">🐾</p>
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">This week in ${petNames}'s life</h1>
          ${entriesCount > 0
            ? `<p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 24px;">You added ${entriesCount} moment${entriesCount > 1 ? "s" : ""} this week — keep going! Every entry builds the story.</p>`
            : `<p style="font-size: 16px; line-height: 1.6; color: #7A5C44; margin: 0 0 24px;">No entries this week yet. What did ${petNames} get up to? Even a small moment is worth remembering.</p>`
          }
          <a href="https://everypaw.app/dashboard" style="display: inline-block; background: #C8813A; color: #FDFAF5; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-family: sans-serif; font-size: 15px; font-weight: 500;">Add this week's moments →</a>
          <p style="font-size: 12px; color: #7A5C44; margin-top: 32px; font-family: sans-serif;">
            You're receiving this because you have an Everypaw account. 
            <a href="${unsubscribeUrl}" style="color: #C8813A;">Unsubscribe from weekly reminders</a>
          </p>
        </div>
      `,
    });

    sent++;
  }

  return NextResponse.json({ sent });
}

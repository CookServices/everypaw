import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();
  const uid = user.id;

  const [
    { data: profile },
    { data: pets },
    { data: entries },
    { data: stories },
    { data: milestones },
    { data: bookConfigs },
  ] = await Promise.all([
    db.from("profiles").select("id, email, full_name, plan, is_premium, book_credits, email_reminders, onboarding_completed, created_at").eq("id", uid).single(),
    db.from("pets").select("id, name, species, breed, birthdate, bio, deceased_at, memorial_message, created_at").eq("user_id", uid),
    db.from("entries").select("id, pet_id, content, photo_urls, mood, tags, entry_date, created_at").eq("user_id", uid).order("entry_date", { ascending: false }),
    db.from("stories").select("id, pet_id, title, content, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
    db.from("milestones").select("id, pet_id, type, title, achieved_at, created_at").eq("user_id", uid),
    db.from("book_configs").select("id, pet_id, name, status, theme, custom_title, year_filter, dedication_text, page_count, created_at").eq("user_id", uid),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    profile,
    pets: pets ?? [],
    journal_entries: entries ?? [],
    ai_stories: stories ?? [],
    milestones: milestones ?? [],
    book_configs: bookConfigs ?? [],
  };

  const filename = `everypaw-data-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

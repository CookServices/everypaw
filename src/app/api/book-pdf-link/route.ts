import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";
import { generatePdfToken } from "@/lib/pdf-token";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_PLANS = ["digital", "print"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Plan check
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile?.plan || !ALLOWED_PLANS.includes(profile.plan)) {
    return NextResponse.json({ error: "Plan upgrade required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { petId, lang, year, dedication, theme, customTitle, storyIds, coverPhoto, layouts } = body;

  if (!petId || !UUID_REGEX.test(petId)) {
    return NextResponse.json({ error: "Invalid petId" }, { status: 400 });
  }

  // Ownership check
  const { data: pet } = await getServiceSupabase()
    .from("pets")
    .select("id, name")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  const { token, expires } = generatePdfToken(petId);

  const params = new URLSearchParams({
    petId,
    token,
    expires: expires.toString(),
    download: "1",
  });

  if (lang) params.set("lang", lang);
  if (year) params.set("year", String(year));
  if (dedication) params.set("dedication", encodeURIComponent(dedication));
  if (theme) params.set("theme", theme);
  if (customTitle) params.set("customTitle", encodeURIComponent(customTitle));
  if (storyIds?.length) params.set("storyIds", storyIds.join(","));
  if (coverPhoto) params.set("coverPhoto", encodeURIComponent(coverPhoto));
  if (layouts && Object.keys(layouts).length) params.set("layouts", JSON.stringify(layouts));

  const origin = new URL(req.url).origin;
  const url = `${origin}/api/book-pdf?${params.toString()}`;

  return NextResponse.json({ url, filename: `Everypaw-${pet.name}.pdf` });
}

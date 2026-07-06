import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/plan";
import { generatePdfToken } from "@/lib/pdf-token";

import { UUID_REGEX } from "@/lib/validation";
const ALLOWED_PLANS = ["digital", "print"];
const VALID_LANGS = ["en", "fr"];
const VALID_THEMES = ["classic", "noir", "forest", "ocean", "rose"];
const VALID_LAYOUTS = ["classic", "photo_hero", "split", "text_only"];
const MAX_DEDICATION = 500;
const MAX_CUSTOM_TITLE = 60;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

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

  // Validate optional params
  if (lang !== undefined && !VALID_LANGS.includes(lang)) {
    return NextResponse.json({ error: "Invalid lang" }, { status: 400 });
  }
  if (year !== undefined) {
    const y = Number(year);
    if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  }
  if (dedication !== undefined && (typeof dedication !== "string" || dedication.length > MAX_DEDICATION)) {
    return NextResponse.json({ error: "Dedication too long" }, { status: 400 });
  }
  if (theme !== undefined && !VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }
  if (customTitle !== undefined && (typeof customTitle !== "string" || customTitle.length > MAX_CUSTOM_TITLE)) {
    return NextResponse.json({ error: "Custom title too long" }, { status: 400 });
  }
  if (storyIds !== undefined) {
    if (!Array.isArray(storyIds) || storyIds.some((id: unknown) => typeof id !== "string" || !UUID_REGEX.test(id))) {
      return NextResponse.json({ error: "Invalid storyIds" }, { status: 400 });
    }
  }
  if (coverPhoto !== undefined && coverPhoto !== null && coverPhoto !== "") {
    try {
      const parsed = new URL(coverPhoto);
      if (parsed.protocol !== "https:") throw new Error();
    } catch {
      return NextResponse.json({ error: "Invalid coverPhoto URL" }, { status: 400 });
    }
  }
  if (layouts !== undefined && layouts !== null) {
    if (typeof layouts !== "object" || Array.isArray(layouts)) {
      return NextResponse.json({ error: "Invalid layouts" }, { status: 400 });
    }
    for (const v of Object.values(layouts)) {
      if (!VALID_LAYOUTS.includes(v as string)) {
        return NextResponse.json({ error: "Invalid layout value" }, { status: 400 });
      }
    }
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

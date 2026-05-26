import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validatePdfToken } from "@/lib/pdf-token";
import { escapeHtml } from "@/lib/html";
import { calcPageCount } from "@/lib/book";

export const dynamic = "force-dynamic";

const VALID_LANGS = ["en", "fr"] as const;
type Lang = typeof VALID_LANGS[number];
const MAX_DEDICATION_LENGTH = 500;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_CUSTOM_TITLE_LENGTH = 60;

const COVER_THEMES = {
  classic: { bg: "#3D2B1F", title: "#F7C27A", accent: "#C8813A", back: "#C8813A" },
  noir:    { bg: "#1A1A1E", title: "#F0EEE8", accent: "#B8AFA0", back: "#2C2C2E" },
  forest:  { bg: "#1B3028", title: "#AACCA0", accent: "#6A9E78", back: "#2A4A38" },
  ocean:   { bg: "#152040", title: "#A8C8E8", accent: "#5880B8", back: "#1E3060" },
  rose:    { bg: "#3A1525", title: "#F0B8C8", accent: "#C87890", back: "#8A3050" },
} as const;
type ThemeId = keyof typeof COVER_THEMES;
const VALID_THEMES = Object.keys(COVER_THEMES) as ThemeId[];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

// Escape a URL for use inside a CSS url('...') value
function safeCssUrl(url: string): string {
  return safeUrl(url).replace(/'/g, "%27");
}

const STRINGS = {
  en: {
    coverTitle: "The Life of",
    brand: "An Everypaw Book",
    chapter: "Chapter",
    moments: "Moments",
    dedication: "A message from your family",
    noStories: (name: string) => `No stories yet. Add journal entries and generate ${name}'s first story.`,
    backTitle: "Every moment remembered.",
    backText: "This book was created with love using Everypaw — the AI journal that turns your pet's daily moments into stories worth keeping forever.",
    birthdate: (d: Date) => `Born ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
  },
  fr: {
    coverTitle: "La Vie de",
    brand: "Un Livre Everypaw",
    chapter: "Chapitre",
    moments: "Souvenirs",
    dedication: "Un message de votre famille",
    noStories: (name: string) => `Aucune histoire pour l'instant. Ajoutez des entrées et générez la première histoire de ${name}.`,
    backTitle: "Chaque moment, à jamais.",
    backText: "Ce livre a été créé avec amour grâce à Everypaw — le journal IA qui transforme les moments du quotidien de votre animal en histoires à garder pour toujours.",
    birthdate: (d: Date) => `Né(e) le ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
  },
};

async function buildHtml(params: {
  petId: string;
  lang: Lang;
  storyIdsParam: string | null;
  dedication: string;
  yearFilter: number | null;
  coverPhotoParam: string | null;
  theme: ThemeId;
  customTitle: string | null;
}): Promise<NextResponse> {
  const { petId, lang, storyIdsParam, dedication, yearFilter, coverPhotoParam, theme, customTitle } = params;
  const supabase = getServiceClient();
  const s = STRINGS[lang] ?? STRINGS.en;
  const colors = COVER_THEMES[theme] ?? COVER_THEMES.classic;

  const [{ data: pet }, { data: allStories }, { data: allEntries }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    supabase.from("stories").select("*").eq("pet_id", petId).order("created_at", { ascending: true }),
    supabase.from("entries").select("*").eq("pet_id", petId).order("entry_date", { ascending: true }),
  ]);

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  let stories = allStories ?? [];
  if (storyIdsParam) {
    const ids = storyIdsParam.split(",").filter(Boolean);
    stories = stories.filter(story => ids.includes(story.id));
  }
  if (yearFilter) {
    stories = stories.filter(story => {
      const d = new Date(story.period_start ?? story.created_at);
      return d.getFullYear() === yearFilter;
    });
  }

  const entries = yearFilter
    ? (allEntries ?? []).filter(e => new Date(e.entry_date).getFullYear() === yearFilter)
    : (allEntries ?? []);

  const photosWithEntries = entries.filter(e => e.photo_urls?.length > 0).slice(0, 6);
  const hasPhotos = photosWithEntries.length > 0;
  const hasDedication = dedication.trim().length > 0;

  const birthdateHtml = pet.birthdate
    ? `<div class="cover-subtitle">${escapeHtml(s.birthdate(new Date(pet.birthdate)))}</div>`
    : "";

  const coverCssUrl = coverPhotoParam ? safeCssUrl(coverPhotoParam) : "";
  const coverStyle = coverCssUrl
    ? `background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url('${coverCssUrl}') center/cover no-repeat;`
    : `background: ${colors.bg};`;
  const coverTitleHtml = customTitle
    ? escapeHtml(customTitle)
    : `${escapeHtml(s.coverTitle)}<br>${escapeHtml(pet.name)}`;

  const dedicationPage = hasDedication
    ? `
  <div class="dedication">
    <div class="dedication-label">${escapeHtml(s.dedication)}</div>
    <div class="dedication-text">${escapeHtml(dedication).replace(/\n/g, "<br>")}</div>
  </div>
  `
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', sans-serif; background: #F7F2EA; color: #3D2B1F; }
    .cover { width: 100%; min-height: 100vh; ${coverStyle} display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 3rem; page-break-after: always; }
    .cover-paw { font-size: 4rem; margin-bottom: 2rem; }
    .cover-title { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 600; color: ${colors.title}; line-height: 1.2; margin-bottom: 1rem; }
    .cover-subtitle { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.25rem; color: rgba(247,242,234,.6); margin-bottom: 3rem; }
    .cover-line { width: 60px; height: 2px; background: ${colors.accent}; margin: 0 auto 3rem; }
    .cover-brand { font-size: .875rem; color: rgba(247,242,234,.4); letter-spacing: .1em; text-transform: uppercase; }
    .dedication { padding: 4rem 3rem; page-break-after: always; background: #F7F2EA; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; }
    .dedication-label { font-size: .75rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: ${colors.accent}; margin-bottom: 1.5rem; }
    .dedication-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.15rem; line-height: 1.85; color: #3D2B1F; max-width: 480px; }
    .chapter { padding: 4rem 3rem; page-break-after: always; background: #FDFAF5; }
    .chapter-num { font-size: .75rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: ${colors.accent}; margin-bottom: 1rem; }
    .chapter-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 600; color: #3D2B1F; margin-bottom: 2rem; line-height: 1.3; }
    .chapter-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.05rem; line-height: 1.9; color: #3D2B1F; }
    .photo-page { padding: 2rem; background: #F7F2EA; page-break-after: always; }
    .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .photo-grid img { width: 100%; height: 220px; object-fit: cover; border-radius: 12px; }
    .photo-caption { font-size: .8rem; color: #7A5C44; margin-top: .5rem; font-style: italic; }
    .back-cover { width: 100%; min-height: 100vh; background: ${colors.back}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem; }
    .back-cover-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #FDFAF5; margin-bottom: 1rem; }
    .back-cover-text { font-size: .9rem; color: rgba(253,250,245,.7); max-width: 360px; line-height: 1.7; }
  </style>
</head>
<body>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-paw">🐾</div>
    <div class="cover-title">${coverTitleHtml}</div>
    ${birthdateHtml}
    <div class="cover-line"></div>
    <div class="cover-brand">${escapeHtml(s.brand)}</div>
  </div>

  <!-- Dedication page -->
  ${dedicationPage}

  <!-- Stories as chapters -->
  ${stories.length > 0 ? stories.map((story, i) => `
  <div class="chapter">
    <div class="chapter-num">${escapeHtml(s.chapter)} ${i + 1}</div>
    <div class="chapter-title">${escapeHtml(story.title || `${pet.name}'s Story`)}</div>
    <div class="chapter-text">${escapeHtml(story.content).replace(/\n/g, "<br>")}</div>
  </div>
  `).join("") : `
  <div class="chapter">
    <div class="chapter-num">${escapeHtml(s.chapter)} 1</div>
    <div class="chapter-title">The story begins…</div>
    <div class="chapter-text" style="font-style: normal; color: #7A5C44; font-size: .95rem;">
      ${escapeHtml(s.noStories(pet.name))}
    </div>
  </div>
  `}

  <!-- Photos page -->
  ${hasPhotos ? `
  <div class="photo-page">
    <div class="chapter-num" style="margin-bottom: 1.5rem;">${escapeHtml(s.moments)}</div>
    <div class="photo-grid">
      ${photosWithEntries.flatMap(e => e.photo_urls.slice(0, 1)).map((url: string) => `
        <div>
          ${safeUrl(url) ? `<img src="${safeUrl(url)}" alt="" />` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  <!-- Back cover -->
  <div class="back-cover">
    <div class="back-cover-title">${escapeHtml(s.backTitle)}</div>
    <div class="back-cover-text">${escapeHtml(s.backText)}</div>
    <div style="margin-top: 2rem; font-size: .8rem; color: rgba(253,250,245,.5); letter-spacing: .1em; text-transform: uppercase;">everypaw.app</div>
  </div>

</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// GET — called by Gelato's servers; requires a short-lived signed token
export async function GET(req: Request) {
  const url = new URL(req.url);
  const petId = url.searchParams.get("petId");

  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });

  const token = url.searchParams.get("token");
  const expires = url.searchParams.get("expires");
  if (!token || !validatePdfToken(petId, token, expires)) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  // Validate lang
  const langParam = url.searchParams.get("lang");
  const lang: Lang = VALID_LANGS.includes(langParam as Lang) ? (langParam as Lang) : "en";

  // Validate year
  const yearParam = url.searchParams.get("year");
  let yearFilter: number | null = null;
  if (yearParam) {
    yearFilter = parseInt(yearParam, 10);
    if (isNaN(yearFilter) || yearFilter < MIN_YEAR || yearFilter > MAX_YEAR) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  }

  // Validate dedication length
  const dedicationRaw = url.searchParams.get("dedication");
  const dedication = dedicationRaw ? decodeURIComponent(dedicationRaw) : "";
  if (dedication.length > MAX_DEDICATION_LENGTH) {
    return NextResponse.json({ error: "Dedication too long" }, { status: 400 });
  }

  const themeParam = url.searchParams.get("theme");
  const theme: ThemeId = VALID_THEMES.includes(themeParam as ThemeId) ? (themeParam as ThemeId) : "classic";

  const customTitleRaw = url.searchParams.get("customTitle");
  const customTitle = customTitleRaw
    ? decodeURIComponent(customTitleRaw).slice(0, MAX_CUSTOM_TITLE_LENGTH)
    : null;

  return buildHtml({
    petId,
    lang,
    storyIdsParam: url.searchParams.get("storyIds"),
    dedication,
    yearFilter,
    coverPhotoParam: url.searchParams.get("coverPhoto")
      ? decodeURIComponent(url.searchParams.get("coverPhoto")!)
      : null,
    theme,
    customTitle,
  });
}

// POST — called from the dashboard in-app preview; requires an authenticated session
export async function POST(req: Request) {
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { petId?: string; lang?: string; storyIds?: string; dedication?: string; year?: number; coverPhoto?: string; theme?: string; customTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { petId, lang, storyIds, dedication, year, coverPhoto, theme, customTitle } = body;
  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });

  // Validate lang
  const validLang: Lang = VALID_LANGS.includes(lang as Lang) ? (lang as Lang) : "en";

  // Validate year
  if (year !== undefined && year !== null) {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  }

  // Validate dedication length
  if (dedication && dedication.length > MAX_DEDICATION_LENGTH) {
    return NextResponse.json({ error: "Dedication too long" }, { status: 400 });
  }

  // Validate theme
  const validTheme: ThemeId = VALID_THEMES.includes(theme as ThemeId) ? (theme as ThemeId) : "classic";

  // Sanitize customTitle
  const validCustomTitle = typeof customTitle === "string"
    ? customTitle.slice(0, MAX_CUSTOM_TITLE_LENGTH)
    : null;

  // Verify the authenticated user owns this pet
  const supabase = getServiceClient();
  const { data: pet } = await supabase.from("pets").select("user_id").eq("id", petId).single();
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return buildHtml({
    petId,
    lang: validLang,
    storyIdsParam: storyIds ?? null,
    dedication: dedication ?? "",
    yearFilter: year ?? null,
    coverPhotoParam: coverPhoto ?? null,
    theme: validTheme,
    customTitle: validCustomTitle,
  });
}

import { NextResponse } from "next/server";
import { validatePdfToken } from "@/lib/pdf-token";
import { escapeHtml } from "@/lib/html";
import { getServiceSupabase } from "@/lib/plan";

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_LAYOUTS = ["classic", "photo_hero", "split", "text_only"] as const;
type LayoutType = typeof VALID_LAYOUTS[number];

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
    backText: "This book was created with love using Everypaw , the AI journal that turns your pet's daily moments into stories worth keeping forever.",
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
    backText: "Ce livre a été créé avec amour grâce à Everypaw , le journal IA qui transforme les moments du quotidien de votre animal en histoires à garder pour toujours.",
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
  layouts: Record<string, LayoutType>;
}): Promise<NextResponse> {
  const { petId, lang, storyIdsParam, dedication, yearFilter, coverPhotoParam, theme, customTitle, layouts } = params;
  const supabase = getServiceSupabase();
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

  const hasDedication = dedication.trim().length > 0;

  // Associate each photo entry to its story by date range
  // entry → story with best (latest) period_start that still covers entry_date
  const entryToStoryIdx = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.photo_urls?.length) continue;
    const d = new Date(entry.entry_date);
    let bestIdx = -1;
    let bestStart: Date | null = null;
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const start = story.period_start ? new Date(story.period_start) : null;
      const end = story.period_end ? new Date(story.period_end) : null;
      if (!start || d < start) continue;
      if (end && d > end) continue;
      if (bestStart === null || start > bestStart) { bestIdx = i; bestStart = start; }
    }
    if (bestIdx >= 0) entryToStoryIdx.set(entry.id, bestIdx);
  }

  // Group photo entries by chapter index (max 4 photos per chapter)
  const chapterPhotos: (typeof entries)[] = stories.map(() => []);
  for (const entry of entries) {
    if (!entry.photo_urls?.length) continue;
    const idx = entryToStoryIdx.get(entry.id);
    if (idx !== undefined && chapterPhotos[idx].length < 4) chapterPhotos[idx].push(entry);
  }

  // Orphan entries not covered by any story period
  const orphanEntries = entries.filter(e => e.photo_urls?.length > 0 && !entryToStoryIdx.has(e.id)).slice(0, 6);
  const hasOrphanPhotos = orphanEntries.length > 0;

  // ── Page count & blank-page padding ───────────────────────────────────────
  // Gelato requires: (a) minimum 28 pages, (b) multiples of 4 (hardcover signatures).
  // We compute the exact number of pages the HTML will generate and add blank
  // pages before the back cover so the PDF always matches the declared pageCount.
  const storyPageCount = stories.length > 0 ? stories.length : 1; // placeholder chapter counts
  const actualPages =
    1 +                           // cover
    (hasDedication ? 1 : 0) +    // dedication
    storyPageCount +              // chapters (or 1 placeholder)
    (hasOrphanPhotos ? 1 : 0) +  // orphan photos page
    1;                            // back cover
  const targetPages = Math.max(28, Math.ceil(actualPages / 4) * 4);
  const blankPagesToAdd = targetPages - actualPages;
  const blankPagesHtml = blankPagesToAdd > 0
    ? Array(blankPagesToAdd).fill('<div class="blank-page"></div>').join("\n  ")
    : "";

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
    body { font-family: 'DM Sans', sans-serif; background: #B8B0A8; color: #3D2B1F; padding: 2rem 0; }
    .cover, .dedication, .chapter, .photo-page, .blank-page, .back-cover { max-width: 820px; margin: 0 auto 2rem; box-shadow: 0 4px 20px rgba(0,0,0,.22); }
    .cover { height: 100vh; overflow: hidden; page-break-after: always; ${coverStyle} display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 3rem; }
    .cover-paw { font-size: 4rem; margin-bottom: 2rem; }
    .cover-title { font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 600; color: ${colors.title}; line-height: 1.2; margin-bottom: 1rem; }
    .cover-subtitle { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.25rem; color: rgba(247,242,234,.6); margin-bottom: 3rem; }
    .cover-line { width: 60px; height: 2px; background: ${colors.accent}; margin: 0 auto 3rem; }
    .cover-brand { font-size: .875rem; color: rgba(247,242,234,.4); letter-spacing: .1em; text-transform: uppercase; }
    .dedication { padding: 4rem 3rem 5rem; page-break-after: always; background: #F7F2EA; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; text-align: center; position: relative; }
    .dedication-label { font-size: .75rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: ${colors.accent}; margin-bottom: 1.5rem; }
    .dedication-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.15rem; line-height: 1.85; color: #3D2B1F; max-width: 480px; }
    .chapter { padding: 4rem 3rem 5rem; page-break-after: always; min-height: 100vh; position: relative;
      background-color: #FDFAF5;
      background-image: repeating-linear-gradient(to bottom, transparent 0, transparent calc(100vh - 1px), rgba(200,129,58,.25) calc(100vh - 1px), rgba(200,129,58,.25) 100vh);
    }
    .chapter-num { font-size: .75rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: ${colors.accent}; margin-bottom: .4rem; }
    .chapter-period { font-size: .8rem; color: #7A5C44; margin-bottom: 1.25rem; font-family: 'DM Sans', sans-serif; }
    .chapter-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 600; color: #3D2B1F; margin-bottom: 2rem; line-height: 1.3; }
    .chapter-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 1.05rem; line-height: 1.9; color: #3D2B1F; }
    .chapter-photos { margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(61,43,31,.08); }
    .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .photo-grid img { width: 100%; height: 180px; object-fit: cover; border-radius: 10px; display: block; }
    .photo-caption { font-size: .75rem; color: #7A5C44; margin-top: .4rem; font-style: italic; text-align: center; }
    /* Layout: photo_hero */
    .hero-img { width: calc(100% + 6rem); margin: -4rem -3rem 1.75rem; height: 38vh; object-fit: cover; display: block; flex-shrink: 0; }
    /* Layout: split */
    .split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.75rem; min-height: calc(100vh - 9rem); }
    .split-text { display: flex; flex-direction: column; }
    .split-text .chapter-text { flex: 1; }
    .split-photo-col { display: flex; flex-direction: column; gap: .75rem; overflow: hidden; padding-top: .25rem; }
    .split-photo-col img { width: 100%; height: auto; max-height: 42vh; object-fit: cover; border-radius: 10px; display: block; }
    .photo-page { padding: 2rem 2rem 5rem; background: #F7F2EA; page-break-after: always; height: 100vh; overflow: hidden; position: relative; }
    .photo-page .photo-grid img { height: 220px; border-radius: 12px; }
    .blank-page { background: #F7F2EA; height: 100vh; page-break-after: always; position: relative; }
    .pg-num { position: absolute; left: 0; width: 100%; text-align: center; font-family: 'DM Sans', sans-serif; font-size: .75rem; color: rgba(61,43,31,.55); letter-spacing: .1em; pointer-events: none; line-height: 1; }
    .back-cover { width: 100%; height: 100vh; overflow: hidden; background: ${colors.back}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem; }
    .back-cover-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #FDFAF5; margin-bottom: 1rem; }
    .back-cover-text { font-size: .9rem; color: rgba(253,250,245,.7); max-width: 360px; line-height: 1.7; }
    @media print {
      body { background: white !important; padding: 0 !important; }
      .cover, .dedication, .chapter, .photo-page, .blank-page, .back-cover { max-width: none !important; margin: 0 !important; box-shadow: none !important; width: 100% !important; height: auto !important; min-height: 100vh !important; overflow: visible !important; }
      .chapter { background-image: none !important; }
      .pg-num { display: none !important; }
    }
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

  <!-- Stories as chapters , photos embedded per chapter -->
  ${stories.length > 0 ? stories.map((story, i) => {
    const photos = chapterPhotos[i] ?? [];
    const layout: LayoutType = (VALID_LAYOUTS as readonly string[]).includes(layouts[story.id]) ? layouts[story.id] as LayoutType : "classic";
    const dateLocale = lang === "fr" ? "fr-FR" : "en-US";
    const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    const periodStart = fmt(story.period_start ?? story.created_at);
    const periodEnd = story.period_end ? fmt(story.period_end) : null;
    const periodLabel = periodEnd && periodEnd !== periodStart ? `${periodStart} – ${periodEnd}` : periodStart;
    const chapterHeader = `
    <div class="chapter-num">${escapeHtml(s.chapter)} ${i + 1}</div>
    <div class="chapter-period">${escapeHtml(periodLabel)}</div>
    <div class="chapter-title">${escapeHtml(story.title || `${pet.name}'s Story`)}</div>`;
    const chapterText = `<div class="chapter-text">${escapeHtml(story.content).replace(/\n/g, "<br>")}</div>`;
    const allPhotoUrls = photos.flatMap(e =>
      (e.photo_urls as string[]).slice(0, Math.ceil(4 / Math.max(photos.length, 1)))
    ).filter(u => safeUrl(u));

    let innerHtml = "";
    if (layout === "photo_hero") {
      const heroUrl = allPhotoUrls[0] ?? "";
      innerHtml = `
    ${heroUrl ? `<img class="hero-img" src="${heroUrl}" alt="" />` : ""}
    ${chapterHeader}
    ${chapterText}`;
    } else if (layout === "split") {
      const splitPhotos = allPhotoUrls.slice(0, 2);
      innerHtml = `
    <div class="split-grid">
      <div class="split-text">${chapterHeader}${chapterText}</div>
      <div class="split-photo-col">
        ${splitPhotos.map(url => `<img src="${url}" alt="" />`).join("")}
      </div>
    </div>`;
    } else if (layout === "text_only") {
      innerHtml = `${chapterHeader}${chapterText}`;
    } else {
      // classic — photos at bottom
      const classicPhotos = photos.length > 0 ? `
    <div class="chapter-photos">
      <div class="photo-grid">
        ${photos.flatMap(e =>
          (e.photo_urls as string[]).slice(0, Math.ceil(4 / photos.length)).map(url => `
          <div>
            ${safeUrl(url) ? `<img src="${safeUrl(url)}" alt="" />` : ""}
            <div class="photo-caption">${escapeHtml(new Date(e.entry_date).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }))}</div>
          </div>`
        )).join("")}
      </div>
    </div>` : "";
      innerHtml = `${chapterHeader}${chapterText}${classicPhotos}`;
    }

    return `
  <div class="chapter">
    ${innerHtml}
  </div>`;
  }).join("") : `
  <div class="chapter">
    <div class="chapter-num">${escapeHtml(s.chapter)} 1</div>
    <div class="chapter-title">The story begins…</div>
    <div class="chapter-text" style="font-style: normal; color: #7A5C44; font-size: .95rem;">
      ${escapeHtml(s.noStories(pet.name))}
    </div>
  </div>
  `}

  <!-- Orphan photos page (entries not covered by any story period) -->
  ${hasOrphanPhotos ? `
  <div class="photo-page">
    <div class="chapter-num" style="margin-bottom: 1.5rem;">${escapeHtml(s.moments)}</div>
    <div class="photo-grid">
      ${orphanEntries.flatMap(e => (e.photo_urls as string[]).slice(0, 1)).map((url: string) => `
        <div>
          ${safeUrl(url) ? `<img src="${safeUrl(url)}" alt="" />` : ""}
        </div>
      `).join("")}
    </div>
  </div>
  ` : ""}

  <!-- Blank pages to reach Gelato minimum (20 pages, even count) -->
  ${blankPagesHtml}

  <!-- Back cover -->
  <div class="back-cover">
    <div class="back-cover-title">${escapeHtml(s.backTitle)}</div>
    <div class="back-cover-text">${escapeHtml(s.backText)}</div>
    <div style="margin-top: 2rem; font-size: .8rem; color: rgba(253,250,245,.5); letter-spacing: .1em; text-transform: uppercase;">everypaw.app</div>
  </div>

<script>
(function() {
  function init() {
    var vh = window.innerHeight;
    var pageNum = 1;
    var pages = document.querySelectorAll('.cover, .dedication, .chapter, .photo-page, .blank-page, .back-cover');
    pages.forEach(function(el) {
      if (el.classList.contains('cover')) { pageNum++; return; }
      if (el.classList.contains('back-cover')) { return; }
      if (el.classList.contains('chapter')) {
        var h = el.getBoundingClientRect().height;
        var n = Math.max(1, Math.ceil(h / vh));
        for (var i = 0; i < n; i++) {
          var numEl = document.createElement('div');
          numEl.className = 'pg-num';
          numEl.textContent = String(pageNum);
          numEl.style.top = (i === n - 1 ? h - 28 : (i + 1) * vh - 28) + 'px';
          el.appendChild(numEl);
          pageNum++;
        }
      } else {
        var numEl2 = document.createElement('div');
        numEl2.className = 'pg-num';
        numEl2.textContent = String(pageNum);
        numEl2.style.bottom = '1.75rem';
        el.appendChild(numEl2);
        pageNum++;
      }
    });
  }
  function run() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() { setTimeout(init, 50); });
    } else {
      setTimeout(init, 200);
    }
  }
  if (document.readyState === 'complete') { run(); }
  else { window.addEventListener('load', run); }
})();
</script>

</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// GET , called by Gelato's servers; requires a short-lived signed token
export async function GET(req: Request) {
  const url = new URL(req.url);
  const petId = url.searchParams.get("petId");

  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });
  if (!UUID_REGEX.test(petId)) return NextResponse.json({ error: "Invalid petId" }, { status: 400 });

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

  // Parse layouts: JSON map { storyId: layoutType }
  const layoutsParam = url.searchParams.get("layouts");
  const layouts: Record<string, LayoutType> = {};
  if (layoutsParam) {
    try {
      const parsed = JSON.parse(layoutsParam);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (UUID_REGEX.test(k) && (VALID_LAYOUTS as readonly string[]).includes(v as string)) {
            layouts[k] = v as LayoutType;
          }
        }
      }
    } catch { /* ignore malformed layouts */ }
  }

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
    layouts,
  });
}

// POST , called from the dashboard in-app preview; requires an authenticated session
export async function POST(req: Request) {
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { petId?: string; lang?: string; storyIds?: string; dedication?: string; year?: number; coverPhoto?: string; theme?: string; customTitle?: string; layouts?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { petId, lang, storyIds, dedication, year, coverPhoto, theme, customTitle, layouts: rawLayouts } = body;
  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });
  if (!UUID_REGEX.test(petId)) return NextResponse.json({ error: "Invalid petId" }, { status: 400 });

  // Validate storyIds format
  if (storyIds) {
    const ids = storyIds.split(",").filter(Boolean);
    const invalid = ids.find((id: string) => !UUID_REGEX.test(id));
    if (invalid !== undefined) {
      return NextResponse.json({ error: "Invalid storyId format" }, { status: 400 });
    }
  }

  // Validate coverPhoto: https only
  if (coverPhoto) {
    try {
      if (new URL(coverPhoto).protocol !== "https:") throw new Error();
    } catch {
      return NextResponse.json({ error: "Invalid coverPhoto" }, { status: 400 });
    }
  }

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
  const supabase = getServiceSupabase();
  const { data: pet } = await supabase.from("pets").select("user_id").eq("id", petId).single();
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
  if (pet.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Validate and sanitize layouts map
  const layouts: Record<string, LayoutType> = {};
  if (rawLayouts && typeof rawLayouts === "object" && !Array.isArray(rawLayouts)) {
    for (const [k, v] of Object.entries(rawLayouts)) {
      if (UUID_REGEX.test(k) && (VALID_LAYOUTS as readonly string[]).includes(v)) {
        layouts[k] = v as LayoutType;
      }
    }
  }

  return buildHtml({
    petId,
    lang: validLang,
    storyIdsParam: storyIds ?? null,
    dedication: dedication ?? "",
    yearFilter: year ?? null,
    coverPhotoParam: coverPhoto ?? null,
    theme: validTheme,
    customTitle: validCustomTitle,
    layouts,
  });
}

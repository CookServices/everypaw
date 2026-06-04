import { NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  renderToBuffer,
} from "@react-pdf/renderer";
import { validatePdfToken } from "@/lib/pdf-token";
import { getServiceSupabase } from "@/lib/plan";

export const dynamic = "force-dynamic";

// Dimensions in points (1mm = 2.83465pt)
const MM = 2.83465;
const TRIM = 200 * MM;         // 566.93pt — 200mm trim area
const BLEED_INT = 3 * MM;      // 8.504pt  — 3mm interior bleed each side
const WRAP_BLEED = 23 * MM;    // 65.2pt   — 23mm wraparound bleed each side

// Interior page size (with bleed)
const PW_INNER = TRIM + 2 * BLEED_INT; // 583.94pt = 206mm
const PH_INNER = TRIM + 2 * BLEED_INT;

// Legacy aliases used in interior page components (content fits in trim area)
const PW = TRIM;
const PH = TRIM;
const PAD = 40; // content padding within trim area

const VALID_LANGS = ["en", "fr"] as const;
type Lang = (typeof VALID_LANGS)[number];

const COVER_THEMES = {
  classic: { bg: "#3D2B1F", title: "#F7C27A", accent: "#C8813A", back: "#C8813A" },
  noir:    { bg: "#1A1A1E", title: "#F0EEE8", accent: "#B8AFA0", back: "#2C2C2E" },
  forest:  { bg: "#1B3028", title: "#AACCA0", accent: "#6A9E78", back: "#2A4A38" },
  ocean:   { bg: "#152040", title: "#A8C8E8", accent: "#5880B8", back: "#1E3060" },
  rose:    { bg: "#3A1525", title: "#F0B8C8", accent: "#C87890", back: "#8A3050" },
} as const;
type ThemeId = keyof typeof COVER_THEMES;
const VALID_THEMES = Object.keys(COVER_THEMES) as ThemeId[];
const VALID_LAYOUTS = ["classic", "photo_hero", "split", "text_only"] as const;
type LayoutType = (typeof VALID_LAYOUTS)[number];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEDICATION_LENGTH = 500;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_CUSTOM_TITLE_LENGTH = 60;

const STRINGS = {
  en: {
    coverTitle: "The Life of",
    brand: "AN EVERYPAW BOOK",
    chapter: "Chapter",
    moments: "Moments",
    dedication: "A MESSAGE FROM YOUR FAMILY",
    noStories: (name: string) => `No stories yet. Add journal entries and generate ${name}'s first story.`,
    backTitle: "Every moment remembered.",
    backText: "This book was created with love using Everypaw, the AI journal that turns your pet's daily moments into stories worth keeping forever.",
    birthdate: (d: Date) => `Born ${d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
  },
  fr: {
    coverTitle: "La Vie de",
    brand: "UN LIVRE EVERYPAW",
    chapter: "Chapitre",
    moments: "Souvenirs",
    dedication: "UN MESSAGE DE VOTRE FAMILLE",
    noStories: (name: string) => `Aucune histoire pour l'instant. Ajoutez des entrées et générez la première histoire de ${name}.`,
    backTitle: "Chaque moment, à jamais.",
    backText: "Ce livre a été créé avec amour grâce à Everypaw, le journal IA qui transforme les moments du quotidien de votre animal en histoires à garder pour toujours.",
    birthdate: (d: Date) => `Né(e) le ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
  },
};

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

type ThemeColors = (typeof COVER_THEMES)[ThemeId];
type Strings = (typeof STRINGS)[Lang];

type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};
type EntryRow = { id: string; photo_urls: string[]; entry_date: string };

// ── Page components ──────────────────────────────────────────────────────────

// Wraparound cover: front panel (right) + spine (center) + back panel (left)
// Page dimensions provided by caller (from Gelato cover-dimensions API or formula).
function WrapCoverPage({
  colors,
  strings,
  petName,
  birthdate,
  coverPhotoUrl,
  customTitle,
  coverWidthPt,
  coverHeightPt,
}: {
  colors: ThemeColors;
  strings: Strings;
  petName: string;
  birthdate: string | null;
  coverPhotoUrl: string | null;
  customTitle: string | null;
  coverWidthPt: number;
  coverHeightPt: number;
}) {
  const title = customTitle || `${strings.coverTitle}\n${petName}`;
  const spinePt = coverWidthPt - 2 * WRAP_BLEED - 2 * TRIM;
  const frontLeft = WRAP_BLEED + TRIM + spinePt; // x-start of front panel

  return (
    <Page size={[coverWidthPt, coverHeightPt]}>
      {/* Full background */}
      <View style={{ position: "absolute", top: 0, left: 0, width: coverWidthPt, height: coverHeightPt, backgroundColor: colors.bg }} />

      {/* ── Back panel (left) ── */}
      <View style={{ position: "absolute", top: WRAP_BLEED, left: WRAP_BLEED, width: TRIM, height: TRIM, alignItems: "center", justifyContent: "center", padding: PAD }}>
        <Text style={{ fontSize: 18, fontFamily: "Times-Bold", color: "#FDFAF5", marginBottom: 12, textAlign: "center" }}>{strings.backTitle}</Text>
        <Text style={{ fontSize: 9, color: "rgba(253,250,245,0.7)", fontFamily: "Helvetica", lineHeight: 1.7, textAlign: "center", maxWidth: 320 }}>{strings.backText}</Text>
        <Text style={{ fontSize: 7, color: "rgba(253,250,245,0.5)", fontFamily: "Helvetica", letterSpacing: 2, marginTop: 24 }}>everypaw.app</Text>
      </View>

      {/* ── Spine ── */}
      <View style={{ position: "absolute", top: 0, left: WRAP_BLEED + TRIM, width: spinePt, height: coverHeightPt, backgroundColor: colors.back }} />

      {/* ── Front panel (right) ── */}
      {coverPhotoUrl && (
        <PdfImage src={coverPhotoUrl} style={{ position: "absolute", top: WRAP_BLEED, left: frontLeft, width: TRIM, height: TRIM, objectFit: "cover" }} />
      )}
      {coverPhotoUrl && (
        <View style={{ position: "absolute", top: WRAP_BLEED, left: frontLeft, width: TRIM, height: TRIM, backgroundColor: "rgba(0,0,0,0.55)" }} />
      )}
      <View style={{ position: "absolute", top: WRAP_BLEED, left: frontLeft, width: TRIM, height: TRIM, alignItems: "center", justifyContent: "center", padding: PAD }}>
        <Text style={{ fontSize: 28, color: colors.title, textAlign: "center", fontFamily: "Times-Bold", lineHeight: 1.3 }}>{title}</Text>
        {birthdate && (
          <Text style={{ fontSize: 11, color: "rgba(247,242,234,0.6)", marginTop: 10, fontFamily: "Times-Italic", textAlign: "center" }}>
            {strings.birthdate(new Date(birthdate))}
          </Text>
        )}
        <View style={{ width: 60, height: 2, backgroundColor: colors.accent, marginTop: 22, marginBottom: 22 }} />
        <Text style={{ fontSize: 7, color: "rgba(247,242,234,0.4)", letterSpacing: 2, fontFamily: "Helvetica" }}>{strings.brand}</Text>
      </View>
    </Page>
  );
}

function DedicationPage({
  colors,
  strings,
  dedication,
}: {
  colors: ThemeColors;
  strings: Strings;
  dedication: string;
}) {
  return (
    <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: BLEED_INT + PAD }}>
        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 2, color: colors.accent, marginBottom: 18, textAlign: "center" }}>
          {strings.dedication}
        </Text>
        <View style={{ maxWidth: 380 }}>
          <Text style={{ fontSize: 12, fontFamily: "Times-Italic", lineHeight: 1.85, color: "#3D2B1F", textAlign: "center" }}>
            {dedication}
          </Text>
        </View>
      </View>
    </Page>
  );
}

function ChapterPage({
  colors,
  strings,
  story,
  photos,
  layout,
  index,
  lang,
}: {
  colors: ThemeColors;
  strings: Strings;
  story: StoryRow;
  photos: EntryRow[];
  layout: LayoutType;
  index: number;
  lang: Lang;
}) {
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(locale as Intl.LocalesArgument, {
      month: "long",
      year: "numeric",
    });
  const start = fmt(story.period_start ?? story.created_at);
  const end = story.period_end ? fmt(story.period_end) : null;
  const period = end && end !== start ? `${start} – ${end}` : start;
  const title = story.title ?? "";
  const content = story.content ?? "";

  const photoUrls = photos
    .flatMap((e) => (e.photo_urls as string[]).slice(0, Math.ceil(4 / Math.max(photos.length, 1))))
    .filter((u) => safeUrl(u))
    .slice(0, 4);

  const CONTENT_W = PW - PAD * 2;
  const CONTENT_H = PH - PAD * 2;

  const Header = (
    <>
      <Text
        style={{
          fontSize: 7,
          fontFamily: "Helvetica-Bold",
          letterSpacing: 2,
          color: colors.accent,
          marginBottom: 4,
        }}
      >
        {strings.chapter.toUpperCase()} {index + 1}
      </Text>
      <Text
        style={{
          fontSize: 8,
          color: "#7A5C44",
          fontFamily: "Helvetica",
          marginBottom: 12,
        }}
      >
        {period}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontFamily: "Times-Bold",
          color: "#3D2B1F",
          marginBottom: 18,
          lineHeight: 1.3,
        }}
      >
        {title}
      </Text>
    </>
  );

  const BodyText = (
    <Text
      style={{
        fontSize: 10,
        fontFamily: "Times-Italic",
        lineHeight: 1.9,
        color: "#3D2B1F",
        flex: 1,
      }}
    >
      {content}
    </Text>
  );

  const BP = BLEED_INT + PAD; // bleed + content padding

  if (layout === "photo_hero") {
    const heroUrl = safeUrl(photoUrls[0] ?? "");
    return (
      <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
        {heroUrl ? (
          <PdfImage src={heroUrl} style={{ width: PW_INNER, height: PH_INNER * 0.36, objectFit: "cover" }} />
        ) : null}
        <View style={{ flex: 1, padding: BP, paddingTop: heroUrl ? 18 : BP, overflow: "hidden" }}>
          {Header}
          {BodyText}
        </View>
      </Page>
    );
  }

  if (layout === "split") {
    const splitUrls = photoUrls.slice(0, 2).filter(safeUrl);
    const colW = (CONTENT_W - 16) / 2;
    return (
      <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
        <View style={{ flexDirection: "row", padding: BP, flex: 1, gap: 16, overflow: "hidden" }}>
          <View style={{ flex: 1, overflow: "hidden" }}>
            {Header}
            {BodyText}
          </View>
          <View style={{ width: colW, gap: 8 }}>
            {splitUrls.map((url, j) => (
              <PdfImage key={j} src={url} style={{ width: colW, height: splitUrls.length === 1 ? CONTENT_H * 0.7 : CONTENT_H / 2 - 4, objectFit: "cover", borderRadius: 8 }} />
            ))}
          </View>
        </View>
      </Page>
    );
  }

  if (layout === "text_only") {
    return (
      <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
        <View style={{ padding: BP, flex: 1, overflow: "hidden" }}>
          {Header}
          {BodyText}
        </View>
      </Page>
    );
  }

  // classic — text then photos at bottom
  const photoW = photoUrls.length === 1 ? CONTENT_W : (CONTENT_W - 8) / 2;
  const safePhotoUrls = photoUrls.filter(safeUrl);
  return (
    <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
      <View style={{ padding: BP, flex: 1, overflow: "hidden" }}>
        {Header}
        <View style={{ flex: 1, overflow: "hidden" }}>{BodyText}</View>
        {safePhotoUrls.length > 0 && (
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(61,43,31,0.08)" }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {safePhotoUrls.map((url, j) => (
                <PdfImage key={j} src={url} style={{ width: photoW, height: 110, objectFit: "cover", borderRadius: 8 }} />
              ))}
            </View>
          </View>
        )}
      </View>
    </Page>
  );
}

function NoStoriesPage({
  colors,
  strings,
  petName,
}: {
  colors: ThemeColors;
  strings: Strings;
  petName: string;
}) {
  return (
    <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
      <View style={{ padding: BLEED_INT + PAD, flex: 1 }}>
        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 2, color: colors.accent, marginBottom: 4 }}>
          {strings.chapter.toUpperCase()} 1
        </Text>
        <Text style={{ fontSize: 18, fontFamily: "Times-Bold", color: "#3D2B1F", marginBottom: 18 }}>The story begins…</Text>
        <Text style={{ fontSize: 11, color: "#7A5C44", fontFamily: "Helvetica", lineHeight: 1.6 }}>{strings.noStories(petName)}</Text>
      </View>
    </Page>
  );
}

function OrphanPhotosPage({
  colors,
  strings,
  orphanEntries,
}: {
  colors: ThemeColors;
  strings: Strings;
  orphanEntries: EntryRow[];
}) {
  const urls = orphanEntries
    .flatMap((e) => (e.photo_urls as string[]).slice(0, 1))
    .filter(safeUrl)
    .slice(0, 6);
  const CONTENT_W = PW - PAD * 2;
  const photoW = (CONTENT_W - 8) / 2;
  return (
    <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }}>
      <View style={{ padding: BLEED_INT + PAD, flex: 1, overflow: "hidden" }}>
        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 2, color: colors.accent, marginBottom: 18 }}>
          {strings.moments.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {urls.map((url, j) => (
            <PdfImage key={j} src={url} style={{ width: photoW, height: 160, objectFit: "cover", borderRadius: 10 }} />
          ))}
        </View>
      </View>
    </Page>
  );
}

function BlankPage() {
  return <Page size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }} />;
}

// ── Main document ─────────────────────────────────────────────────────────────

interface BookDocumentProps {
  petName: string;
  birthdate: string | null;
  stories: StoryRow[];
  chapterPhotos: EntryRow[][];
  orphanEntries: EntryRow[];
  hasDedication: boolean;
  hasOrphanPhotos: boolean;
  dedication: string;
  lang: Lang;
  coverPhotoUrl: string | null;
  theme: ThemeId;
  customTitle: string | null;
  layouts: Record<string, LayoutType>;
  blankPagesCount: number;
  coverWidthPt: number;
  coverHeightPt: number;
}

function BookDocument({
  petName,
  birthdate,
  stories,
  chapterPhotos,
  orphanEntries,
  hasDedication,
  hasOrphanPhotos,
  dedication,
  lang,
  coverPhotoUrl,
  theme,
  customTitle,
  layouts,
  blankPagesCount,
  coverWidthPt,
  coverHeightPt,
}: BookDocumentProps) {
  const colors = COVER_THEMES[theme];
  const strings = STRINGS[lang];

  return (
    <Document>
      {/* Page 1: full wraparound cover (front + spine + back) at Gelato-required dimensions */}
      <WrapCoverPage
        colors={colors}
        strings={strings}
        petName={petName}
        birthdate={birthdate}
        coverPhotoUrl={coverPhotoUrl}
        customTitle={customTitle}
        coverWidthPt={coverWidthPt}
        coverHeightPt={coverHeightPt}
      />
      {/* Pages 2+: interior pages at 206×206mm (200mm trim + 3mm bleed each side) */}
      <BlankPage />
      {hasDedication && (
        <DedicationPage colors={colors} strings={strings} dedication={dedication} />
      )}
      {stories.length > 0 ? (
        stories.map((story, i) => {
          const layout: LayoutType = (VALID_LAYOUTS as readonly string[]).includes(layouts[story.id])
            ? (layouts[story.id] as LayoutType)
            : "classic";
          return (
            <ChapterPage key={story.id} colors={colors} strings={strings} story={story} photos={chapterPhotos[i] ?? []} layout={layout} index={i} lang={lang} />
          );
        })
      ) : (
        <NoStoriesPage colors={colors} strings={strings} petName={petName} />
      )}
      {hasOrphanPhotos && (
        <OrphanPhotosPage colors={colors} strings={strings} orphanEntries={orphanEntries} />
      )}
      {Array.from({ length: blankPagesCount }).map((_, i) => (
        <BlankPage key={`blank-${i}`} />
      ))}
      <BlankPage />
    </Document>
  );
}

// ── GET handler ───────────────────────────────────────────────────────────────

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

  const langParam = url.searchParams.get("lang");
  const lang: Lang = VALID_LANGS.includes(langParam as Lang) ? (langParam as Lang) : "en";

  const yearParam = url.searchParams.get("year");
  let yearFilter: number | null = null;
  if (yearParam) {
    yearFilter = parseInt(yearParam, 10);
    if (isNaN(yearFilter) || yearFilter < MIN_YEAR || yearFilter > MAX_YEAR) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
  }

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

  const coverPhotoParam = url.searchParams.get("coverPhoto");
  const coverPhotoUrl = coverPhotoParam ? safeUrl(decodeURIComponent(coverPhotoParam)) || null : null;

  // Cover dimensions in points (from Gelato cover-dimensions API, passed by gelato/order route)
  const coverWidthMm = parseFloat(url.searchParams.get("coverWidthMm") ?? "458");
  const coverHeightMm = parseFloat(url.searchParams.get("coverHeightMm") ?? "246");
  const coverWidthPt = (isNaN(coverWidthMm) || coverWidthMm < 300 || coverWidthMm > 800 ? 458 : coverWidthMm) * MM;
  const coverHeightPt = (isNaN(coverHeightMm) || coverHeightMm < 150 || coverHeightMm > 400 ? 246 : coverHeightMm) * MM;

  // Fetch data
  const supabase = getServiceSupabase();
  const [{ data: pet }, { data: allStories }, { data: allEntries }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    supabase.from("stories").select("*").eq("pet_id", petId).order("created_at", { ascending: true }),
    supabase.from("entries").select("*").eq("pet_id", petId).order("entry_date", { ascending: true }),
  ]);

  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  let stories = allStories ?? [];
  const storyIdsParam = url.searchParams.get("storyIds");
  if (storyIdsParam) {
    const ids = storyIdsParam.split(",").filter(Boolean);
    stories = stories.filter((s) => ids.includes(s.id));
  }
  if (yearFilter) {
    stories = stories.filter((s) => {
      const d = new Date(s.period_start ?? s.created_at);
      return d.getFullYear() === yearFilter;
    });
  }

  const entries: EntryRow[] = yearFilter
    ? (allEntries ?? []).filter((e) => new Date(e.entry_date).getFullYear() === yearFilter)
    : (allEntries ?? []);

  const hasDedication = dedication.trim().length > 0;

  // Associate photo entries to story chapters (same logic as preview-pdf)
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

  const chapterPhotos: EntryRow[][] = stories.map(() => []);
  for (const entry of entries) {
    if (!entry.photo_urls?.length) continue;
    const idx = entryToStoryIdx.get(entry.id);
    if (idx !== undefined && chapterPhotos[idx].length < 4) chapterPhotos[idx].push(entry);
  }

  const orphanEntries = entries
    .filter((e) => e.photo_urls?.length > 0 && !entryToStoryIdx.has(e.id))
    .slice(0, 6);
  const hasOrphanPhotos = orphanEntries.length > 0;

  // pageCount declared to Gelato = content pages only (cover + endpaper + back cover are structural).
  // Total PDF pages = contentPages + blankPagesCount + 3 structural = targetContentPages + 3.
  const storyPageCount = stories.length > 0 ? stories.length : 1;
  const contentPages = (hasDedication ? 1 : 0) + storyPageCount + (hasOrphanPhotos ? 1 : 0);
  const targetContentPages = Math.max(28, Math.ceil(contentPages / 4) * 4);
  const blankPagesCount = targetContentPages - contentPages;

  try {
    const buffer = await renderToBuffer(
      <BookDocument
        petName={pet.name}
        birthdate={pet.birthdate ?? null}
        stories={stories}
        chapterPhotos={chapterPhotos}
        orphanEntries={orphanEntries}
        hasDedication={hasDedication}
        hasOrphanPhotos={hasOrphanPhotos}
        dedication={dedication}
        lang={lang}
        coverPhotoUrl={coverPhotoUrl}
        theme={theme}
        customTitle={customTitle}
        layouts={layouts}
        blankPagesCount={blankPagesCount}
        coverWidthPt={coverWidthPt}
        coverHeightPt={coverHeightPt}
      />,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="book-${petId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[book-pdf] renderToBuffer error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}

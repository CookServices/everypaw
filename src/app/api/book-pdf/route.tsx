import { log } from "@/lib/log";
import { NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { validatePdfToken } from "@/lib/pdf-token";
import { getServiceSupabase } from "@/lib/plan";
import { UUID_REGEX } from "@/lib/validation";
import { paginateBook, chunk, splitChapterText, PHOTOS_PER_PAGE, MILESTONES_PER_PAGE, MAX_BOOK_PHOTOS } from "@/lib/book-pages";
import {
  COVER_THEMES, VALID_THEMES, VALID_LANGS, VALID_LAYOUTS,
  MAX_DEDICATION_LENGTH, MAX_CUSTOM_TITLE_LENGTH, MIN_YEAR, MAX_YEAR,
  safeUrl, bestStoryIndexForDate, collectOrphanPhotoUrls,
  type Lang, type ThemeId, type LayoutType,
} from "@/lib/book-shared";

export const dynamic = "force-dynamic";

// Dimensions in points (1mm = 2.83465pt)
const MM = 2.83465;
const TRIM = 200 * MM;         // 566.93pt, 200mm trim area
const BLEED_INT = 3 * MM;      // 8.504pt, 3mm interior bleed each side
const WRAP_BLEED = 23 * MM;    // 65.2pt, 23mm wraparound bleed each side

// Interior page size (with bleed)
const PW_INNER = TRIM + 2 * BLEED_INT; // 583.94pt = 206mm
const PH_INNER = TRIM + 2 * BLEED_INT;

// Legacy aliases used in interior page components (content fits in trim area)
const PW = TRIM;
const PH = TRIM;
const PAD = 40; // content padding within trim area


const STRINGS = {
  en: {
    coverTitle: "The Life of",
    brand: "AN EVERYPAW BOOK",
    chapter: "Chapter",
    moments: "Moments",
    dedication: "A MESSAGE FROM YOUR FAMILY",
    tributes: "TRIBUTES",
    tributesSubtitle: "Messages from family & friends",
    milestones: "MILESTONES",
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
    tributes: "HOMMAGES",
    tributesSubtitle: "Messages de proches et d'amis",
    milestones: "ÉTAPES",
    noStories: (name: string) => `Aucune histoire pour l'instant. Ajoutez des entrées et générez la première histoire de ${name}.`,
    backTitle: "Chaque moment, à jamais.",
    backText: "Ce livre a été créé avec amour grâce à Everypaw, le journal IA qui transforme les moments du quotidien de votre animal en histoires à garder pour toujours.",
    // "en", not "le": the date below is a month and a year, never a day, so
    // "Né(e) le août 2026" was ungrammatical. Mirrors the English "Born August 2026".
    birthdate: (d: Date) => `Né(e) en ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
  },
};

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
type TributeRow = { id: string; author_name: string; message: string; created_at: string };
type MilestoneRow = { id: string; title: string; achieved_at: string };
/** One physical page of one chapter. */
type ChapterPageSlice = {
  story: StoryRow;
  layout: LayoutType;
  chapterIndex: number;
  pageIndex: number;
  text: string;
  photos: EntryRow[];
};

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
    <Page wrap={false} size={[coverWidthPt, coverHeightPt]}>
      {/* Full background */}
      <View style={{ position: "absolute", top: 0, left: 0, width: coverWidthPt, height: coverHeightPt, backgroundColor: colors.bg }} />

      {/* ── Back panel (left) ── */}
      <View style={{ position: "absolute", top: WRAP_BLEED, left: WRAP_BLEED, width: TRIM, height: TRIM, alignItems: "center", justifyContent: "center", padding: PAD }}>
        <Text style={{ fontSize: 18, fontFamily: "TinosBold", color: "#FDFAF5", marginBottom: 12, textAlign: "center" }}>{strings.backTitle}</Text>
        <Text style={{ fontSize: 9, color: "rgba(253,250,245,0.7)", fontFamily: "Sans", lineHeight: 1.7, textAlign: "center", maxWidth: 320 }}>{strings.backText}</Text>
        <Text style={{ fontSize: 7, color: "rgba(253,250,245,0.5)", fontFamily: "Sans", letterSpacing: 2, marginTop: 24 }}>everypaw.app</Text>
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
        <Text style={{ fontSize: 28, color: colors.title, textAlign: "center", fontFamily: "TinosBold", lineHeight: 1.3 }}>{title}</Text>
        {birthdate && (
          <Text style={{ fontSize: 11, color: "rgba(247,242,234,0.6)", marginTop: 10, fontFamily: "TinosItalic", textAlign: "center" }}>
            {strings.birthdate(new Date(birthdate))}
          </Text>
        )}
        <View style={{ width: 60, height: 2, backgroundColor: colors.accent, marginTop: 22, marginBottom: 22 }} />
        <Text style={{ fontSize: 7, color: "rgba(247,242,234,0.4)", letterSpacing: 2, fontFamily: "Sans" }}>{strings.brand}</Text>
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
    <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: BLEED_INT + PAD }}>
        <Text style={{ fontSize: 7, fontFamily: "SansBold", letterSpacing: 2, color: colors.accent, marginBottom: 18, textAlign: "center" }}>
          {strings.dedication}
        </Text>
        <View style={{ maxWidth: 380 }}>
          <Text style={{ fontSize: 12, fontFamily: "TinosItalic", lineHeight: 1.85, color: "#3D2B1F", textAlign: "center" }}>
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
  pageText,
  continuation,
}: {
  colors: ThemeColors;
  strings: Strings;
  story: StoryRow;
  photos: EntryRow[];
  layout: LayoutType;
  index: number;
  lang: Lang;
  /** This page's slice of the chapter. */
  pageText: string;
  /** A continuation carries text alone: no header to repeat, no photos. */
  continuation: boolean;
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
  // Handed in already split: a chapter longer than its page becomes several,
  // and the split comes from the same helper that counted them.
  const content = pageText;

  const photoUrls = photos
    .flatMap((e) => (e.photo_urls as string[]).slice(0, Math.ceil(4 / Math.max(photos.length, 1))))
    .filter((u) => safeUrl(u))
    .slice(0, 4);

  const CONTENT_W = PW - PAD * 2;
  const CONTENT_H = PH - PAD * 2;

  const Header = continuation ? null : (
    <>
      <Text
        style={{
          fontSize: 7,
          fontFamily: "SansBold",
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
          fontFamily: "Sans",
          marginBottom: 12,
        }}
      >
        {period}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontFamily: "TinosBold",
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
        fontFamily: "TinosItalic",
        lineHeight: 1.9,
        color: "#3D2B1F",
        flex: 1,
      }}
    >
      {content}
    </Text>
  );

  const BP = BLEED_INT + PAD; // bleed + content padding

  if (continuation) {
    return (
      <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
        <View style={{ padding: BP, flex: 1, overflow: "hidden" }}>{BodyText}</View>
      </Page>
    );
  }

  if (layout === "photo_hero") {
    const heroUrl = safeUrl(photoUrls[0] ?? "");
    return (
      <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
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
      <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
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
      <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
        <View style={{ padding: BP, flex: 1, overflow: "hidden" }}>
          {Header}
          {BodyText}
        </View>
      </Page>
    );
  }

  // classic, text then photos at bottom
  const photoW = photoUrls.length === 1 ? CONTENT_W : (CONTENT_W - 8) / 2;
  const safePhotoUrls = photoUrls.filter(safeUrl);
  return (
    <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
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
    <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
      <View style={{ padding: BLEED_INT + PAD, flex: 1 }}>
        <Text style={{ fontSize: 7, fontFamily: "SansBold", letterSpacing: 2, color: colors.accent, marginBottom: 4 }}>
          {strings.chapter.toUpperCase()} 1
        </Text>
        <Text style={{ fontSize: 18, fontFamily: "TinosBold", color: "#3D2B1F", marginBottom: 18 }}>The story begins…</Text>
        <Text style={{ fontSize: 11, color: "#7A5C44", fontFamily: "Sans", lineHeight: 1.6 }}>{strings.noStories(petName)}</Text>
      </View>
    </Page>
  );
}

/**
 * One page of photos no chapter claims. Two to a page (PHOTOS_PER_PAGE): the
 * point of P1-3 is a book that is full, and a contact sheet of six would leave
 * most of the binding blank again.
 */
function PhotoPage({
  colors,
  strings,
  photoUrls,
}: {
  colors: ThemeColors;
  strings: Strings;
  photoUrls: string[];
}) {
  const BP = BLEED_INT + PAD;
  const contentW = PW_INNER - BP * 2;
  // Two stacked frames, minus the label band and the gap between them. The
  // label was budgeted at 26pt and actually takes 26.4 (7pt of text on a 1.2
  // line, plus its 18pt margin), which overflowed the page by four tenths of a
  // point and made react-pdf spill every photo page onto a second physical
  // page: 24 declared pages, 48 rendered, and a file Gelato would refuse.
  // Hence a measured label and four points of slack, on top of the wrap={false}
  // below which makes the arithmetic non-critical.
  const LABEL_BAND = 30;
  const PHOTO_GAP = 10;
  const photoH = Math.floor((PH_INNER - BP * 2 - LABEL_BAND - PHOTO_GAP) / 2) - 2;
  return (
    <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }}>
      <View style={{ padding: BP, flex: 1, overflow: "hidden" }}>
        <Text style={{ fontSize: 7, fontFamily: "SansBold", letterSpacing: 2, color: colors.accent, marginBottom: 18 }}>
          {strings.moments.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "column", gap: 10 }}>
          {photoUrls.map((url, j) => (
            <PdfImage key={j} src={url} style={{ width: contentW, height: photoH, objectFit: "cover", borderRadius: 10 }} />
          ))}
        </View>
      </View>
    </Page>
  );
}

/** One page of milestones, eight to a page: they are one-liners, already dated. */
function MilestonesPage({
  colors,
  strings,
  milestones,
  lang,
}: {
  colors: ThemeColors;
  strings: Strings;
  milestones: MilestoneRow[];
  lang: Lang;
}) {
  const BP = BLEED_INT + PAD;
  return (
    <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#FDFAF5" }}>
      <View style={{ padding: BP, flex: 1 }}>
        <Text style={{ fontSize: 7, fontFamily: "SansBold", letterSpacing: 2, color: colors.accent, marginBottom: 20 }}>
          {strings.milestones}
        </Text>
        {milestones.map((milestone) => (
          <View key={milestone.id} style={{ marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(61,43,31,0.08)" }}>
            <Text style={{ fontSize: 11, fontFamily: "TinosBold", color: "#3D2B1F", marginBottom: 3 }}>
              {milestone.title}
            </Text>
            <Text style={{ fontSize: 8, fontFamily: "Sans", color: "#7A5C44" }}>
              {new Date(milestone.achieved_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

function TributesPage({
  colors,
  strings,
  tributes,
}: {
  colors: ThemeColors;
  strings: Strings;
  tributes: TributeRow[];
}) {
  const BP = BLEED_INT + PAD;
  return (
    <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }}>
      <View style={{ padding: BP, flex: 1 }}>
        <Text style={{ fontSize: 7, fontFamily: "SansBold", letterSpacing: 2, color: colors.accent, marginBottom: 4 }}>
          {strings.tributes}
        </Text>
        <Text style={{ fontSize: 9, color: "#7A5C44", fontFamily: "Sans", marginBottom: 20 }}>
          {strings.tributesSubtitle}
        </Text>
        {tributes.map((tribute) => (
          <View key={tribute.id} style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(61,43,31,0.08)" }}>
            <Text style={{ fontSize: 9, fontFamily: "SansBold", color: "#3D2B1F", marginBottom: 4 }}>
              {tribute.author_name}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "TinosItalic", color: "#3D2B1F", lineHeight: 1.75 }}>
              {tribute.message}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

function BlankPage() {
  return <Page wrap={false} size={[PW_INNER, PH_INNER]} style={{ backgroundColor: "#F7F2EA" }} />;
}

// ── Main document ─────────────────────────────────────────────────────────────

interface BookDocumentProps {
  petName: string;
  birthdate: string | null;
  stories: StoryRow[];
  /** One entry per physical chapter page, in reading order. */
  chapterPages: ChapterPageSlice[];
  /** Photos no chapter claims, already split into pages of PHOTOS_PER_PAGE. */
  photoPages: string[][];
  milestones: MilestoneRow[];
  hasDedication: boolean;
  dedication: string;
  lang: Lang;
  coverPhotoUrl: string | null;
  theme: ThemeId;
  customTitle: string | null;
  layouts: Record<string, LayoutType>;
  blankPagesCount: number;
  coverWidthPt: number;
  coverHeightPt: number;
  tributes?: TributeRow[];
}

function BookDocument({
  petName,
  birthdate,
  stories,
  chapterPages,
  photoPages,
  milestones,
  hasDedication,
  dedication,
  lang,
  coverPhotoUrl,
  theme,
  customTitle,
  layouts,
  blankPagesCount,
  coverWidthPt,
  coverHeightPt,
  tributes,
}: BookDocumentProps) {
  const colors = COVER_THEMES[theme];
  const strings = STRINGS[lang];
  const hasTributes = tributes && tributes.length > 0;
  const milestonePages = chunk(milestones, MILESTONES_PER_PAGE);

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
      {chapterPages.length > 0 ? (
        chapterPages.map((slice, i) => (
          <ChapterPage
            key={`${slice.story.id}-${slice.pageIndex}`}
            colors={colors}
            strings={strings}
            story={slice.story}
            photos={slice.photos}
            layout={slice.layout}
            index={slice.chapterIndex}
            lang={lang}
            pageText={slice.text}
            continuation={slice.pageIndex > 0}
          />
        ))
      ) : (
        <NoStoriesPage colors={colors} strings={strings} petName={petName} />
      )}
      {photoPages.map((urls, i) => (
        <PhotoPage key={`photos-${i}`} colors={colors} strings={strings} photoUrls={urls} />
      ))}
      {milestonePages.map((batch, i) => (
        <MilestonesPage key={`milestones-${i}`} colors={colors} strings={strings} milestones={batch} lang={lang} />
      ))}
      {hasTributes && (
        <TributesPage colors={colors} strings={strings} tributes={tributes!} />
      )}
      {Array.from({ length: blankPagesCount }).map((_, i) => (
        <BlankPage key={`blank-${i}`} />
      ))}
      <BlankPage />
    </Document>
  );
}

// ── GET handler ───────────────────────────────────────────────────────────────

// Embed real TTF fonts (Gelato/PDF-X requires all fonts embedded, the base-14
// standard fonts Helvetica/Times are referenced but NOT embedded by react-pdf).
// Tinos is a metric-compatible Times clone; Lato replaces Helvetica for labels.
let fontsRegistered = false;
function registerFonts(origin: string) {
  if (fontsRegistered) return;
  Font.register({ family: "TinosBold", src: `${origin}/fonts/Tinos-Bold.ttf` });
  Font.register({ family: "TinosItalic", src: `${origin}/fonts/Tinos-Italic.ttf` });
  Font.register({ family: "Sans", src: `${origin}/fonts/Lato-Regular.ttf` });
  Font.register({ family: "SansBold", src: `${origin}/fonts/Lato-Bold.ttf` });
  fontsRegistered = true;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  registerFonts(url.origin);
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

  const includeTributes = url.searchParams.get("includeTributes") === "1";

  // Fetch data
  const supabase = getServiceSupabase();
  const [{ data: pet }, { data: allStories }, { data: allEntries }, { data: tributesData }, { data: allMilestones }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    supabase.from("stories").select("*").eq("pet_id", petId).order("created_at", { ascending: true }),
    supabase.from("entries").select("*").eq("pet_id", petId).order("entry_date", { ascending: true }),
    includeTributes
      ? supabase.from("memorial_tributes").select("id, author_name, message, created_at").eq("pet_id", petId).eq("status", "approved").order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
    supabase.from("milestones").select("id, title, achieved_at").eq("pet_id", petId).order("achieved_at", { ascending: true }),
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
  const approvedTributes: TributeRow[] = (includeTributes && tributesData) ? tributesData as TributeRow[] : [];
  const hasTributes = approvedTributes.length > 0;

  // Associate photo entries to story chapters (shared best-match logic).
  const entryToStoryIdx = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.photo_urls?.length) continue;
    const idx = bestStoryIndexForDate(new Date(entry.entry_date), stories);
    if (idx >= 0) entryToStoryIdx.set(entry.id, idx);
  }

  const chapterPhotos: EntryRow[][] = stories.map(() => []);
  for (const entry of entries) {
    if (!entry.photo_urls?.length) continue;
    const idx = entryToStoryIdx.get(entry.id);
    if (idx !== undefined && chapterPhotos[idx].length < 4) chapterPhotos[idx].push(entry);
  }

  // Photos and milestones paginate; blank pages are only the tail padding.
  // Every count below comes from the same helpers gelato/order uses, because
  // Gelato refuses a file whose page count contradicts the order.
  const orphanPhotoUrls = collectOrphanPhotoUrls(entries, stories).slice(0, MAX_BOOK_PHOTOS);
  const photoPages = chunk(orphanPhotoUrls, PHOTOS_PER_PAGE);

  const milestones: MilestoneRow[] = yearFilter
    ? (allMilestones ?? []).filter((m: MilestoneRow) => new Date(m.achieved_at).getFullYear() === yearFilter)
    : (allMilestones ?? []);

  // Chapter pages, split once and used both to declare and to render, so the
  // two cannot disagree: a chapter longer than its page becomes several.
  const chapterSlices: ChapterPageSlice[] = stories.flatMap((story, chapterIndex) => {
    const layout: LayoutType = (VALID_LAYOUTS as readonly string[]).includes(layouts[story.id])
      ? (layouts[story.id] as LayoutType)
      : "classic";
    const photos = chapterPhotos[chapterIndex] ?? [];
    const chapter = {
      contentLength: (story.content ?? "").trim().length,
      layout,
      photoCount: photos.length,
    };
    return splitChapterText(story.content ?? "", chapter).map((text, pageIndex) => ({
      story, layout, chapterIndex, pageIndex, text,
      photos: pageIndex === 0 ? photos : [],
    }));
  });

  const pagination = paginateBook({
    chapters: stories.map((story, i) => ({
      contentLength: (story.content ?? "").trim().length,
      layout: (VALID_LAYOUTS as readonly string[]).includes(layouts[story.id]) ? layouts[story.id] : "classic",
      photoCount: (chapterPhotos[i] ?? []).length,
    })),
    orphanPhotoCount: orphanPhotoUrls.length,
    milestoneCount: milestones.length,
    hasDedication,
    hasTributes,
  });
  const blankPagesCount = pagination.blankPages;

  try {
    const buffer = await renderToBuffer(
      <BookDocument
        petName={pet.name}
        birthdate={pet.birthdate ?? null}
        stories={stories}
        chapterPages={chapterSlices}
        photoPages={photoPages}
        milestones={milestones}
        hasDedication={hasDedication}
        dedication={dedication}
        lang={lang}
        coverPhotoUrl={coverPhotoUrl}
        theme={theme}
        customTitle={customTitle}
        layouts={layouts}
        blankPagesCount={blankPagesCount}
        coverWidthPt={coverWidthPt}
        coverHeightPt={coverHeightPt}
        tributes={approvedTributes.length > 0 ? approvedTributes : undefined}
      />,
    );

    const isDownload = url.searchParams.get("download") === "1";
    const petName = pet?.name ? pet.name.replace(/[^a-z0-9\-_]/gi, "-") : petId;
    const disposition = isDownload
      ? `attachment; filename="Everypaw-${petName}.pdf"`
      : `inline; filename="book-${petId}.pdf"`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    log.error("[book-pdf] renderToBuffer error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}

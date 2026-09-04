/**
 * Shared book-rendering config + helpers used by the print PDF (`api/book-pdf`),
 * the HTML preview (`api/preview-pdf`) and the Gelato order route (`api/gelato/order`).
 * Kept in one place so the two renderers can't drift on themes, validation bounds,
 * or (critically) the entry→story association that drives the page count declared
 * to Gelato. Note: the human-facing STRINGS tables stay per-renderer on purpose —
 * the PDF uses uppercase styling where the preview uses title case.
 */

export const COVER_THEMES = {
  classic: { bg: "#3D2B1F", title: "#F7C27A", accent: "#C8813A", back: "#C8813A" },
  noir:    { bg: "#1A1A1E", title: "#F0EEE8", accent: "#B8AFA0", back: "#2C2C2E" },
  forest:  { bg: "#1B3028", title: "#AACCA0", accent: "#6A9E78", back: "#2A4A38" },
  ocean:   { bg: "#152040", title: "#A8C8E8", accent: "#5880B8", back: "#1E3060" },
  rose:    { bg: "#3A1525", title: "#F0B8C8", accent: "#C87890", back: "#8A3050" },
} as const;
export type ThemeId = keyof typeof COVER_THEMES;
export const VALID_THEMES = Object.keys(COVER_THEMES) as ThemeId[];

export const VALID_LANGS = ["en", "fr"] as const;
export type Lang = (typeof VALID_LANGS)[number];

export const VALID_LAYOUTS = ["classic", "photo_hero", "split", "text_only"] as const;
export type LayoutType = (typeof VALID_LAYOUTS)[number];

export const MAX_DEDICATION_LENGTH = 500;
export const MAX_CUSTOM_TITLE_LENGTH = 60;
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

/** Returns the URL only if it is an https URL, else "". */
export function safeUrl(url: string): string {
  try {
    return new URL(url).protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

/**
 * Best-match story index for a given entry date: the story with the latest
 * period_start that still covers the date (respecting period_end when set).
 * Returns -1 when no story covers the date. Single source of truth so the
 * PDF, the preview and the Gelato page-count computation stay in lockstep.
 */
export function bestStoryIndexForDate(
  date: Date,
  stories: { period_start: string | null; period_end: string | null }[],
): number {
  let bestIdx = -1;
  let bestStart: Date | null = null;
  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    const start = s.period_start ? new Date(s.period_start) : null;
    const end = s.period_end ? new Date(s.period_end) : null;
    if (!start || date < start) continue;
    if (end && date > end) continue;
    if (bestStart === null || start > bestStart) { bestIdx = i; bestStart = start; }
  }
  return bestIdx;
}

/** An entry, reduced to what the photo-collection below reads. */
export type PhotoEntry = { id: string; entry_date: string; photo_urls: string[] | null };

/**
 * Every photo that no chapter claims, in entry-date order.
 *
 * Photos of an entry a chapter covers are composed inside that chapter, so
 * only the rest need pages of their own. Single source of truth: the Gelato
 * page count, the order-page estimate and the PDF must all count the same
 * photos, or Gelato receives a file whose page count contradicts the order.
 *
 * Not capped here: the cap belongs to the pagination, which knows how many
 * photos fit on a page (`MAX_PHOTO_PAGES` in `book-pages.ts`).
 */
export function collectOrphanPhotoUrls(
  entries: PhotoEntry[],
  stories: { period_start: string | null; period_end: string | null }[],
): string[] {
  const urls: string[] = [];
  for (const entry of entries) {
    if (!entry.photo_urls?.length) continue;
    if (bestStoryIndexForDate(new Date(entry.entry_date), stories) >= 0) continue;
    for (const url of entry.photo_urls) {
      if (safeUrl(url)) urls.push(url);
    }
  }
  return urls;
}

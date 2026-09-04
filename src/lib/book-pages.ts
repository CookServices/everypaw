/**
 * How a book's content turns into pages, and how many pages get declared to
 * Gelato (spec P1-3).
 *
 * Before this, a chapter took a page, every unclaimed photo shared a single
 * capped page, and everything else was blank: at the seven-chapter threshold a
 * book held ten pages of content and eighteen blank ones. Photos and milestones
 * now paginate, and blank pages only pad the tail out to the multiple of four
 * the printer needs.
 *
 * Gelato reads `declaredPages` as CONTENT pages: the PDF file must hold exactly
 * `declaredPages + 3`, the three extra being the structural pages (wraparound
 * cover, endpaper, back). Those constraints are the printer's, not ours:
 * multiple of four for hardcover signatures, never fewer than 28.
 *
 * Pure and dependency-free, so client components can import it. Every call site
 * that declares, estimates or prices a page count must go through here, or the
 * order and the file it points to stop agreeing.
 */

/** A page of unclaimed photos holds this many. */
export const PHOTOS_PER_PAGE = 2;

/**
 * Ceiling on photo pages. Without it an account with a thousand photos orders a
 * hundred-page book, and `calcGelatoBookPrice` grows with every page.
 */
export const MAX_PHOTO_PAGES = 30;

/** Milestones are one-line entries, so a page holds more of them. */
export const MILESTONES_PER_PAGE = 8;

/** Printer's floor, in content pages. */
export const MIN_CONTENT_PAGES = 28;

/** Hardcover signatures: content pages come in fours. */
export const PAGE_MULTIPLE = 4;

/**
 * Filled pages a book needs before it can be ordered. Half the printer's
 * minimum: below that the reader is buying blank paper. It replaces the old
 * seven-chapter threshold, which counted chapters and ignored everything else
 * a book is made of.
 */
export const MIN_FILLED_PAGES_TO_ORDER = 14;

/** The most photos a book will ever lay out. */
export const MAX_BOOK_PHOTOS = PHOTOS_PER_PAGE * MAX_PHOTO_PAGES;


// ── Chapter text, and the pages it needs ────────────────────────────────────
//
// A chapter is not always one page. A generated story runs to roughly two
// thousand characters, and the body area of a page in the classic layout holds
// about fourteen hundred once two photos sit under the text. Before this, the
// surplus either spilled onto a page nobody had declared to Gelato, which got
// the file refused, or was clipped once `wrap={false}` stopped the spill. Both
// lose something the reader wrote.
//
// The capacities below are derived from the page geometry in `api/book-pdf`
// (206mm square, 40pt padding, 10pt body on a 1.9 line, ~103 characters a
// line) with a margin taken off, because a page slightly emptier than it could
// be costs nothing and clipped text costs a paragraph. The renderer and the
// page count call the same function, so they cannot disagree on the split.

/** Text a chapter's FIRST page holds, by layout, photos aside. */
const FIRST_PAGE_CHARS: Record<string, number> = {
  text_only: 2000,
  classic: 2000,
  photo_hero: 1100,
  split: 950,
};

/** Each photo row under the text in the classic layout costs this much text. */
const CHARS_PER_PHOTO_ROW = 640;

/** A continuation page carries text alone, so it holds the most. */
export const CONTINUATION_PAGE_CHARS = 2000;

export type ChapterInput = {
  /** Characters of the chapter body. Zero means "assume it fits one page". */
  contentLength: number;
  /** One of the four order-page layouts; anything else reads as classic. */
  layout?: string;
  /** Photos composed into the chapter, which eat into its first page. */
  photoCount?: number;
};

/** Text the first page of this chapter holds. */
export function firstPageCapacity(chapter: ChapterInput): number {
  const base = FIRST_PAGE_CHARS[chapter.layout ?? "classic"] ?? FIRST_PAGE_CHARS.classic;
  if ((chapter.layout ?? "classic") !== "classic") return base;
  // Two photos to a row, and the row sits under the text.
  const rows = Math.ceil(Math.min(chapter.photoCount ?? 0, 4) / 2);
  return Math.max(400, base - rows * CHARS_PER_PHOTO_ROW);
}

/** Pages this chapter needs, never fewer than one. */
export function chapterPageCount(chapter: ChapterInput): number {
  const first = firstPageCapacity(chapter);
  const overflow = Math.max(0, chapter.contentLength - first);
  return 1 + Math.ceil(overflow / CONTINUATION_PAGE_CHARS);
}

/**
 * The chapter's text, split into one string per page, on word boundaries so no
 * word is cut in half. The renderer emits one page per entry, which is what
 * keeps the rendered count equal to the declared one.
 */
export function splitChapterText(content: string, chapter: ChapterInput): string[] {
  const text = content ?? "";
  const pages: string[] = [];
  let rest = text.trim();
  let capacity = firstPageCapacity(chapter);

  while (rest.length > capacity) {
    // Break at the last space that fits, so a word never straddles two pages.
    const window = rest.slice(0, capacity + 1);
    const cut = window.lastIndexOf(" ");
    const at = cut > capacity * 0.5 ? cut : capacity;
    pages.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
    capacity = CONTINUATION_PAGE_CHARS;
  }

  pages.push(rest);
  return pages;
}

export type BookContent = {
  /** Chapters selected for this book, each with what it needs to be measured. */
  chapters: ChapterInput[];
  /** Photos no chapter claims (see `collectOrphanPhotoUrls`). */
  orphanPhotoCount: number;
  milestoneCount: number;
  hasDedication: boolean;
  hasTributes: boolean;
};

export type BookPagination = {
  dedicationPages: number;
  chapterPages: number;
  photoPages: number;
  milestonePages: number;
  tributePages: number;
  /** Pages holding something. */
  contentPages: number;
  /** What Gelato is told, and what the PDF must contain minus the 3 structural pages. */
  declaredPages: number;
  /** Padding between the two, at the end of the book. */
  blankPages: number;
  /** Photos that fit; anything beyond `MAX_BOOK_PHOTOS` is left out. */
  photosUsed: number;
};

/**
 * Pages for one book. Monotonic in every input, which is what lets
 * `stripe/book-checkout` price a worst case and stay above whatever the final
 * order computes.
 */
export function paginateBook(content: BookContent): BookPagination {
  const dedicationPages = content.hasDedication ? 1 : 0;
  // A book with no chapter still shows a page saying so. A long chapter takes
  // more than one, and the renderer splits its text the same way.
  const chapterPages = Math.max(
    content.chapters.reduce((total, chapter) => total + chapterPageCount(chapter), 0),
    1,
  );
  const photosUsed = Math.min(Math.max(content.orphanPhotoCount, 0), MAX_BOOK_PHOTOS);
  const photoPages = Math.ceil(photosUsed / PHOTOS_PER_PAGE);
  const milestonePages = Math.ceil(Math.max(content.milestoneCount, 0) / MILESTONES_PER_PAGE);
  const tributePages = content.hasTributes ? 1 : 0;

  const contentPages = dedicationPages + chapterPages + photoPages + milestonePages + tributePages;
  const rounded = Math.ceil(contentPages / PAGE_MULTIPLE) * PAGE_MULTIPLE;
  const declaredPages = Math.max(MIN_CONTENT_PAGES, rounded);

  return {
    dedicationPages,
    chapterPages,
    photoPages,
    milestonePages,
    tributePages,
    contentPages,
    declaredPages,
    blankPages: declaredPages - contentPages,
    photosUsed,
  };
}

/** Whether a book holds enough real pages to be worth printing. */
export function hasEnoughContentToOrder(pagination: BookPagination): boolean {
  return pagination.contentPages >= MIN_FILLED_PAGES_TO_ORDER;
}

/**
 * Splits a list into pages of `size`. Lives here rather than in the renderer so
 * the page count and the pages actually rendered come from the same rule.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

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

export type BookContent = {
  /** Chapters actually selected for this book. */
  storyCount: number;
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
  // A book with no chapter still shows a page saying so.
  const chapterPages = Math.max(content.storyCount, 1);
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

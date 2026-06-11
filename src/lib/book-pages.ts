/**
 * Compute the content page count to declare to Gelato.
 *
 * Gelato interprets pageCount as CONTENT pages only. The PDF file must
 * contain exactly pageCount + 3 total pages, where the 3 extra are the
 * structural pages Gelato adds to the product (front cover, front endpaper,
 * back cover). We provide those 3 structural pages ourselves in the PDF.
 *
 * Content pages:
 *   (hasDedication ? 1 : 0) dedication
 *   + max(storiesCount, 1) chapters (1 placeholder if no stories)
 *   + (hasOrphanPhotos ? 1 : 0) orphan-photos page
 *   + blank pages to pad to multiple of 4
 *
 * Gelato constraints:
 *   - content pages must be a multiple of 4 (hardcover signatures)
 *   - minimum 28 content pages
 *   - total PDF pages = declared + 3 structural
 *
 * Pure helper — no server-only deps, so client components can import it.
 */
export function calcPageCount(storiesCount: number, hasOrphanPhotos: boolean, hasDedication: boolean, hasTributes?: boolean): number {
  const storyPages = Math.max(storiesCount, 1);
  const contentPages = (hasDedication ? 1 : 0) + storyPages + (hasOrphanPhotos ? 1 : 0) + (hasTributes ? 1 : 0);
  const rounded = Math.ceil(contentPages / 4) * 4;
  return Math.max(28, rounded);
}

/**
 * Compute the page count to declare to Gelato.
 * Must match the actual HTML page count produced by preview-pdf/route.ts exactly.
 *
 * Structure:
 *   1 cover
 *   + (hasDedication ? 1 : 0) dedication
 *   + max(storiesCount, 1)     chapters  (1 placeholder if no stories)
 *   + (hasOrphanPhotos ? 1 : 0) orphan-photos page (entries not in any story period)
 *   + 1 back cover
 *   + blank pages to pad to even & ≥20  ← added by the HTML itself
 *
 * NOTE: use hasOrphanPhotos (not hasPhotos) — the HTML only generates a separate
 * photo page for entries whose date falls outside all story periods.
 *
 * Gelato constraints for this product:
 *   - minimum 28 pages (original hardcoded value that was working)
 *   - must be a multiple of 4 (hardcover signatures fold in groups of 4)
 */
export function calcPageCount(storiesCount: number, hasOrphanPhotos: boolean, hasDedication: boolean): number {
  const storyPages = Math.max(storiesCount, 1); // min 1 placeholder chapter
  const total = 2 + (hasDedication ? 1 : 0) + storyPages + (hasOrphanPhotos ? 1 : 0);
  const rounded = Math.ceil(total / 4) * 4; // Gelato requires multiples of 4
  return Math.max(28, rounded); // Gelato minimum 28 for this product
}

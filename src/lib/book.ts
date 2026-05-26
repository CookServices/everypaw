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
 */
export function calcPageCount(storiesCount: number, hasOrphanPhotos: boolean, hasDedication: boolean): number {
  const storyPages = Math.max(storiesCount, 1); // min 1 placeholder chapter
  const total = 2 + (hasDedication ? 1 : 0) + storyPages + (hasOrphanPhotos ? 1 : 0);
  const rounded = total % 2 === 0 ? total : total + 1; // Gelato requires even page count
  return Math.max(20, rounded); // Gelato minimum 20 pages
}

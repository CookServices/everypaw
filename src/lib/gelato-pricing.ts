/**
 * Gelato hardcover photobook pricing (200x200mm, 4-4 color).
 * Formula: €15.46 + max(0, (pages - 30) / 2) × €0.395
 * Same numeric value applies for USD.
 *
 * Pages must be a multiple of 4, minimum 28.
 * Returns price in major currency units (e.g. 15.46, not 1546).
 */
export function calcGelatoBookPrice(pageCount: number): number {
  const extraPairs = Math.max(0, (pageCount - 30) / 2);
  return Math.round((15.46 + extraPairs * 0.395) * 100) / 100;
}

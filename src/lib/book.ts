export function calcPageCount(storiesCount: number, hasPhotos: boolean, hasDedication: boolean): number {
  // 1 cover + 1 back cover + stories + optional dedication + optional photos page
  const total = 2 + (hasDedication ? 1 : 0) + storiesCount + (hasPhotos ? 1 : 0);
  const rounded = total % 2 === 0 ? total : total + 1; // Gelato requires even page count
  return Math.max(20, rounded); // Gelato minimum 20 pages
}

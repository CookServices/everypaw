import { getServiceSupabase } from "@/lib/plan";

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
 */
export function calcPageCount(storiesCount: number, hasOrphanPhotos: boolean, hasDedication: boolean): number {
  const storyPages = Math.max(storiesCount, 1);
  const contentPages = (hasDedication ? 1 : 0) + storyPages + (hasOrphanPhotos ? 1 : 0);
  const rounded = Math.ceil(contentPages / 4) * 4;
  return Math.max(28, rounded);
}

/**
 * Server-side estimate of a pet's current book page count.
 * Uses the same pagination logic as the real PDF.
 * hasDedication defaults to false (estimation, not a real config).
 */
export async function estimateBookPages(petId: string): Promise<number> {
  const supabase = getServiceSupabase();

  const [{ count: storiesCount }, { data: entriesWithPhotos }] = await Promise.all([
    supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .eq("pet_id", petId)
      .neq("status", "draft"),
    supabase
      .from("entries")
      .select("photo_urls")
      .eq("pet_id", petId)
      .not("photo_urls", "is", null),
  ]);

  const hasOrphanPhotos = (entriesWithPhotos ?? []).some(
    (e: { photo_urls: string[] | null }) => Array.isArray(e.photo_urls) && e.photo_urls.length > 0,
  );

  return calcPageCount(storiesCount ?? 0, hasOrphanPhotos, false);
}

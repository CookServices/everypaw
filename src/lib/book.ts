import { getServiceSupabase } from "@/lib/plan";
import { calcPageCount } from "@/lib/book-pages";

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

import { getServiceSupabase } from "@/lib/plan";
import { paginateBook } from "@/lib/book-pages";
import { collectOrphanPhotoUrls } from "@/lib/book-shared";

/**
 * Server-side estimate of a pet's current book page count.
 * Uses the same pagination as the real PDF, so an email never promises a
 * different book from the one the order page shows.
 * hasDedication defaults to false (estimation, not a real config).
 */
export async function estimateBookPages(petId: string): Promise<number> {
  const supabase = getServiceSupabase();

  const [{ data: stories }, { data: entries }, { count: milestoneCount }] = await Promise.all([
    supabase
      .from("stories")
      .select("period_start, period_end")
      .eq("pet_id", petId)
      .neq("status", "draft"),
    supabase
      .from("entries")
      .select("id, entry_date, photo_urls")
      .eq("pet_id", petId),
    supabase
      .from("milestones")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", petId),
  ]);

  return paginateBook({
    // An estimate, so chapters count as one page each: their text is not
    // fetched here, and a progress figure does not declare anything to Gelato.
    chapters: (stories ?? []).map(() => ({ contentLength: 0 })),
    orphanPhotoCount: collectOrphanPhotoUrls(entries ?? [], stories ?? []).length,
    milestoneCount: milestoneCount ?? 0,
    hasDedication: false,
    hasTributes: false,
  }).declaredPages;
}

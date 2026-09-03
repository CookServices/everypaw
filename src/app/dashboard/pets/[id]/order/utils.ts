import type { Story, Entry, Pet } from "./constants";
import { paginateBook, hasEnoughContentToOrder } from "@/lib/book-pages";
import { collectOrphanPhotoUrls } from "@/lib/book-shared";

// The order threshold and the declared page count both come from the shared
// pagination (lib/book-pages.ts), so the number shown here is the number the
// Gelato order will declare for the same selection.
export function estimateOrderPages(
  visibleStories: Story[],
  filteredEntries: Entry[],
  selectedStoryIds: string[],
  milestoneCount: number
): { estimatedPages: number; tooFewContent: boolean } {
  const selected = visibleStories.filter(s => selectedStoryIds.includes(s.id));
  const orphanPhotoCount = collectOrphanPhotoUrls(filteredEntries, selected).length;
  const pagination = paginateBook({
    storyCount: selected.length,
    orphanPhotoCount,
    milestoneCount,
    hasDedication: false,
    hasTributes: false,
  });
  // "Too few" now means too few FILLED pages: the old rule asked for seven
  // chapters and ignored the photos and milestones that fill a book too.
  return { estimatedPages: pagination.declaredPages, tooFewContent: !hasEnoughContentToOrder(pagination) };
}

export function calcCoverPeriod(
  pet: Pet | null,
  visibleStories: Story[],
  filteredEntries: Entry[],
  yearFilter: number | null
): string {
  if (!pet) return "";
  const allDates: Date[] = [];
  if (pet.birthdate) allDates.push(new Date(pet.birthdate));
  visibleStories.forEach(s => { if (s.period_start) allDates.push(new Date(s.period_start)); });
  filteredEntries.forEach(e => { if (e.entry_date) allDates.push(new Date(e.entry_date)); });
  const start = allDates.length ? allDates.reduce((a, b) => a < b ? a : b) : new Date(pet.created_at);
  const endDates: Date[] = [];
  visibleStories.forEach(s => { if (s.period_end) endDates.push(new Date(s.period_end)); else if (s.period_start) endDates.push(new Date(s.period_start)); });
  filteredEntries.forEach(e => { if (e.entry_date) endDates.push(new Date(e.entry_date)); });
  const end = endDates.length ? endDates.reduce((a, b) => a > b ? a : b) : new Date();
  const startYear = start.getFullYear();
  const endYear = yearFilter ?? end.getFullYear();
  return startYear === endYear ? String(startYear) : `${startYear}–${endYear}`;
}

export function calcMonthsCount(
  pet: Pet | null,
  entries: Entry[],
  stories: Story[],
  filteredEntries: Entry[],
  visibleStories: Story[],
  yearFilter: number | null
): number {
  if (!pet) return 1;
  if (yearFilter === null) {
    // Toutes les années : depuis la première histoire/entrée jusqu'à aujourd'hui
    const allDates: Date[] = [
      ...entries.map(e => new Date(e.entry_date)),
      ...stories.map(s => new Date(s.period_start ?? s.created_at)),
    ];
    if (allDates.length === 0) {
      // Fallback si aucun contenu : depuis la création du profil
      const start = pet.birthdate ? new Date(pet.birthdate) : new Date(pet.created_at);
      return Math.max(1, Math.round((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }
    const minDate = allDates.reduce((a, b) => a < b ? a : b);
    return Math.max(1, Math.round((Date.now() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  }
  // Année spécifique : span entre la première et la dernière entrée/histoire de cette année
  const dates: Date[] = [
    ...filteredEntries.map(e => new Date(e.entry_date)),
    ...visibleStories.map(s => new Date(s.period_start ?? s.created_at)),
  ];
  if (dates.length === 0) return 1;
  const minDate = dates.reduce((a, b) => a < b ? a : b);
  const maxDate = dates.reduce((a, b) => a > b ? a : b);
  return Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1);
}

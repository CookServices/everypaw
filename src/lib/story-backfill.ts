/**
 * Which past months still deserve a chapter (spec P1-2).
 *
 * A paying subscriber may already generate as many chapters as they like, over
 * any period. Nothing says so, so they wait for the monthly cron and reach the
 * seven chapters a book needs after seven months. This module works out the
 * gap; the UI walks the list and calls `/api/generate` once per month.
 *
 * Pure and dependency-free: dates are compared as `YYYY-MM-DD` strings, which
 * sort chronologically, so no timezone can shift a month boundary here.
 */

/** Entries and stories, reduced to the fields this computation reads. */
export type BackfillEntry = { entry_date: string };
export type BackfillStory = {
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

export type MonthStatus = "eligible" | "covered" | "too_few_entries";

export type BackfillMonth = {
  /** "2026-08". */
  monthKey: string;
  periodStart: string;
  periodEnd: string;
  entryCount: number;
  status: MonthStatus;
  /** Entries still needed for the month to become eligible; 0 unless too few. */
  missingEntries: number;
};

export type BackfillPlan = {
  /** Every past month holding at least one entry, oldest first. */
  months: BackfillMonth[];
  /** Months that can be generated now, oldest first. */
  eligible: BackfillMonth[];
  /** Months holding at least one entry, the current one included. */
  monthsWithEntries: number;
  /** Chapters already written, all periods confused. */
  chaptersWritten: number;
};

/** The generate route refuses a period holding fewer than this. */
export const MIN_ENTRIES_PER_CHAPTER = 3;

function monthBounds(monthKey: string): { periodStart: string; periodEnd: string } {
  const [year, month] = monthKey.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { periodStart: `${monthKey}-01`, periodEnd: `${monthKey}-${String(lastDay).padStart(2, "0")}` };
}

/** The month a story belongs to, whether or not it carries an explicit period. */
function storyRange(story: BackfillStory): { start: string; end: string } {
  const start = (story.period_start ?? story.created_at).slice(0, 10);
  const end = (story.period_end ?? story.period_start ?? story.created_at).slice(0, 10);
  return start <= end ? { start, end } : { start: end, end: start };
}

export function planBackfill(
  entries: BackfillEntry[],
  stories: BackfillStory[],
  options: { today?: Date } = {},
): BackfillPlan {
  const today = options.today ?? new Date();
  const currentMonthKey = today.toISOString().slice(0, 7);

  const countByMonth = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.entry_date?.slice(0, 7);
    if (!key) continue;
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
  }

  const ranges = stories.map(storyRange);

  const months: BackfillMonth[] = [];
  // Array.from rather than a spread: the repo compiles below es2015 downlevel
  // iteration, where spreading a Map iterator is a type error.
  for (const monthKey of Array.from(countByMonth.keys()).sort()) {
    // The current month is left to the monthly cron: generating it now would
    // freeze a chapter over a month that is still being written.
    if (monthKey >= currentMonthKey) continue;

    const { periodStart, periodEnd } = monthBounds(monthKey);
    const entryCount = countByMonth.get(monthKey) ?? 0;
    const covered = ranges.some(r => r.start <= periodEnd && r.end >= periodStart);
    const status: MonthStatus = covered
      ? "covered"
      : entryCount >= MIN_ENTRIES_PER_CHAPTER
        ? "eligible"
        : "too_few_entries";

    months.push({
      monthKey,
      periodStart,
      periodEnd,
      entryCount,
      status,
      missingEntries: status === "too_few_entries" ? MIN_ENTRIES_PER_CHAPTER - entryCount : 0,
    });
  }

  return {
    months,
    eligible: months.filter(m => m.status === "eligible"),
    monthsWithEntries: countByMonth.size,
    chaptersWritten: stories.length,
  };
}

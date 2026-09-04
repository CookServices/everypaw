import { describe, it, expect } from "vitest";
import { planBackfill, MIN_ENTRIES_PER_CHAPTER } from "@/lib/story-backfill";

const TODAY = new Date("2026-09-03T10:00:00Z");

function entries(...dates: string[]) {
  return dates.map(entry_date => ({ entry_date }));
}

function month(day: string, count: number) {
  return entries(...Array.from({ length: count }, (_, i) => `${day}-${String(i + 1).padStart(2, "0")}`));
}

function story(period_start: string | null, period_end: string | null, created_at = "2026-09-01T00:00:00Z") {
  return { period_start, period_end, created_at };
}

describe("planBackfill", () => {
  it("proposes a past month holding three entries", () => {
    const plan = planBackfill(month("2026-06", 3), [], { today: TODAY });

    expect(plan.eligible).toHaveLength(1);
    expect(plan.eligible[0]).toMatchObject({
      monthKey: "2026-06",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      entryCount: 3,
      status: "eligible",
    });
  });

  it("never proposes a month one entry short, and says what is missing", () => {
    const plan = planBackfill(month("2026-06", 2), [], { today: TODAY });

    expect(plan.eligible).toHaveLength(0);
    expect(plan.months[0]).toMatchObject({
      status: "too_few_entries",
      entryCount: 2,
      missingEntries: MIN_ENTRIES_PER_CHAPTER - 2,
    });
  });

  it("skips a month a story already covers", () => {
    const plan = planBackfill(month("2026-06", 5), [story("2026-06-01", "2026-06-30")], { today: TODAY });

    expect(plan.eligible).toHaveLength(0);
    expect(plan.months[0].status).toBe("covered");
  });

  it("treats a story overlapping the month at all as covering it", () => {
    // A chapter written over a fortnight straddling two months covers both:
    // a second chapter over the same days would repeat itself.
    const plan = planBackfill(
      [...month("2026-05", 4), ...month("2026-06", 4)],
      [story("2026-05-25", "2026-06-05")],
      { today: TODAY },
    );

    expect(plan.months.map(m => m.status)).toEqual(["covered", "covered"]);
  });

  it("falls back to created_at for a story with no period", () => {
    const plan = planBackfill(month("2026-06", 4), [story(null, null, "2026-06-15T08:00:00Z")], { today: TODAY });

    expect(plan.months[0].status).toBe("covered");
  });

  it("leaves the current month to the monthly cron", () => {
    // Generating September on 3 September would freeze a chapter over a month
    // still being written, and the cron would then skip it for good.
    const plan = planBackfill([...month("2026-09", 6), ...month("2026-07", 3)], [], { today: TODAY });

    expect(plan.eligible.map(m => m.monthKey)).toEqual(["2026-07"]);
    expect(plan.months.map(m => m.monthKey)).toEqual(["2026-07"]);
  });

  it("returns the months oldest first, which is the order they get generated in", () => {
    const plan = planBackfill(
      [...month("2026-07", 3), ...month("2026-04", 3), ...month("2026-06", 3)],
      [],
      { today: TODAY },
    );

    expect(plan.eligible.map(m => m.monthKey)).toEqual(["2026-04", "2026-06", "2026-07"]);
  });

  it("counts the gap the card announces, current month included", () => {
    const plan = planBackfill(
      [...month("2026-06", 3), ...month("2026-07", 3), ...month("2026-09", 1)],
      [story("2026-06-01", "2026-06-30")],
      { today: TODAY },
    );

    expect(plan.monthsWithEntries).toBe(3);
    expect(plan.chaptersWritten).toBe(1);
    expect(plan.eligible.map(m => m.monthKey)).toEqual(["2026-07"]);
  });

  it("gets February's last day right, leap year included", () => {
    const leap = planBackfill(month("2024-02", 3), [], { today: new Date("2024-06-01T00:00:00Z") });
    const common = planBackfill(month("2026-02", 3), [], { today: TODAY });

    expect(leap.months[0].periodEnd).toBe("2024-02-29");
    expect(common.months[0].periodEnd).toBe("2026-02-28");
  });

  it("has nothing to propose without entries", () => {
    const plan = planBackfill([], [], { today: TODAY });

    expect(plan.months).toEqual([]);
    expect(plan.eligible).toEqual([]);
    expect(plan.monthsWithEntries).toBe(0);
  });
});

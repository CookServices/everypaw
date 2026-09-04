"use client";

import { useState } from "react";
import Link from "next/link";
import type { Entry, Story } from "@/types";
import { planBackfill } from "@/lib/story-backfill";
import { Translations } from "./types";

/**
 * Catching up on the months that have no chapter (spec P1-2).
 *
 * A subscriber may already generate any period they like, but nothing says so,
 * so they wait for the monthly cron and reach a printable book seven months
 * later. This card names the gap and writes the missing chapters, one month at
 * a time.
 *
 * Sequential on purpose: `/api/generate` counts the day's generations, and ten
 * parallel calls would race that count. The daily ceiling is the only guard on
 * a paid model call, so hitting it is a normal outcome here, not an error.
 */
export default function BackfillCard({
  t, isFR, dateLocale, petId, entries, stories, userPlan, onStoryAdded,
}: {
  t: Translations;
  isFR: boolean;
  dateLocale: string;
  petId: string;
  entries: Entry[];
  stories: Story[];
  userPlan: string;
  onStoryAdded: (storyId: string) => void | Promise<void>;
}) {
  const [runningMonth, setRunningMonth] = useState<string | null>(null);
  const [written, setWritten] = useState(0);
  const [limitHit, setLimitHit] = useState(false);
  const [failed, setFailed] = useState(false);

  const plan = planBackfill(entries, stories);
  if (plan.months.length === 0) return null;

  const monthLabel = (monthKey: string) =>
    new Date(`${monthKey}-01T12:00:00Z`).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });

  const skipped = plan.months.filter(m => m.status === "too_few_entries");
  const isFree = userPlan === "free";
  const running = runningMonth !== null;

  const runBackfill = async () => {
    setWritten(0);
    setLimitHit(false);
    setFailed(false);
    // Snapshot: each success feeds the parent, which re-renders this card with
    // one month fewer. Iterating the live list would skip every other month.
    const queue = plan.eligible;
    let count = 0;

    for (const month of queue) {
      setRunningMonth(month.monthKey);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            petId,
            periodStart: month.periodStart,
            periodEnd: month.periodEnd,
          }),
        });

        if (res.status === 429) {
          setLimitHit(true);
          break;
        }

        const data = await res.json().catch(() => null);
        if (!data?.id) {
          setFailed(true);
          break;
        }

        count += 1;
        setWritten(count);
        await onStoryAdded(data.id);
      } catch {
        setFailed(true);
        break;
      }
    }

    setRunningMonth(null);
  };

  const gapSentence = t.stories.backfill_gap
    .replace("{months}", String(plan.monthsWithEntries))
    .replace("{monthWord}", plan.monthsWithEntries === 1 ? t.stories.backfill_month_one : t.stories.backfill_month_many)
    .replace("{chapters}", String(plan.chaptersWritten));

  return (
    <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)", display: "flex", flexDirection: "column", gap: ".875rem" }}>
      <div>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .25rem" }}>
          {t.stories.backfill_title}
        </h3>
        <p style={{ fontSize: ".85rem", color: "var(--ep-text-muted)", margin: 0, lineHeight: 1.6, fontWeight: 300 }}>
          {gapSentence}
        </p>
      </div>

      {isFree ? (
        <p style={{ fontSize: ".82rem", color: "var(--ep-text-muted)", margin: 0, lineHeight: 1.6, fontWeight: 300 }}>
          {t.stories.backfill_free_reason}{" "}
          <Link href="/dashboard/settings" style={{ color: "var(--ep-brand)", textDecoration: "none", fontWeight: 500 }}>
            {t.stories.free_upsell_cta}
          </Link>
        </p>
      ) : plan.eligible.length > 0 && (
        <button
          onClick={runBackfill}
          disabled={running}
          style={{
            alignSelf: "flex-start", padding: ".625rem 1.25rem", borderRadius: 100,
            border: "none", background: "var(--ep-brand)", color: "#fff",
            fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500,
            cursor: running ? "wait" : "pointer", opacity: running ? .7 : 1, minHeight: 36,
          }}
        >
          {running
            ? t.stories.backfill_running.replace("{month}", monthLabel(runningMonth))
            : plan.eligible.length === 1
              ? t.stories.backfill_cta_one
              : t.stories.backfill_cta.replace("{count}", String(plan.eligible.length))}
        </button>
      )}

      {!running && written > 0 && (
        <p style={{ margin: 0, fontSize: ".82rem", color: "var(--ep-brand)", fontWeight: 500 }}>
          {written === 1
            ? t.stories.backfill_done_one
            : t.stories.backfill_done.replace("{count}", String(written))}
        </p>
      )}

      {limitHit && (
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--ep-text-muted)", lineHeight: 1.6, fontWeight: 300 }}>
          {t.stories.backfill_limit}
        </p>
      )}

      {failed && (
        <p style={{ margin: 0, fontSize: ".8rem", color: "var(--ep-error-ink)", background: "var(--ep-error-bg)", border: "1px solid var(--ep-error-border)", borderRadius: 8, padding: ".625rem .875rem" }}>
          {t.stories.backfill_error}
        </p>
      )}

      {skipped.length > 0 && (
        <div>
          <p style={{ fontSize: ".78rem", color: "var(--ep-text-muted)", margin: "0 0 .35rem", fontWeight: 500 }}>
            {t.stories.backfill_skipped_title}
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: ".2rem" }}>
            {skipped.map(month => (
              <li key={month.monthKey} style={{ fontSize: ".78rem", color: "var(--ep-text-faint)", fontWeight: 300 }}>
                {t.stories.backfill_skipped_item
                  .replace("{month}", monthLabel(month.monthKey))
                  .replace("{count}", String(month.entryCount))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

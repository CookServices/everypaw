import { getTranslations, type Locale } from "./i18n";

/** Returns the ISO week number (1–53) for a given date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Returns the question for the current ISO week.
 * Deterministic: same question for every user the same calendar week.
 * {petName} placeholder is left in — callers must replace it.
 */
export function getWeeklyQuestion(locale: string): string {
  const week = getISOWeek(new Date());
  const key = `q${(week % 52) + 1}`; // q1..q52
  const loc: Locale = locale.toLowerCase().startsWith("fr") ? "fr" : "en";
  const t = getTranslations(loc);
  return (t.interview as Record<string, string>)[key] ?? "";
}

/** Returns the Monday–Sunday bounds of the current ISO week as YYYY-MM-DD strings. */
export function currentISOWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

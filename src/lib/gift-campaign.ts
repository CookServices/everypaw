/**
 * The end-of-year gift campaign window (spec P2-1).
 *
 * The dates are hard-coded here rather than driven by an environment variable:
 * the card has to switch itself off on 25 December without anyone deploying,
 * and an env var would need a redeploy to change anyway (Vercel freezes them at
 * build time). Recurring by month and day, so next December needs no edit.
 *
 * Pure and dependency-free: a client component imports it, and the window is
 * testable without a browser clock.
 */

/** 15 November, the day the campaign opens. */
const START_MONTH = 11;
const START_DAY = 15;

/** 24 December, the last day it shows. Nothing bought on Christmas Day arrives in time. */
const END_MONTH = 12;
const END_DAY = 24;

/**
 * Whether the gift campaign runs on that date, in the viewer's own timezone:
 * the card belongs to the reader's calendar, not to UTC's.
 */
export function isGiftCampaignActive(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (month === START_MONTH) return day >= START_DAY;
  if (month === END_MONTH) return day <= END_DAY;
  return false;
}

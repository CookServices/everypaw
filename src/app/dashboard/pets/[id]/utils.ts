import { Entry } from "@/types";

// Group journal entries into month buckets (e.g. "juin 2026"), preserving order.
export function groupEntriesByMonth(entries: Entry[], locale: string) {
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const groups: { month: string; entries: Entry[] }[] = [];
  entries.forEach(entry => {
    const month = new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    const existing = groups.find(g => g.month === month);
    if (existing) existing.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  });
  return groups;
}

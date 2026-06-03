export function ordinalDay(day: number, isFR: boolean): string {
  if (isFR) return day === 1 ? "1er" : String(day);
  if (day === 11 || day === 12 || day === 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

/**
 * Formats a date with ordinal day (1er / 1st, 2nd, 3rd…).
 * Reconstructs the string manually to inject the ordinal.
 */
export function fmtDateOrdinal(
  date: Date,
  isFR: boolean,
  options: { weekday?: "short" | "long"; month: "short" | "long"; year?: "numeric"; includeDay?: boolean },
): string {
  const locale = isFR ? "fr-FR" : "en-US";
  const day = date.getDate();
  const ord = ordinalDay(day, isFR);
  const month = date.toLocaleDateString(locale, { month: options.month });
  const weekday = options.weekday ? date.toLocaleDateString(locale, { weekday: options.weekday }) : null;
  const year = options.year ? date.getFullYear() : null;

  if (isFR) {
    // FR: "lun. 1er janv. 2026" or "1er janvier 2026" or "1er janv."
    const parts = [weekday, `${ord} ${month}`, year ? String(year) : null].filter(Boolean);
    return parts.join(" ");
  } else {
    // EN: "Mon. Jan. 1st, 2026" or "January 1st, 2026" or "Jan. 1st"
    const dateStr = year ? `${month} ${ord}, ${year}` : `${month} ${ord}`;
    return weekday ? `${weekday} ${dateStr}` : dateStr;
  }
}

/** Date de dernière mise à jour des documents légaux (ISO), à mettre à jour à chaque révision. */
export const LEGAL_LAST_UPDATE_ISO = "2026-05-26";

function formatLegalDate(locale: "en" | "fr"): string {
  return new Date(`${LEGAL_LAST_UPDATE_ISO}T00:00:00Z`).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
  );
}

/** « 26 mai 2026 » — pages légales FR (legacy, 301 vers les versions EN). */
export const LEGAL_LAST_UPDATE = formatLegalDate("fr");

/** "May 26, 2026" — pages légales EN. */
export const LEGAL_LAST_UPDATE_EN = formatLegalDate("en");

// The one rule deciding a user's language. Zero imports, so client components
// can use it as well as server routes and crons.
//
// English is the fallback: the main market is American, and a null language
// (every Google account, every email account created before 2026-08-31) used
// to fall back on French, sending French chapters and emails to English
// speakers.

export type AppLocale = "en" | "fr";

/** "fr" when the value starts with "fr" (fr, fr-FR, FR), "en" for anything else, null included. */
export function resolveLocale(language: string | null | undefined): AppLocale {
  return language?.trim().toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** Same rule applied to the first tag of an Accept-Language header ("fr-FR,fr;q=0.9,en;q=0.8"). */
export function resolveAcceptLanguage(header: string | null | undefined): AppLocale {
  return resolveLocale(header?.split(",")[0]);
}

/** Language name the story prompts expect. */
export function promptLanguage(locale: AppLocale): "French" | "English" {
  return locale === "fr" ? "French" : "English";
}

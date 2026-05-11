import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

export type Locale = "en" | "fr";

const messages = { en, fr };

export function getTranslations(locale: Locale) {
  return messages[locale] || messages.en;
}

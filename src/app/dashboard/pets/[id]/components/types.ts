import { getTranslations } from "@/lib/i18n";

// Shared translation-bundle type for pet-page modal components.
// `t` is passed from the parent (where locale is already settled) to avoid
// the brief English flash a fresh useLocale() would cause on modal open.
export type Translations = ReturnType<typeof getTranslations>;

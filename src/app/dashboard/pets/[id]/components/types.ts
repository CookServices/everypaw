import { getTranslations } from "@/lib/i18n";

// Shared translation-bundle type for pet-page modal components.
// `t` is passed from the parent (where locale is already settled) to avoid
// the brief English flash a fresh useLocale() would cause on modal open.
export type Translations = ReturnType<typeof getTranslations>;

// Row shapes the pet page loads straight from Supabase, shared by the
// header and the tab panels.
export type MilestoneRow = { id: string; type: string; title: string; achieved_at: string };

export type TributeRow = { id: string; author_name: string; message: string; created_at: string };

export type MemberRow = {
  id: string;
  invited_email: string;
  status: string;
  display_name: string;
  accepted_at: string | null;
  created_at: string;
};

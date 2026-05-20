import { Entry } from "@/types";

// ── Type for DB-driven definitions ────────────────────────────────────────────
export interface MilestoneDefinition {
  id: string;
  key: string;
  name_fr: string;
  name_en: string;
  keywords: string[] | null;
  icon: string | null;
  order_index: number | null;
}

// ── Hardcoded fallback (used when milestone_definitions table is unavailable) ─
export const MILESTONE_TYPES = [
  { type: "first_entry",  title: "First memory captured 📝", titleFR: "Premier souvenir capturé 📝", icon: "📝", keywords: [] },
  { type: "first_bath",   title: "First bath 🛁",             titleFR: "Premier bain 🛁",              icon: "🛁", keywords: ["bath", "bain", "shower", "douche", "baignade"] },
  { type: "first_walk",   title: "First walk 🦮",             titleFR: "Première promenade 🦮",         icon: "🦮", keywords: ["walk", "promenade", "marche", "balade", "walked"] },
  { type: "first_vet",    title: "First vet visit 🏥",        titleFR: "Première visite vétérinaire 🏥", icon: "🏥", keywords: ["vet", "vétérinaire", "veterinaire", "doctor", "clinic", "vaccin", "vaccine"] },
  { type: "first_park",   title: "First park visit 🌳",       titleFR: "Première visite au parc 🌳",   icon: "🌳", keywords: ["park", "parc", "garden", "jardin"] },
  { type: "first_trip",   title: "First trip 🚗",             titleFR: "Premier voyage 🚗",             icon: "🚗", keywords: ["trip", "travel", "voyage", "vacances", "holiday", "vacation"] },
  { type: "first_friend", title: "First dog friend 🐕",       titleFR: "Premier ami à 4 pattes 🐕",    icon: "🐕", keywords: ["friend", "ami", "play", "joue", "copain", "buddy", "met a dog", "other dog"] },
  { type: "first_swim",   title: "First swim 🏊",             titleFR: "Premier bain de mer/piscine 🏊", icon: "🏊", keywords: ["swim", "nage", "pool", "piscine", "lake", "lac", "mer", "sea", "ocean"] },
  { type: "birthday",     title: "Birthday 🎂",               titleFR: "Anniversaire 🎂",               icon: "🎂", keywords: ["birthday", "anniversaire", "born", "naissance", "1 year", "1 an", "2 year", "2 ans"] },
];

// ── Translate a milestone type to the user's locale ───────────────────────────
// Uses DB definitions when available, falls back to MILESTONE_TYPES.
export function translateMilestone(
  type: string,
  isFR: boolean,
  definitions?: MilestoneDefinition[]
): string {
  if (definitions?.length) {
    const found = definitions.find(d => d.key === type);
    if (found) return isFR ? found.name_fr : found.name_en;
  }
  // Fallback: covers old types like "first_entry" stored before DB migration
  const found = MILESTONE_TYPES.find(m => m.type === type);
  if (!found) return type;
  return isFR ? found.titleFR : found.title;
}

// ── Detect milestones triggered by a new journal entry ────────────────────────
// When `definitions` is provided (loaded from milestone_definitions table),
// it drives detection. Otherwise the hardcoded MILESTONE_TYPES are used.
export function detectMilestones(
  newEntry: { content: string },
  existingEntries: Entry[],
  existingMilestoneTypes: string[],
  definitions?: MilestoneDefinition[]
): { type: string; title: string }[] {
  const detected: { type: string; title: string }[] = [];
  const content = newEntry.content.toLowerCase();

  // ── DB-driven path ──────────────────────────────────────────────────────────
  if (definitions?.length) {
    for (const def of definitions) {
      if (existingMilestoneTypes.includes(def.key)) continue;

      // "first_memory" is a special trigger: fires on the very first entry
      if (def.key === "first_memory" && existingEntries.length === 0) {
        detected.push({ type: def.key, title: def.name_en });
        continue;
      }

      if (def.keywords?.some(kw => content.includes(kw.toLowerCase()))) {
        detected.push({ type: def.key, title: def.name_en });
      }
    }
    return detected;
  }

  // ── Hardcoded fallback path ─────────────────────────────────────────────────
  for (const milestone of MILESTONE_TYPES) {
    if (existingMilestoneTypes.includes(milestone.type)) continue;

    if (milestone.type === "first_entry" && existingEntries.length === 0) {
      detected.push({ type: milestone.type, title: milestone.title });
      continue;
    }

    if (milestone.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
      detected.push({ type: milestone.type, title: milestone.title });
    }
  }

  return detected;
}

import { Entry } from "@/types";

export const MILESTONE_TYPES = [
  { type: "first_entry", title: "First memory captured 📝", keywords: [] },
  { type: "first_bath", title: "First bath 🛁", keywords: ["bath", "bain", "shower", "douche", "baignade"] },
  { type: "first_walk", title: "First walk 🦮", keywords: ["walk", "promenade", "marche", "balade", "walked"] },
  { type: "first_vet", title: "First vet visit 🏥", keywords: ["vet", "vétérinaire", "veterinaire", "doctor", "clinic", "vaccin", "vaccine"] },
  { type: "first_park", title: "First park visit 🌳", keywords: ["park", "parc", "garden", "jardin"] },
  { type: "first_trip", title: "First trip 🚗", keywords: ["trip", "travel", "voyage", "vacances", "holiday", "vacation"] },
  { type: "first_friend", title: "First dog friend 🐕", keywords: ["friend", "ami", "play", "joue", "copain", "buddy", "met a dog", "other dog"] },
  { type: "first_swim", title: "First swim 🏊", keywords: ["swim", "nage", "pool", "piscine", "lake", "lac", "mer", "sea", "ocean"] },
  { type: "birthday", title: "Birthday 🎂", keywords: ["birthday", "anniversaire", "born", "naissance", "1 year", "1 an", "2 year", "2 ans"] },
];

export function detectMilestones(
  newEntry: { content: string },
  existingEntries: Entry[],
  existingMilestoneTypes: string[]
): { type: string; title: string }[] {
  const detected: { type: string; title: string }[] = [];
  const content = newEntry.content.toLowerCase();

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

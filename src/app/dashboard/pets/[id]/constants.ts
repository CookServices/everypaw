// Static option lists for the pet detail page (moods, emoji picker, species, story styles).
export const MOOD_OPTIONS = [
  { value: "happy", emoji: "😄", label: "Happy" },
  { value: "funny", emoji: "😂", label: "Funny" },
  { value: "tender", emoji: "🥰", label: "Tender" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "proud", emoji: "🏆", label: "Proud" },
];

export const EMOJI_CATEGORIES = [
  {
    label: "Humeurs",
    emojis: [
      { value: "happy", emoji: "😄", label: "Heureux" },
      { value: "funny", emoji: "😂", label: "Drôle" },
      { value: "tender", emoji: "🥰", label: "Tendre" },
      { value: "sad", emoji: "😢", label: "Triste" },
      { value: "proud", emoji: "🏆", label: "Fier" },
      { value: "love", emoji: "❤️", label: "Amour" },
      { value: "surprised", emoji: "😲", label: "Surpris" },
      { value: "sleepy", emoji: "😴", label: "Endormi" },
      { value: "silly", emoji: "🤪", label: "Fou" },
      { value: "nervous", emoji: "😰", label: "Nerveux" },
    ],
  },
  {
    label: "Activités",
    emojis: [
      { value: "walk", emoji: "🐾", label: "Promenade" },
      { value: "play", emoji: "🎾", label: "Jouer" },
      { value: "swim", emoji: "🏊", label: "Nager" },
      { value: "run", emoji: "🏃", label: "Courir" },
      { value: "sleep_act", emoji: "🛌", label: "Dormir" },
      { value: "bath", emoji: "🛁", label: "Bain" },
      { value: "car", emoji: "🚗", label: "Voiture" },
      { value: "park", emoji: "🌳", label: "Parc" },
      { value: "beach", emoji: "🏖️", label: "Plage" },
      { value: "home", emoji: "🏠", label: "Maison" },
    ],
  },
  {
    label: "Santé",
    emojis: [
      { value: "vet", emoji: "🏥", label: "Vétérinaire" },
      { value: "medicine", emoji: "💊", label: "Médicament" },
      { value: "healthy", emoji: "💪", label: "En forme" },
      { value: "sick", emoji: "🤒", label: "Malade" },
      { value: "vaccine", emoji: "💉", label: "Vaccin" },
      { value: "grooming", emoji: "✂️", label: "Toilettage" },
      { value: "checkup", emoji: "🩺", label: "Bilan" },
      { value: "recovered", emoji: "🌟", label: "Rétabli" },
    ],
  },
  {
    label: "Nourriture",
    emojis: [
      { value: "food", emoji: "🍖", label: "Manger" },
      { value: "treat", emoji: "🦴", label: "Friandise" },
      { value: "fish", emoji: "🐟", label: "Poisson" },
      { value: "carrot", emoji: "🥕", label: "Carotte" },
      { value: "hungry", emoji: "😋", label: "Affamé" },
      { value: "yummy", emoji: "🤤", label: "Délicieux" },
    ],
  },
  {
    label: "Nature",
    emojis: [
      { value: "sun", emoji: "☀️", label: "Soleil" },
      { value: "rain", emoji: "🌧️", label: "Pluie" },
      { value: "snow", emoji: "❄️", label: "Neige" },
      { value: "flower", emoji: "🌸", label: "Fleur" },
      { value: "leaf", emoji: "🍂", label: "Feuille" },
      { value: "moon", emoji: "🌙", label: "Nuit" },
      { value: "star", emoji: "⭐", label: "Étoile" },
      { value: "rainbow", emoji: "🌈", label: "Arc-en-ciel" },
    ],
  },
];

export const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap(c => c.emojis);

export const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

export const STORY_STYLES = [
  { value: "poetic",    icon: "🎭", labelFR: "Poétique",    labelEN: "Poetic",    descFR: "Lyrique, métaphores, émotionnel",          descEN: "Lyrical, metaphors, emotional" },
  { value: "humorous",  icon: "😄", labelFR: "Humoristique", labelEN: "Humorous",  descFR: "Léger, décalé, autodérision",             descEN: "Light, quirky, self-deprecating" },
  { value: "classic",   icon: "📖", labelFR: "Classique",    labelEN: "Classic",   descFR: "Narratif, sobre, intemporel",             descEN: "Narrative, sober, timeless" },
  { value: "epic",      icon: "🌟", labelFR: "Épique",       labelEN: "Epic",      descFR: "Aventurier, dramatique, héroïque",       descEN: "Adventurous, dramatic, heroic" },
  { value: "tender",    icon: "💝", labelFR: "Tendre",       labelEN: "Tender",    descFR: "Doux, intime, comme une lettre d'amour", descEN: "Soft, intimate, like a love letter" },
];

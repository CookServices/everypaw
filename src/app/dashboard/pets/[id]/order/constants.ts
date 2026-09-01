export type Step = "preview" | "address" | "confirm" | "success";
export type LayoutType = "classic" | "photo_hero" | "split" | "text_only";

export const PAGE_LAYOUTS: { id: LayoutType; labelKey: "layout_classic" | "layout_photo_hero" | "layout_split" | "layout_text_only"; icon: string }[] = [
  { id: "classic",    labelKey: "layout_classic",    icon: "≡" },
  { id: "photo_hero", labelKey: "layout_photo_hero",  icon: "▣" },
  { id: "split",      labelKey: "layout_split",       icon: "▥" },
  { id: "text_only",  labelKey: "layout_text_only",   icon: "☰" },
];

export interface Story {
  id: string;
  title: string | null;
  content: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  photo_urls: string[];
  entry_date: string;
}

export interface Pet {
  id: string;
  name: string;
  birthdate: string | null;
  created_at: string;
  deceased_at: string | null;
}

export interface Profile {
  plan: string;
  book_credits: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postCode: string;
  country: string;
}

export const SHIPPING_BY_COUNTRY: Record<string, string> = {
  FR: "~5–10 €", DE: "~5–10 €", ES: "~5–10 €", IT: "~5–10 €",
  NL: "~5–10 €", BE: "~5–10 €", PT: "~5–10 €", AT: "~5–10 €",
  CH: "~8–14 CHF", SE: "~80–120 SEK", DK: "~70–110 DKK", NO: "~90–140 NOK",
  FI: "~5–10 €", IE: "~5–10 €", PL: "~5–10 €",
  GB: "~£8–14", US: "~$12–18", CA: "~$15–22", AU: "~$18–28",
  NZ: "~$22–32", SG: "~$18–26", JP: "~¥1800–2800", KR: "~₩18000–28000",
  AE: "~$18–28", ZA: "~$20–32",
};

export const COUNTRIES = [
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
  { code: "ES", name: "Spain" }, { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" }, { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" }, { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" }, { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" }, { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
];

export const COVER_THEMES = [
  { id: "classic", labelFr: "Classique", labelEn: "Classic", bg: "var(--ep-text)", title: "#F7C27A", accent: "var(--ep-brand)", back: "var(--ep-brand)" },
  { id: "noir",    labelFr: "Noir",      labelEn: "Noir",    bg: "#1A1A1E", title: "#F0EEE8", accent: "#B8AFA0", back: "#2C2C2E" },
  { id: "forest",  labelFr: "Forêt",     labelEn: "Forest",  bg: "#1B3028", title: "#AACCA0", accent: "var(--ep-status-ship)", back: "#2A4A38" },
  { id: "ocean",   labelFr: "Océan",     labelEn: "Ocean",   bg: "#152040", title: "#A8C8E8", accent: "var(--ep-status-print)", back: "#1E3060" },
  { id: "rose",    labelFr: "Rose",      labelEn: "Rose",    bg: "#3A1525", title: "#F0B8C8", accent: "#C87890", back: "#8A3050" },
] as const;
export type ThemeId = typeof COVER_THEMES[number]["id"];

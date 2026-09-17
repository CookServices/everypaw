/**
 * Pages créées sans compte (docs/acquisition/specs.md, PP-1).
 *
 * Module pur : aucune dépendance serveur, donc importable depuis une route,
 * un composant client ou un test. Toute la validation d'entrée vit ici, pour
 * qu'une règle changée le soit à un seul endroit.
 */
import { escapeXml } from "@/lib/html";

export type PageKind = "memorial" | "living";
export type PageLocale = "en" | "fr";

export interface PublicPageInput {
  kind: PageKind;
  locale: PageLocale;
  petName: string;
  species: string;
  birthdate: string | null;
  deceasedAt: string | null;
  memories: string[];
}

export type ValidationError =
  | "invalid_kind"
  | "invalid_locale"
  | "invalid_name"
  | "invalid_species"
  | "invalid_birthdate"
  | "invalid_deceased_at"
  | "invalid_memories";

export type ValidationResult =
  | { ok: true; value: PublicPageInput }
  | { ok: false; error: ValidationError };

const SPECIES = ["dog", "cat", "other"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const NAME_MIN = 2;
const NAME_MAX = 40;
const MEMORY_MIN = 20;
const MEMORY_MAX = 400;

/** Les dates sont des chaînes `YYYY-MM-DD` : comparables lexicographiquement,
 *  donc aucun fuseau horaire n'entre dans la décision.
 *  Valide aussi le round-trip : `Date.parse` normalise les débordements de calendrier
 *  (p.ex. 2012-02-30 → 2012-03-01), donc on reconstruit la date à partir du timestamp
 *  et on compare à l'entrée pour rejeter les dates invalides. */
function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  const timestamp = Date.parse(v);
  if (Number.isNaN(timestamp)) return false;
  // Round-trip: reconstruct from UTC timestamp and compare
  const d = new Date(timestamp);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const date = String(d.getUTCDate()).padStart(2, "0");
  const reconstructed = `${year}-${month}-${date}`;
  return reconstructed === v;
}

/**
 * Chaque champ est copié dans une variable locale avant d'être testé. Le
 * rétrécissement de type d'un accès à une signature d'index (`b.kind`) ne
 * survit pas au bloc `if` qui l'a produit : sans ces locales, la comparaison
 * finale entre les deux dates ne compile pas (`unknown > unknown`).
 */
export function validatePublicPageInput(raw: unknown, today: string): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_kind" };
  const b = raw as Record<string, unknown>;

  const rawKind = b.kind;
  if (rawKind !== "memorial" && rawKind !== "living") return { ok: false, error: "invalid_kind" };
  const kind: PageKind = rawKind;

  const rawLocale = b.locale;
  if (rawLocale !== "en" && rawLocale !== "fr") return { ok: false, error: "invalid_locale" };
  const locale: PageLocale = rawLocale;

  const petName = typeof b.petName === "string" ? b.petName.trim() : "";
  if (petName.length < NAME_MIN || petName.length > NAME_MAX) {
    return { ok: false, error: "invalid_name" };
  }

  const rawSpecies = b.species;
  if (typeof rawSpecies !== "string" || !SPECIES.includes(rawSpecies)) {
    return { ok: false, error: "invalid_species" };
  }
  const species: string = rawSpecies;

  let birthdate: string | null = null;
  if (b.birthdate != null && b.birthdate !== "") {
    if (!isIsoDate(b.birthdate)) return { ok: false, error: "invalid_birthdate" };
    birthdate = b.birthdate;
    if (birthdate > today) return { ok: false, error: "invalid_birthdate" };
  }

  let deceasedAt: string | null = null;
  if (b.deceasedAt != null && b.deceasedAt !== "") {
    if (!isIsoDate(b.deceasedAt)) return { ok: false, error: "invalid_deceased_at" };
    deceasedAt = b.deceasedAt;
    if (deceasedAt > today) return { ok: false, error: "invalid_deceased_at" };
  }

  // Un mémorial exige la date de départ ; une page d'animal vivant n'en porte jamais.
  if (kind === "memorial" && deceasedAt === null) {
    return { ok: false, error: "invalid_deceased_at" };
  }
  if (kind === "living" && deceasedAt !== null) {
    return { ok: false, error: "invalid_deceased_at" };
  }

  if (birthdate !== null && deceasedAt !== null && birthdate > deceasedAt) {
    return { ok: false, error: "invalid_birthdate" };
  }

  if (!Array.isArray(b.memories)) return { ok: false, error: "invalid_memories" };
  const memories = b.memories.map((m) => (typeof m === "string" ? m.trim() : ""));
  if (memories.length < 2 || memories.length > 3) {
    return { ok: false, error: "invalid_memories" };
  }
  if (memories.some((m) => m.length < MEMORY_MIN || m.length > MEMORY_MAX)) {
    return { ok: false, error: "invalid_memories" };
  }

  return { ok: true, value: { kind, locale, petName, species, birthdate, deceasedAt, memories } };
}

const PHOTO_URL_MAX = 500;

/** URL de photo optionnelle : doit être une URL que notre propre route
 *  d'upload aurait pu produire (bucket `pet-photos`), sinon un POST direct
 *  sur cette route pourrait planter une URL arbitraire, ensuite rendue sur
 *  la page publique et dans les balises OpenGraph/Twitter. Longueur bornée
 *  pour ne pas laisser un attaquant pousser une chaîne arbitraire jusqu'en
 *  base. Le check `https://` reste utile si `allowedPrefix` est vide. */
export function isSafePhotoUrl(v: unknown, allowedPrefix: string): v is string {
  return (
    typeof v === "string" &&
    v.startsWith("https://") &&
    v.length <= PHOTO_URL_MAX &&
    v.startsWith(allowedPrefix)
  );
}

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Slug de 10 caractères base62, à partir de 10 octets aléatoires fournis par
 * l'appelant (`randomBytes(10)` côté serveur ; injecté dans les tests).
 *
 * Le modulo introduit un biais léger (256 n'est pas multiple de 62) : sans
 * importance, le slug n'est pas un secret. Le secret, c'est `claim_token`.
 */
export function generateSlug(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 10; i++) out += ALPHABET[bytes[i] % 62];
  return out;
}

const SPECIES_LABEL: Record<string, string> = {
  dog: "dog",
  cat: "cat",
  other: "pet",
};

/**
 * Prompt d'une page publique. Même forme que `buildOriginsPrompt` dans
 * `story.ts` : données utilisateur isolées dans des balises XML et échappées,
 * pour qu'un souvenir ne puisse pas se faire passer pour une instruction.
 */
export function buildPublicPagePrompt(input: PublicPageInput): string {
  const lang = input.locale === "fr" ? "French" : "English";
  const name = escapeXml(input.petName);
  const species = escapeXml(SPECIES_LABEL[input.species] ?? "pet");
  const memories = input.memories
    .map((m) => `  <memory>${escapeXml(m)}</memory>`)
    .join("\n");

  const shared = `<pet_details>
  <name>${name}</name>
  <species>${species}</species>${
    input.birthdate ? `\n  <born>${escapeXml(input.birthdate)}</born>` : ""
  }${input.deceasedAt ? `\n  <passed>${escapeXml(input.deceasedAt)}</passed>` : ""}
</pet_details>

<memories>
${memories}
</memories>`;

  const brief =
    input.kind === "memorial"
      ? `This is a farewell letter. The pet named in <pet_details> has passed away, and writes one last time to the human who loved them.

Write 250-350 words, in three short paragraphs.
- Open on a sensory image of an ordinary shared moment, not on the death itself.
- Weave in the memories above, transformed into narrative. Never list them.
- Close on reassurance and gratitude, addressed directly to the reader.

Tone rules:
- Tender, calm, grateful. Never morbid, never dramatic.
- Never mention how they died, a cause, an illness, or a veterinarian.
- Never use the words "rainbow bridge".`
      : `This is the first chapter of the journal of the pet named in <pet_details>, written by that pet.

Write 250-350 words, in three short paragraphs.
- Open on who they are: their habits, their character, the texture of their days.
- Weave in the memories above, transformed into narrative. Never list them.
- Close on a tender, forward-looking note about the life still ahead.

Tone rules:
- Warm, intimate, slightly playful.`;

  return `You are writing for Everypaw, a pet life-journal.

IMPORTANT: Write entirely in ${lang}. Do not use any other language.

${shared}

${brief}

Style rules (follow strictly):
- First-person voice: the pet named in <pet_details> is the narrator throughout (I, me, my).
- Use the pet's name, exactly as given in <pet_details>, at least twice, naturally.
- Reference the species at least once.
- NEVER use the em dash character (—). Use commas, periods, or parentheses instead.

Also generate a short evocative title, 5 words maximum.

You MUST respond with valid JSON only, no other text:
{"title": "...", "story": "..."}`;
}

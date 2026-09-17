# PP-1, page publique créée sans compte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un visiteur sans compte crée une page publique pour son animal (nom, espèce, photo, trois souvenirs), reçoit un chapitre écrit par l'IA, et peut partager l'URL.

**Architecture:** Toute la logique pure (validation, slug, prompt) vit dans un module sans import serveur, testé par Vitest. Deux routes API en service role écrivent dans `public_pages` (table déjà posée par PP-0) et dans le bucket `pet-photos`. La page `/p/[slug]` est un server component qui lit par service role, comme `/memorial/[id]`. Le formulaire est un composant client unique, paramétré par `kind` et `locale`, monté par deux routes serveur qui figent la langue par URL.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (service role), Anthropic `claude-sonnet-4-6` via `callClaude`, Vitest, `react-easy-crop`, styles inline.

**Spec:** `docs/acquisition/specs.md`, section PP-1 (et « Ce qui vaut pour toutes »).

## Global Constraints

- **Une PR pour tout PP-1**, branche `feat/pp1-public-pages`. `main` refuse tout push direct.
- **Definition of Done** (`CLAUDE.md`) : `npx tsc --noEmit` sans **nouvelle** erreur, `npm test` vert, `npm run build` passé, clés i18n dans `messages/en.json` **et** `messages/fr.json`, rendu ouvert dans un navigateur.
- **Une erreur `tsc` préexiste sur `main`** : `src/app/api/stripe/webhook/route.test.ts(28,92): error TS2556`. Elle n'est pas de ce chantier, ne pas la corriger ici, mais vérifier qu'il n'y en a pas une deuxième.
- **Ne jamais lancer `npm run build` pendant qu'un `next dev` tourne** (même `.next/`, ENOENT trompeurs). Arrêter le serveur de dev d'abord.
- **Le français vouvoie.** `src/lib/copy-register.test.ts` parcourt tout `messages/fr.json` et échoue sur `tu`, `ton`, `ta`, `tes`, `toi`, `t'`.
- **Aucune flèche (`→`, `->`) ni tiret cadratin (`—`) dans la copie visible**, ni dans les textes générés (le prompt l'interdit, `stripEmDash` le garantit).
- **Tous les styles sont inline** (`style={{}}`), hover via `onMouseEnter`/`onMouseLeave`. Pas de classe Tailwind.
- **Tokens couleur** : utiliser les valeurs exactes de `globals.css`. Page mémorial sombre : fond `#1C1410`, texte `#F7F2EA`, accent `#C8813A`, Georgia serif. Formulaire clair : fond `#F7F2EA`, cartes `#FDFAF5`, texte `#3D2B1F`, texte doux `#7A5C44`, bordure `rgba(61,43,31,.08)`, radius 20 à 24 pour les cartes, 100 pour les boutons pill.
- **Aucune ligne `pets` sans propriétaire.** PP-1 n'écrit que dans `public_pages` et dans le bucket. Ne toucher à aucune policy RLS de `pets`.
- **Aucune donnée personnelle dans une URL.** Le `claimToken` transite par le corps des requêtes et `localStorage`, jamais dans le lien partagé.
- **Ne jamais retourner un détail d'erreur interne** (Anthropic, Supabase) au client : logger côté serveur, renvoyer un code générique.
- **Gel du pipeline d'impression du 7 novembre au 31 décembre** : ce chantier ne touche ni `book-pdf`, ni `paginateBook`, ni `gelato/order`. Rien à faire, juste ne pas dériver.
- **Décision d'échappement, à ne pas inverser** : les souvenirs et le chapitre sont stockés **bruts** et rendus par React, qui échappe déjà. Les passer par `escapeHtml` avant stockage afficherait `&#x27;` à l'écran, ce qui est inacceptable dans une copie française pleine d'apostrophes. `escapeXml` reste obligatoire à l'intérieur du prompt, et lui seul.

**Table déjà en base** (migration `supabase/migrations/add_public_pages_2026_09_16.sql`, posée par PP-0) :

```
public_pages(id, slug unique, kind 'memorial'|'living', locale 'en'|'fr',
  pet_name, species, birthdate, deceased_at, photo_url, memories jsonb,
  story_title, story_content, claim_token_hash, claimed_by, claimed_pet_id,
  claimed_at, creator_ip_hash, country, view_count, status, created_at, expires_at)
```

RLS activée, **aucune policy** : service role seul. RPC `increment_public_page_view(p_slug text)`, révoquée pour `anon` et `authenticated`, accordée à `service_role`.

⚠️ **Avant de lancer la moindre vérification navigateur**, la migration doit être appliquée en base de production (`.env.local` pointe la même base). Si `POST /api/public-pages` renvoie une erreur Supabase du type `relation "public_pages" does not exist`, c'est cela : demander à Julien de l'exécuter dans l'éditeur SQL Supabase.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `src/lib/public-page.ts` (créer) | Logique pure : types, validation d'entrée, génération de slug, construction du prompt. **Zéro import serveur** (seulement `@/lib/html`), donc importable partout et testable. |
| `src/lib/public-page.test.ts` (créer) | Tests Vitest de ce module. |
| `src/app/api/public-pages/route.ts` (créer) | `POST` : limites, honeypot, validation, appel Claude, insertion, renvoie `{ slug, claimToken }`. |
| `src/app/api/public-pages/photo/route.ts` (créer) | `POST` multipart : limites, type et taille, upload service role, renvoie `{ url }`. |
| `src/app/p/[slug]/page.tsx` (créer) | Server component : lecture service role, `noindex`, OG, incrément de vue, rendu sombre ou clair selon `kind`. |
| `src/components/public-page/PublicPageActions.tsx` (créer) | Client : bouton de partage, bandeau créateur lu dans `localStorage`, encart de réclamation. |
| `src/components/public-page/PublicPageForm.tsx` (créer) | Client : formulaire complet, recadrage, upload, appel de création, redirection. |
| `src/app/memorial/new/page.tsx` (créer) | Server : metadata EN, monte le formulaire avec `locale="en"`. |
| `src/app/fr/memorial/new/page.tsx` (créer) | Server : metadata FR, monte le formulaire avec `locale="fr"`. |
| `messages/en.json`, `messages/fr.json` (modifier) | Nouvelle section `public_page`. |
| `CLAUDE.md` (modifier) | Routes API, pages clés, session. |

---

### Task 1: Module pur `public-page.ts`

**Files:**
- Create: `src/lib/public-page.ts`
- Test: `src/lib/public-page.test.ts`

**Interfaces:**
- Consumes: `escapeXml` de `@/lib/html`.
- Produces:
  - `type PageKind = "memorial" | "living"`
  - `type PageLocale = "en" | "fr"`
  - `interface PublicPageInput { kind: PageKind; locale: PageLocale; petName: string; species: string; birthdate: string | null; deceasedAt: string | null; memories: string[] }`
  - `type ValidationError = "invalid_kind" | "invalid_locale" | "invalid_name" | "invalid_species" | "invalid_birthdate" | "invalid_deceased_at" | "invalid_memories"`
  - `type ValidationResult = { ok: true; value: PublicPageInput } | { ok: false; error: ValidationError }`
  - `function validatePublicPageInput(raw: unknown, today: string): ValidationResult`
  - `function generateSlug(bytes: Uint8Array): string`
  - `function buildPublicPagePrompt(input: PublicPageInput): string`

- [ ] **Step 1: Write the failing test**

Créer `src/lib/public-page.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import {
  validatePublicPageInput,
  generateSlug,
  buildPublicPagePrompt,
  type PublicPageInput,
} from "./public-page";

const TODAY = "2026-09-16";

const validBody = {
  kind: "memorial",
  locale: "fr",
  petName: "Coco",
  species: "dog",
  birthdate: "2012-04-01",
  deceasedAt: "2026-08-30",
  memories: [
    "Il dormait toujours contre la porte d'entree en attendant le retour.",
    "Le premier jour a la maison, il a renverse la gamelle deux fois.",
  ],
};

describe("validatePublicPageInput", () => {
  it("accepte une entree complete et renvoie la valeur normalisee", () => {
    const r = validatePublicPageInput(validBody, TODAY);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.petName).toBe("Coco");
      expect(r.value.memories).toHaveLength(2);
    }
  });

  it("rogne les espaces autour du nom et des souvenirs", () => {
    const r = validatePublicPageInput(
      { ...validBody, petName: "  Coco  " },
      TODAY,
    );
    expect(r.ok && r.value.petName).toBe("Coco");
  });

  it("refuse un nom trop court", () => {
    const r = validatePublicPageInput({ ...validBody, petName: "C" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_name" });
  });

  it("refuse un nom trop long", () => {
    const r = validatePublicPageInput({ ...validBody, petName: "x".repeat(41) }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_name" });
  });

  it("refuse une espece hors liste", () => {
    const r = validatePublicPageInput({ ...validBody, species: "dragon" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_species" });
  });

  it("refuse un kind inconnu", () => {
    const r = validatePublicPageInput({ ...validBody, kind: "ghost" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_kind" });
  });

  it("refuse une locale inconnue", () => {
    const r = validatePublicPageInput({ ...validBody, locale: "de" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_locale" });
  });

  it("exige une date de depart pour un memorial", () => {
    const r = validatePublicPageInput({ ...validBody, deceasedAt: null }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_deceased_at" });
  });

  it("refuse une date de depart dans le futur", () => {
    const r = validatePublicPageInput({ ...validBody, deceasedAt: "2026-09-17" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_deceased_at" });
  });

  it("accepte une date de depart egale a aujourd'hui", () => {
    const r = validatePublicPageInput({ ...validBody, deceasedAt: TODAY }, TODAY);
    expect(r.ok).toBe(true);
  });

  it("ignore la date de depart pour une page d'animal vivant", () => {
    const r = validatePublicPageInput(
      { ...validBody, kind: "living", deceasedAt: null },
      TODAY,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.deceasedAt).toBeNull();
  });

  it("refuse une naissance posterieure au depart", () => {
    const r = validatePublicPageInput(
      { ...validBody, birthdate: "2026-09-01", deceasedAt: "2026-08-30" },
      TODAY,
    );
    expect(r).toEqual({ ok: false, error: "invalid_birthdate" });
  });

  it("refuse une date mal formee", () => {
    const r = validatePublicPageInput({ ...validBody, birthdate: "01/04/2012" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_birthdate" });
  });

  it("accepte une naissance absente", () => {
    const r = validatePublicPageInput({ ...validBody, birthdate: null }, TODAY);
    expect(r.ok).toBe(true);
  });

  it("refuse moins de deux souvenirs", () => {
    const r = validatePublicPageInput({ ...validBody, memories: [validBody.memories[0]] }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_memories" });
  });

  it("refuse plus de trois souvenirs", () => {
    const r = validatePublicPageInput(
      { ...validBody, memories: [...validBody.memories, validBody.memories[0], validBody.memories[1]] },
      TODAY,
    );
    expect(r).toEqual({ ok: false, error: "invalid_memories" });
  });

  it("refuse un souvenir trop court", () => {
    const r = validatePublicPageInput(
      { ...validBody, memories: [validBody.memories[0], "trop court"] },
      TODAY,
    );
    expect(r).toEqual({ ok: false, error: "invalid_memories" });
  });

  it("refuse un souvenir trop long", () => {
    const r = validatePublicPageInput(
      { ...validBody, memories: [validBody.memories[0], "x".repeat(401)] },
      TODAY,
    );
    expect(r).toEqual({ ok: false, error: "invalid_memories" });
  });

  it("refuse un corps qui n'est pas un objet", () => {
    expect(validatePublicPageInput(null, TODAY).ok).toBe(false);
    expect(validatePublicPageInput("x", TODAY).ok).toBe(false);
  });
});

describe("generateSlug", () => {
  it("rend dix caracteres base62", () => {
    const slug = generateSlug(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(slug).toBe("0123456789");
  });

  it("replie les octets au-dela de 62", () => {
    const slug = generateSlug(new Uint8Array([62, 63, 124, 0, 0, 0, 0, 0, 0, 0]));
    expect(slug.slice(0, 3)).toBe("010");
  });

  it("n'utilise que des caracteres alphanumeriques", () => {
    const bytes = new Uint8Array(10);
    for (let i = 0; i < 10; i++) bytes[i] = i * 25;
    expect(generateSlug(bytes)).toMatch(/^[0-9A-Za-z]{10}$/);
  });
});

describe("buildPublicPagePrompt", () => {
  const input: PublicPageInput = {
    kind: "memorial",
    locale: "fr",
    petName: "Coco",
    species: "dog",
    birthdate: "2012-04-01",
    deceasedAt: "2026-08-30",
    memories: validBody.memories,
  };

  it("ecrit dans la langue de la page", () => {
    expect(buildPublicPagePrompt(input)).toContain("in French");
    expect(buildPublicPagePrompt({ ...input, locale: "en" })).toContain("in English");
  });

  it("isole les donnees utilisateur dans des balises fermees", () => {
    const p = buildPublicPagePrompt(input);
    expect(p).toContain("<pet_details>");
    expect(p).toContain("</pet_details>");
    expect(p).toContain("<memories>");
    expect(p).toContain("</memories>");
  });

  it("echappe le XML des donnees utilisateur", () => {
    const p = buildPublicPagePrompt({
      ...input,
      petName: "<script>alert(1)</script>",
    });
    expect(p).not.toContain("<script>");
    expect(p).toContain("&lt;script&gt;");
  });

  it("demande une lettre d'adieu pour un memorial", () => {
    expect(buildPublicPagePrompt(input)).toContain("farewell");
  });

  it("demande un premier chapitre pour un animal vivant", () => {
    const p = buildPublicPagePrompt({ ...input, kind: "living", deceasedAt: null });
    expect(p).toContain("first chapter");
    expect(p).not.toContain("farewell");
  });

  it("interdit le tiret cadratin", () => {
    expect(buildPublicPagePrompt(input)).toContain("NEVER use the em dash");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/public-page.test.ts`
Expected: FAIL, `Failed to resolve import "./public-page"`.

- [ ] **Step 3: Write the implementation**

Créer `src/lib/public-page.ts` :

```ts
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
 *  donc aucun fuseau horaire n'entre dans la décision. */
function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v));
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
      ? `This is a farewell letter. ${name} has passed away, and writes one last time to the human who loved them.

Write 250-350 words, in three short paragraphs.
- Open on a sensory image of an ordinary shared moment, not on the death itself.
- Weave in the memories above, transformed into narrative. Never list them.
- Close on reassurance and gratitude, addressed directly to the reader.

Tone rules:
- Tender, calm, grateful. Never morbid, never dramatic.
- Never mention how they died, a cause, an illness, or a veterinarian.
- Never use the words "rainbow bridge".`
      : `This is the first chapter of ${name}'s journal, written by ${name}.

Write 250-350 words, in three short paragraphs.
- Open on who ${name} is: their habits, their character, the texture of their days.
- Weave in the memories above, transformed into narrative. Never list them.
- Close on a tender, forward-looking note about the life still ahead.

Tone rules:
- Warm, intimate, slightly playful.`;

  return `You are writing for Everypaw, a pet life-journal.

IMPORTANT: Write entirely in ${lang}. Do not use any other language.

${shared}

${brief}

Style rules (follow strictly):
- First-person voice: ${name} is the narrator throughout (I, me, my).
- Use the name ${name} at least twice, naturally.
- Reference the species at least once.
- NEVER use the em dash character (—). Use commas, periods, or parentheses instead.

Also generate a short evocative title, 5 words maximum.

You MUST respond with valid JSON only, no other text:
{"title": "...", "story": "..."}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/public-page.test.ts`
Expected: PASS, 28 tests.

- [ ] **Step 5: Run the whole suite and the type-checker**

Run: `npm test` puis `npx tsc --noEmit`
Expected: tous verts ; `tsc` ne montre que l'erreur préexistante de `stripe/webhook/route.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/public-page.ts src/lib/public-page.test.ts
git commit -m "feat(public-pages): validation, slug et prompt d'une page sans compte"
```

---

### Task 2: Copie bilingue

**Files:**
- Modify: `messages/en.json` (nouvelle clé racine `public_page`)
- Modify: `messages/fr.json` (même clé, mêmes sous-clés)

**Interfaces:**
- Produces: la section `public_page` lue par les tâches 5 et 6 via `getTranslations(locale).public_page`.

- [ ] **Step 1: Ajouter la section anglaise**

Dans `messages/en.json`, ajouter au niveau racine (à côté de `memorial_landing`) :

```json
"public_page": {
  "form_title": "A page for {name}",
  "form_title_empty": "A page to remember them",
  "form_intro": "Three memories are enough. We write the rest, and you get a page you can keep and share.",
  "name_label": "Their name",
  "name_placeholder": "Coco",
  "species_label": "They were a",
  "species_dog": "Dog",
  "species_cat": "Cat",
  "species_other": "Other",
  "birthdate_label": "Born (optional)",
  "deceased_label": "The day they left",
  "photo_label": "A photo (optional)",
  "photo_button": "Choose a photo",
  "photo_change": "Change photo",
  "crop_title": "Crop the photo",
  "crop_cancel": "Cancel",
  "crop_confirm": "Confirm",
  "memories_label": "Three memories",
  "memories_hint": "The third one is optional. A few sentences each, the small details matter most.",
  "memory_placeholder_1": "Something they always did",
  "memory_placeholder_2": "A day you still think about",
  "memory_placeholder_3": "What you miss most",
  "submit": "Create their page",
  "submitting": "Writing their chapter",
  "submitting_hint": "This takes about twenty seconds.",
  "error_name": "Their name needs between 2 and 40 characters.",
  "error_species": "Please pick one.",
  "error_birthdate": "Please check this date.",
  "error_deceased": "Please add the day they left. It cannot be in the future.",
  "error_memories": "Each memory needs between 20 and 400 characters, and we need at least two.",
  "error_photo": "This photo could not be uploaded. Try another one, or continue without.",
  "error_rate_limited": "A lot of pages were created today. Please come back tomorrow.",
  "error_generation": "We could not write this chapter. Your words are still here, please try again.",
  "creator_banner": "Keep this link. It is how you come back to this page.",
  "copy_link": "Copy the link",
  "copied": "Link copied",
  "share": "Share",
  "claim_title": "Is this page yours?",
  "claim_body": "Add it to an Everypaw account to keep it forever, edit it, and gather these memories into a printed book.",
  "claim_cta": "Claim this page",
  "memories_heading": "Memories",
  "expired_title": "This page has expired",
  "expired_body": "Pages created without an account are kept for thirty days.",
  "not_found": "This page does not exist.",
  "report": "Report this page",
  "book_title": "Their story, in a book you can hold",
  "book_cta": "See the book"
},
```

- [ ] **Step 2: Ajouter la section française**

Dans `messages/fr.json`, au même niveau. **Vouvoiement obligatoire**, aucune flèche, aucun tiret cadratin :

```json
"public_page": {
  "form_title": "Une page pour {name}",
  "form_title_empty": "Une page pour se souvenir",
  "form_intro": "Trois souvenirs suffisent. Nous écrivons le reste, et vous repartez avec une page à garder et à partager.",
  "name_label": "Son nom",
  "name_placeholder": "Coco",
  "species_label": "C'était un",
  "species_dog": "Chien",
  "species_cat": "Chat",
  "species_other": "Autre",
  "birthdate_label": "Né le (facultatif)",
  "deceased_label": "Le jour de son départ",
  "photo_label": "Une photo (facultatif)",
  "photo_button": "Choisir une photo",
  "photo_change": "Changer de photo",
  "crop_title": "Recadrer la photo",
  "crop_cancel": "Annuler",
  "crop_confirm": "Confirmer",
  "memories_label": "Trois souvenirs",
  "memories_hint": "Le troisième est facultatif. Quelques phrases chacun, ce sont les petits détails qui comptent.",
  "memory_placeholder_1": "Quelque chose qu'il faisait toujours",
  "memory_placeholder_2": "Un jour auquel vous repensez encore",
  "memory_placeholder_3": "Ce qui vous manque le plus",
  "submit": "Créer sa page",
  "submitting": "Nous écrivons son chapitre",
  "submitting_hint": "Comptez une vingtaine de secondes.",
  "error_name": "Son nom doit faire entre 2 et 40 caractères.",
  "error_species": "Merci d'en choisir une.",
  "error_birthdate": "Merci de vérifier cette date.",
  "error_deceased": "Merci d'indiquer le jour de son départ. Il ne peut pas être dans le futur.",
  "error_memories": "Chaque souvenir doit faire entre 20 et 400 caractères, et il en faut au moins deux.",
  "error_photo": "Cette photo n'a pas pu être envoyée. Essayez-en une autre, ou continuez sans.",
  "error_rate_limited": "Beaucoup de pages ont été créées aujourd'hui. Revenez demain.",
  "error_generation": "Nous n'avons pas réussi à écrire ce chapitre. Vos mots sont toujours là, réessayez.",
  "creator_banner": "Conservez ce lien. C'est par lui que vous revenez sur cette page.",
  "copy_link": "Copier le lien",
  "copied": "Lien copié",
  "share": "Partager",
  "claim_title": "Cette page est la vôtre ?",
  "claim_body": "Ajoutez-la à un compte Everypaw pour la garder, la modifier, et rassembler ces souvenirs dans un livre imprimé.",
  "claim_cta": "Réclamer cette page",
  "memories_heading": "Souvenirs",
  "expired_title": "Cette page a expiré",
  "expired_body": "Les pages créées sans compte sont conservées trente jours.",
  "not_found": "Cette page n'existe pas.",
  "report": "Signaler cette page",
  "book_title": "Son histoire, dans un livre à tenir en main",
  "book_cta": "Voir le livre"
},
```

- [ ] **Step 3: Vérifier le registre et la parité**

Run: `npx vitest run src/lib/copy-register.test.ts`
Expected: PASS. En cas d'échec, l'offenseur est nommé avec sa clé, corriger le tutoiement.

Vérifier que les deux fichiers portent exactement les mêmes sous-clés :

```bash
node -e "const a=Object.keys(require('./messages/en.json').public_page).sort(),b=Object.keys(require('./messages/fr.json').public_page).sort();console.log(JSON.stringify(a)===JSON.stringify(b)?'PARITE OK':'DIFF: '+a.filter(k=>!b.includes(k)).concat(b.filter(k=>!a.includes(k))).join(','))"
```

Expected: `PARITE OK`

- [ ] **Step 4: Vérifier l'absence de flèche et de tiret cadratin**

```bash
node -e "const s=JSON.stringify(require('./messages/fr.json').public_page)+JSON.stringify(require('./messages/en.json').public_page);const bad=[...s.matchAll(/→|->|—/g)];console.log(bad.length?'TROUVE '+bad.length:'PROPRE')"
```

Expected: `PROPRE`

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/fr.json
git commit -m "feat(public-pages): copie bilingue du formulaire et de la page"
```

---

### Task 3: Route de création `POST /api/public-pages`

**Files:**
- Create: `src/app/api/public-pages/route.ts`

**Interfaces:**
- Consumes: `validatePublicPageInput`, `generateSlug`, `buildPublicPagePrompt` (tâche 1) ; `callClaude`, `parseStoryResponse`, `AnthropicError` de `@/lib/anthropic` ; `stripEmDash` de `@/lib/story` ; `checkRateLimitDb`, `getClientIp` de `@/lib/rate-limit` ; `getServiceSupabase` de `@/lib/supabase/service` ; `log` de `@/lib/log`.
- Produces: `POST /api/public-pages` renvoyant `201 { slug: string, claimToken: string }`, ou `{ error }` avec le statut adapté. Codes d'erreur consommés par la tâche 6 : `rate_limited` (429), `generation_failed` (502), `invalid_*` (400), `insert_failed` (500).

- [ ] **Step 1: Écrire la route**

Créer `src/app/api/public-pages/route.ts` :

```ts
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { callClaude, parseStoryResponse, AnthropicError } from "@/lib/anthropic";
import { stripEmDash } from "@/lib/story";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { validatePublicPageInput, generateSlug, buildPublicPagePrompt } from "@/lib/public-page";
import { log } from "@/lib/log";

/** Une génération dure ~15 s, au-delà du défaut de 10 s du plan Hobby. */
export const maxDuration = 60;

const PER_IP_PER_DAY = 3;
const GLOBAL_PER_DAY = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Deux plafonds, dans cet ordre. Le premier protège contre un visiteur qui
  // s'acharne, le second protège la facture Anthropic contre plusieurs
  // visiteurs à la fois. `checkRateLimitDb` échoue ouvert, d'où le second.
  const perIp = await checkRateLimitDb(`public-page:${ip}`, PER_IP_PER_DAY, DAY_MS);
  if (!perIp.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const global = await checkRateLimitDb("public-page:global", GLOBAL_PER_DAY, DAY_MS);
  if (!global.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot : un vrai visiteur ne remplit jamais ce champ, il est masqué.
  // Réponse volontairement indiscernable d'un succès, sans rien écrire.
  if (body.website) {
    return NextResponse.json({ slug: "", claimToken: "" }, { status: 201 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const parsed = validatePublicPageInput(body, today);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const photoUrl =
    typeof body.photoUrl === "string" && body.photoUrl.startsWith("https://")
      ? body.photoUrl
      : null;

  let title: string;
  let content: string;
  try {
    const text = await callClaude({ prompt: buildPublicPagePrompt(input), maxTokens: 800 });
    const story = parseStoryResponse(text);
    title = stripEmDash(story.title).slice(0, 120);
    content = stripEmDash(story.story);
  } catch (err) {
    log.error("[public-pages] generation failed:", err instanceof AnthropicError ? err.message : err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const claimToken = randomBytes(32).toString("hex");
  const supabase = getServiceSupabase();

  // Le slug est aléatoire : une collision est improbable mais pas impossible,
  // et la contrainte unique la transformerait en 500. Trois essais suffisent.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug(randomBytes(10));
    const { error } = await supabase.from("public_pages").insert({
      slug,
      kind: input.kind,
      locale: input.locale,
      pet_name: input.petName,
      species: input.species,
      birthdate: input.birthdate,
      deceased_at: input.deceasedAt,
      photo_url: photoUrl,
      memories: input.memories,
      story_title: title,
      story_content: content,
      claim_token_hash: sha256(claimToken),
      creator_ip_hash: sha256(ip),
      country: req.headers.get("x-vercel-ip-country"),
    });

    if (!error) return NextResponse.json({ slug, claimToken }, { status: 201 });
    if (error.code !== "23505") {
      log.error("[public-pages] insert failed:", error.message);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
  }

  log.error("[public-pages] slug collision after 3 attempts");
  return NextResponse.json({ error: "insert_failed" }, { status: 500 });
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: seule l'erreur préexistante de `stripe/webhook/route.test.ts`.

- [ ] **Step 3: Vérifier le refus d'une entrée invalide, sans appeler Claude**

Démarrer le serveur de dev (`npm run dev`, il écoute sur 3000 ou le premier port libre), puis :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/public-pages \
  -H 'content-type: application/json' \
  -d '{"kind":"memorial","locale":"fr","petName":"C","species":"dog","deceasedAt":"2026-08-30","memories":["aaaaaaaaaaaaaaaaaaaaaa","bbbbbbbbbbbbbbbbbbbbbb"]}'
```

Expected: `400`. La validation passe avant l'appel Claude, donc aucun jeton n'est consommé.

- [ ] **Step 4: Vérifier une création complète**

```bash
curl -s -X POST http://localhost:3000/api/public-pages \
  -H 'content-type: application/json' \
  -d '{"kind":"memorial","locale":"fr","petName":"Coco","species":"dog","birthdate":"2012-04-01","deceasedAt":"2026-08-30","memories":["Il dormait toujours contre la porte en attendant le retour.","Le premier jour a la maison, il a renverse la gamelle deux fois."]}'
```

Expected: `201` avec `{"slug":"...","claimToken":"..."}`. Noter le slug, il sert aux tâches 5 et 7.

Si la réponse est une erreur Supabase sur `public_pages`, la migration de PP-0 n'est pas appliquée en base : s'arrêter et le signaler.

- [ ] **Step 5: Vérifier le honeypot**

```bash
curl -s -X POST http://localhost:3000/api/public-pages \
  -H 'content-type: application/json' -d '{"website":"http://spam.example"}'
```

Expected: `{"slug":"","claimToken":""}`, et **aucune ligne de plus** dans `public_pages`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/public-pages/route.ts
git commit -m "feat(public-pages): route de creation, plafonnee et honeypotee"
```

---

### Task 4: Route d'upload photo `POST /api/public-pages/photo`

**Files:**
- Create: `src/app/api/public-pages/photo/route.ts`

**Interfaces:**
- Consumes: `checkRateLimitDb`, `getClientIp`, `getServiceSupabase`, `log`.
- Produces: `POST /api/public-pages/photo`, corps `multipart/form-data` avec un champ `file`, renvoyant `{ url: string }`. Codes d'erreur consommés par la tâche 6 : `rate_limited` (429), `invalid_file` (400), `upload_failed` (500).

- [ ] **Step 1: Écrire la route**

Créer `src/app/api/public-pages/photo/route.ts` :

```ts
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Plus permissif que la création : un visiteur peut changer d'avis de photo
  // plusieurs fois avant de valider sa page.
  const { allowed } = await checkRateLimitDb(`public-page-photo:${ip}`, 10, DAY_MS);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  if (!file || file.size === 0 || file.size > MAX_BYTES || !TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  // Le nom du fichier vient de nous, jamais du client : un nom fourni pourrait
  // remonter dans l'arborescence du bucket.
  const path = `public/${randomUUID()}.jpg`;
  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, await file.arrayBuffer(), { contentType: "image/jpeg", upsert: false });

  if (error) {
    log.error("[public-pages/photo] upload failed:", error.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: seule l'erreur préexistante.

- [ ] **Step 3: Vérifier le refus d'un type non image**

```bash
echo "pas une image" > /tmp/ep.txt
curl -s -X POST http://localhost:3000/api/public-pages/photo -F "file=@/tmp/ep.txt"
```

Expected: `{"error":"invalid_file"}`

- [ ] **Step 4: Vérifier un upload réel**

Prendre n'importe quel JPEG du poste, puis :

```bash
curl -s -X POST http://localhost:3000/api/public-pages/photo -F "file=@/chemin/vers/photo.jpg;type=image/jpeg"
```

Expected: `{"url":"https://....supabase.co/storage/v1/object/public/pet-photos/public/<uuid>.jpg"}`. Ouvrir l'URL dans un navigateur : l'image s'affiche, sans authentification.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/public-pages/photo/route.ts
git commit -m "feat(public-pages): upload photo en service role, type et taille bornes"
```

---

### Task 5: La page `/p/[slug]`

**Files:**
- Create: `src/app/p/[slug]/page.tsx`
- Create: `src/components/public-page/PublicPageActions.tsx`

**Interfaces:**
- Consumes: `getServiceSupabase`, `getTranslations`, la section i18n `public_page` (tâche 2), `PublicFooter` (props `variant?: "full" | "minimal"`, `locale?: Locale`).
- Produces: la route publique `/p/<slug>`, et le composant `PublicPageActions({ slug, url, petName, locale })`.

- [ ] **Step 1: Écrire le composant client d'actions**

Créer `src/components/public-page/PublicPageActions.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";

/**
 * Le bandeau « conservez ce lien » n'apparaît que pour le créateur de la page,
 * reconnu au jeton que son navigateur a rangé à la création. Les autres
 * visiteurs ne voient que le partage et l'encart de réclamation.
 *
 * localStorage peut lever (navigation privée, stockage bloqué) : tout accès
 * est enveloppé, et la page reste correcte sans lui.
 */
export default function PublicPageActions({
  slug,
  url,
  petName,
  locale,
}: {
  slug: string;
  url: string;
  petName: string;
  locale: Locale;
}) {
  const t = getTranslations(locale).public_page;
  const [isCreator, setIsCreator] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setIsCreator(Boolean(window.localStorage.getItem(`ep_claim_${slug}`)));
    } catch {
      setIsCreator(false);
    }
  }, [slug]);

  // Déclenché sans await : une promesse attendue avant share() ferait perdre
  // l'activation utilisateur, et l'appel échouerait en silence sur mobile.
  const share = () => {
    if (navigator.share) {
      navigator.share({ title: petName, url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: ".625rem 1.5rem",
    borderRadius: 100,
    fontSize: ".85rem",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    background: "rgba(200,129,58,.15)",
    border: "1px solid rgba(200,129,58,.3)",
    color: "#C8813A",
  } as const;

  return (
    <>
      {isCreator && (
        <div
          style={{
            background: "rgba(200,129,58,.08)",
            border: "1px solid rgba(200,129,58,.2)",
            borderRadius: 14,
            padding: "1rem 1.25rem",
            marginBottom: "2.5rem",
            fontSize: ".85rem",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            color: "rgba(247,242,234,.7)",
            textAlign: "center",
          }}
        >
          {t.creator_banner}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: ".75rem", marginBottom: "3rem" }}>
        <button type="button" onClick={share} style={pill}>
          {copied ? t.copied : t.share}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Écrire la page serveur**

Créer `src/app/p/[slug]/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getTranslations, type Locale } from "@/lib/i18n";
import PublicFooter from "@/components/PublicFooter";
import PublicPageActions from "@/components/public-page/PublicPageActions";

// Le compteur de vues s'incrémente à chaque requête : rien ne doit être mis en cache.
export const dynamic = "force-dynamic";

const SLUG_REGEX = /^[0-9A-Za-z]{10}$/;

interface PublicPageRow {
  slug: string;
  kind: "memorial" | "living";
  locale: Locale;
  pet_name: string;
  species: string | null;
  birthdate: string | null;
  deceased_at: string | null;
  photo_url: string | null;
  memories: string[];
  story_title: string;
  story_content: string;
  status: string;
  expires_at: string;
  claimed_pet_id: string | null;
}

/**
 * Service role obligatoire : `public_pages` a RLS activée sans aucune policy,
 * donc la clé anon ne lit rien. La clé ne quitte pas le serveur et la lecture
 * est filtrée par slug.
 */
async function loadPage(slug: string): Promise<PublicPageRow | null> {
  if (!SLUG_REGEX.test(slug)) return null;
  const { data } = await getServiceSupabase()
    .from("public_pages")
    .select(
      "slug, kind, locale, pet_name, species, birthdate, deceased_at, photo_url, memories, story_title, story_content, status, expires_at, claimed_pet_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as PublicPageRow | null) ?? null;
}

function isVisible(page: PublicPageRow | null): page is PublicPageRow {
  if (!page) return false;
  if (page.status === "hidden") return false;
  // Une page réclamée ne périme jamais ; une page active périme à 30 jours.
  if (page.status === "active" && new Date(page.expires_at) < new Date()) return false;
  return true;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!isVisible(page)) return { title: "Everypaw", robots: { index: false, follow: false } };

  const isFr = page.locale === "fr";
  const title = isFr ? `En mémoire de ${page.pet_name}` : `Remembering ${page.pet_name}`;
  const living = isFr ? `L'histoire de ${page.pet_name}` : `${page.pet_name}'s story`;
  const heading = page.kind === "memorial" ? title : living;
  const description = page.story_content.slice(0, 160);

  return {
    title: `${heading} · Everypaw`,
    description,
    // Ces pages ne sont pas du contenu de site : elles se partagent par lien.
    robots: { index: false, follow: false },
    openGraph: {
      title: heading,
      description,
      siteName: "Everypaw",
      type: "website",
      ...(page.photo_url
        ? { images: [{ url: page.photo_url, width: 800, height: 800, alt: page.pet_name }] }
        : {}),
    },
    twitter: {
      card: page.photo_url ? "summary_large_image" : "summary",
      title: heading,
      description,
      ...(page.photo_url ? { images: [page.photo_url] } : {}),
    },
  };
}

export default async function PublicPage({ params }: { params: { slug: string } }) {
  const page = await loadPage(params.slug);
  const t = getTranslations(page?.locale ?? "en").public_page;

  if (!isVisible(page)) {
    const expired = page?.status === "active";
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#1C1410",
          color: "rgba(247,242,234,.6)",
          fontFamily: "Georgia, serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: ".75rem",
          padding: "2rem 1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "1.2rem", margin: 0 }}>{expired ? t.expired_title : t.not_found}</p>
        {expired && (
          <p style={{ fontSize: ".9rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 300, margin: 0, opacity: 0.7 }}>
            {t.expired_body}
          </p>
        )}
      </div>
    );
  }

  // Compteur de vues. Un échec ne doit jamais empêcher la page de s'afficher.
  await getServiceSupabase()
    .rpc("increment_public_page_view", { p_slug: page.slug })
    .then(
      () => undefined,
      () => undefined,
    );

  const isFr = page.locale === "fr";
  const dateLocale = isFr ? "fr-FR" : "en-US";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
  const url = `${appUrl}/p/${page.slug}`;

  const born = page.birthdate
    ? new Date(page.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    : null;
  const passed = page.deceased_at
    ? new Date(page.deceased_at).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" })
    : null;

  const dark = page.kind === "memorial";
  const bg = dark ? "#1C1410" : "#F7F2EA";
  const ink = dark ? "#F7F2EA" : "#3D2B1F";
  const soft = dark ? "rgba(247,242,234,.55)" : "#7A5C44";
  const faint = dark ? "rgba(247,242,234,.3)" : "#9A8070";
  const rule = dark ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.08)";

  return (
    <div style={{ minHeight: "100dvh", background: bg, color: ink, fontFamily: "Georgia, serif" }}>
      <nav
        style={{
          padding: "1.5rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${rule}`,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: soft,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: ".4rem",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
      </nav>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          {page.photo_url ? (
            <img
              src={page.photo_url}
              alt={page.pet_name}
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(200,129,58,.3)",
                display: "block",
                margin: "0 auto 2rem",
              }}
            />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: "rgba(200,129,58,.08)",
                border: "2px solid rgba(200,129,58,.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                margin: "0 auto 2rem",
              }}
            >
              🐾
            </div>
          )}

          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 600, margin: "0 0 1rem", lineHeight: 1.1 }}>
            {page.pet_name}
          </h1>

          {(born || passed) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                fontSize: ".85rem",
                color: faint,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 300,
              }}
            >
              {born && <span>{isFr ? "Né en" : "Born"} {born}</span>}
              {born && passed && <span style={{ fontSize: ".6rem" }}>•</span>}
              {passed && <span>{isFr ? "Parti le" : "Passed"} {passed}</span>}
            </div>
          )}

          <div style={{ margin: "2.5rem auto", width: 48, height: 1, background: "rgba(200,129,58,.3)" }} />
        </div>

        <article style={{ marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, textAlign: "center", margin: "0 0 2rem" }}>
            {page.story_title}
          </h2>
          {page.story_content.split(/\n\n+/).map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: "1rem",
                lineHeight: 1.9,
                color: soft,
                margin: "0 0 1.5rem",
                fontWeight: 300,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {para}
            </p>
          ))}
        </article>

        <section style={{ borderTop: `1px solid ${rule}`, paddingTop: "2.5rem", marginBottom: "3rem" }}>
          <div
            style={{
              fontSize: ".65rem",
              fontWeight: 500,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "rgba(200,129,58,.7)",
              marginBottom: "1.5rem",
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.memories_heading}
          </div>
          {page.memories.map((memory, i) => (
            <p
              key={i}
              style={{
                fontSize: ".95rem",
                fontStyle: "italic",
                lineHeight: 1.8,
                color: soft,
                margin: "0 0 1.25rem",
                fontWeight: 300,
              }}
            >
              {memory}
            </p>
          ))}
        </section>

        <PublicPageActions slug={page.slug} url={url} petName={page.pet_name} locale={page.locale} />

        {/* L'invitation vit en pied de page, jamais en en-tête : une pastille
            commerciale en tête d'une page de deuil se lit comme une bannière.
            PP-2 remplacera ce lien par la réclamation réelle. */}
        <div style={{ textAlign: "center", borderTop: `1px solid ${rule}`, paddingTop: "3rem" }}>
          <p style={{ fontSize: "1rem", fontStyle: "italic", color: soft, marginBottom: ".75rem" }}>
            {t.claim_title}
          </p>
          <p
            style={{
              fontSize: ".85rem",
              color: faint,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: 420,
              margin: "0 auto 1.5rem",
            }}
          >
            {t.claim_body}
          </p>
          <Link
            href={`/auth/signup?next=${encodeURIComponent(`/p/${page.slug}?claim=1`)}`}
            style={{
              display: "inline-block",
              background: "rgba(200,129,58,.15)",
              border: "1px solid rgba(200,129,58,.3)",
              color: "#C8813A",
              padding: ".625rem 1.5rem",
              borderRadius: 100,
              fontSize: ".85rem",
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.claim_cta}
          </Link>

          <div style={{ marginTop: "2.5rem" }}>
            <Link
              href={`/contact?subject=${encodeURIComponent(`Signalement /p/${page.slug}`)}`}
              style={{ fontSize: ".75rem", color: faint, fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}
            >
              {t.report}
            </Link>
          </div>
        </div>
      </main>

      {!dark && <PublicFooter variant="minimal" locale={page.locale} />}
    </div>
  );
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: seule l'erreur préexistante.

- [ ] **Step 4: Ouvrir la page dans un navigateur**

Avec le slug obtenu à la tâche 3, ouvrir `http://localhost:3000/p/<slug>`.

À vérifier :
- Photo, nom, dates, titre, chapitre en trois paragraphes, souvenirs, bouton de partage, encart de réclamation, lien de signalement.
- Le bandeau « Conservez ce lien » **n'apparaît pas** (ce navigateur n'a pas le jeton).
- Le fond est sombre (`#1C1410`), la copie est en français.
- Aucune erreur dans la console.

Puis simuler le créateur, dans la console du navigateur :

```js
localStorage.setItem('ep_claim_<slug>', 'x'); location.reload();
```

Expected: le bandeau apparaît.

- [ ] **Step 5: Vérifier le `noindex` et l'OG**

```bash
curl -s http://localhost:3000/p/<slug> | grep -oE '<meta name="robots"[^>]*>|<meta property="og:[^>]*>' | head
```

Expected: `noindex` présent, `og:title` et `og:image` présents.

- [ ] **Step 6: Vérifier un slug inexistant**

Ouvrir `http://localhost:3000/p/0000000000`.
Expected: message « Cette page n'existe pas. » en anglais (`locale` par défaut), pas d'erreur 500.

- [ ] **Step 7: Vérifier le compteur de vues**

Recharger la page trois fois, puis vérifier `view_count` dans Supabase (ou via un `select` service role). Expected: il a augmenté d'autant.

- [ ] **Step 8: Commit**

```bash
git add src/app/p src/components/public-page/PublicPageActions.tsx
git commit -m "feat(public-pages): page publique /p/[slug], noindex, OG, partage"
```

---

### Task 6: Le formulaire de création

**Files:**
- Create: `src/components/public-page/PublicPageForm.tsx`
- Create: `src/app/memorial/new/page.tsx`
- Create: `src/app/fr/memorial/new/page.tsx`

**Interfaces:**
- Consumes: `compressImage` de `@/lib/image` ; `Cropper` et `type Area` de `react-easy-crop` ; `getTranslations` ; les routes des tâches 3 et 4 ; la section i18n `public_page`.
- Produces: `PublicPageForm({ kind, locale })`, monté par les deux routes serveur.

- [ ] **Step 1: Écrire le composant de formulaire**

Créer `src/components/public-page/PublicPageForm.tsx` :

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { compressImage } from "@/lib/image";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { PageKind } from "@/lib/public-page";

/** Recadrage carré 400×400, identique au flux de `pets/new`. */
async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.9);
    };
    img.onerror = reject;
  });
}

const SPECIES = ["dog", "cat", "other"] as const;

export default function PublicPageForm({ kind, locale }: { kind: PageKind; locale: Locale }) {
  const t = getTranslations(locale).public_page;
  const router = useRouter();

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [birthdate, setBirthdate] = useState("");
  const [deceasedAt, setDeceasedAt] = useState("");
  const [memories, setMemories] = useState(["", "", ""]);
  const [website, setWebsite] = useState(""); // honeypot

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const today = new Date().toISOString().slice(0, 10);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !area) return;
    const blob = await getCroppedBlob(cropSrc, area);
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const setMemory = (i: number, value: string) => {
    setMemories((prev) => prev.map((m, j) => (j === i ? value : m)));
  };

  const handleSubmit = async () => {
    setError("");

    // Validation côté client : l'erreur arrive avant l'attente de vingt
    // secondes. Le serveur revalide tout, c'est lui qui fait foi.
    const filled = memories.map((m) => m.trim()).filter((m) => m.length > 0);
    if (petName.trim().length < 2 || petName.trim().length > 40) return setError(t.error_name);
    if (kind === "memorial" && (!deceasedAt || deceasedAt > today)) return setError(t.error_deceased);
    if (birthdate && birthdate > today) return setError(t.error_birthdate);
    if (filled.length < 2 || filled.some((m) => m.length < 20 || m.length > 400)) {
      return setError(t.error_memories);
    }

    setStatus("loading");

    let photoUrl: string | null = null;
    if (photoBlob) {
      try {
        const compressed = await compressImage(new File([photoBlob], "photo.jpg", { type: "image/jpeg" }));
        const form = new FormData();
        form.append("file", new File([compressed], "photo.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/public-pages/photo", { method: "POST", body: form });
        if (!res.ok) throw new Error("upload");
        photoUrl = (await res.json()).url;
      } catch {
        setStatus("idle");
        return setError(t.error_photo);
      }
    }

    try {
      const res = await fetch("/api/public-pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          locale,
          petName: petName.trim(),
          species,
          birthdate: birthdate || null,
          deceasedAt: kind === "memorial" ? deceasedAt : null,
          memories: filled,
          photoUrl,
          website,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("idle");
        if (data.error === "rate_limited") return setError(t.error_rate_limited);
        if (data.error === "generation_failed") return setError(t.error_generation);
        return setError(t.error_generation);
      }

      // Le jeton ne voyage jamais dans l'URL : il reste dans ce navigateur, et
      // c'est lui qui prouvera plus tard que ce visiteur a créé la page.
      try {
        window.localStorage.setItem(`ep_claim_${data.slug}`, data.claimToken);
      } catch {
        // Navigation privée : la page existe quand même, le lien suffit.
      }
      router.push(`/p/${data.slug}`);
    } catch {
      setStatus("idle");
      setError(t.error_generation);
    }
  };

  const field = {
    width: "100%",
    padding: ".75rem 1rem",
    borderRadius: 12,
    border: "1.5px solid rgba(61,43,31,.15)",
    background: "#FDFAF5",
    color: "#3D2B1F",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: ".95rem",
    fontWeight: 300,
  } as const;

  const label = {
    display: "block",
    fontSize: ".8rem",
    fontWeight: 500,
    color: "#7A5C44",
    marginBottom: ".4rem",
    fontFamily: "'DM Sans', sans-serif",
  } as const;

  if (status === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
        {/* Animation volontairement réduite à une opacité pulsée, neutralisée
            par la règle globale prefers-reduced-motion de globals.css. */}
        <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem", animation: "epPulse 2s ease-in-out infinite" }}>🐾</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#3D2B1F", margin: "0 0 .5rem" }}>
          {t.submitting}
        </h2>
        <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, fontFamily: "'DM Sans', sans-serif" }}>
          {t.submitting_hint}
        </p>
        <style>{"@keyframes epPulse{0%,100%{opacity:.35}50%{opacity:1}}"}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 1.5rem 5rem" }}>
      {cropSrc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(28,18,10,.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "1.5rem", width: "100%", maxWidth: 420 }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1rem" }}>
              {t.crop_title}
            </h3>
            <div style={{ position: "relative", width: "100%", height: 300, borderRadius: 12, overflow: "hidden", background: "#000" }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: "100%", margin: "1rem 0 .5rem", accentColor: "#C8813A" }}
            />
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                style={{ flex: 1, padding: ".6rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer" }}
              >
                {t.crop_cancel}
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                style={{ flex: 2, padding: ".6rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer" }}
              >
                {t.crop_confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "#FDFAF5",
          borderRadius: 24,
          padding: "2rem",
          border: "1px solid rgba(61,43,31,.08)",
          boxShadow: "0 4px 40px rgba(61,43,31,.06)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <label style={label} htmlFor="ep-name">{t.name_label}</label>
          <input
            id="ep-name"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder={t.name_placeholder}
            maxLength={40}
            style={field}
          />
        </div>

        <div>
          <span style={label}>{t.species_label}</span>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {SPECIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecies(s)}
                style={{
                  flex: 1,
                  padding: ".6rem",
                  borderRadius: 100,
                  border: species === s ? "1.5px solid #C8813A" : "1.5px solid rgba(61,43,31,.15)",
                  background: species === s ? "rgba(200,129,58,.1)" : "transparent",
                  color: species === s ? "#B5712E" : "#7A5C44",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: ".875rem",
                  cursor: "pointer",
                }}
              >
                {s === "dog" ? t.species_dog : s === "cat" ? t.species_cat : t.species_other}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 180px" }}>
            <label style={label} htmlFor="ep-born">{t.birthdate_label}</label>
            <input id="ep-born" type="date" max={today} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={field} />
          </div>
          {kind === "memorial" && (
            <div style={{ flex: "1 1 180px" }}>
              <label style={label} htmlFor="ep-passed">{t.deceased_label}</label>
              <input id="ep-passed" type="date" max={today} value={deceasedAt} onChange={(e) => setDeceasedAt(e.target.value)} style={field} />
            </div>
          )}
        </div>

        <div>
          <span style={label}>{t.photo_label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {photoPreview && (
              <img src={photoPreview} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
            )}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: ".6rem 1.25rem",
                borderRadius: 100,
                border: "1.5px solid rgba(61,43,31,.15)",
                color: "#7A5C44",
                fontSize: ".875rem",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              {photoPreview ? t.photo_change : t.photo_button}
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <div>
          <label style={label} htmlFor="ep-memory-0">{t.memories_label}</label>
          <p style={{ fontSize: ".8rem", color: "#9A8070", fontWeight: 300, fontFamily: "'DM Sans', sans-serif", margin: "0 0 .75rem", lineHeight: 1.6 }}>
            {t.memories_hint}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {[0, 1, 2].map((i) => (
              <textarea
                key={i}
                id={`ep-memory-${i}`}
                value={memories[i]}
                onChange={(e) => setMemory(i, e.target.value)}
                placeholder={[t.memory_placeholder_1, t.memory_placeholder_2, t.memory_placeholder_3][i]}
                maxLength={400}
                rows={3}
                style={{ ...field, resize: "vertical" }}
              />
            ))}
          </div>
        </div>

        {/* Honeypot : hors écran, jamais rempli par un humain. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />

        {error && (
          <div
            role="alert"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: ".875rem",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: ".85rem",
            borderRadius: 100,
            border: "none",
            background: "#C8813A",
            color: "#FDFAF5",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Écrire la route anglaise**

Créer `src/app/memorial/new/page.tsx` :

```tsx
import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import PublicPageForm from "@/components/public-page/PublicPageForm";

export const metadata: Metadata = {
  title: "Create a memorial page | Everypaw",
  description:
    "Three memories are enough. We write their chapter, and you get a page to keep and share, with no account needed.",
  alternates: {
    canonical: "/memorial/new",
    languages: { en: "/memorial/new", fr: "/fr/memorial/new", "x-default": "/memorial/new" },
  },
  openGraph: {
    title: "Create a memorial page | Everypaw",
    description: "Three memories are enough. We write the rest.",
    url: "/memorial/new",
    siteName: "Everypaw",
    type: "website",
  },
};

export default function MemorialNewPage() {
  const t = getTranslations("en").public_page;
  return (
    <div style={{ minHeight: "100dvh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="en" />
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "3.5rem 1.5rem 2.5rem", textAlign: "center" }}>
        <div aria-hidden style={{ fontSize: "1.75rem", opacity: 0.5, marginBottom: "1.25rem" }}>🕊️</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.9rem, 5vw, 2.6rem)", fontWeight: 600, lineHeight: 1.15, color: "#3D2B1F", margin: "0 0 1rem" }}>
          {t.form_title_empty}
        </h1>
        <p style={{ fontSize: "1rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: 0 }}>
          {t.form_intro}
        </p>
      </section>
      <PublicPageForm kind="memorial" locale="en" />
      <PublicFooter variant="minimal" locale="en" localeSwitch={{ href: "/fr/memorial/new", label: "Voir en français" }} />
    </div>
  );
}
```

- [ ] **Step 3: Écrire la route française**

Créer `src/app/fr/memorial/new/page.tsx`, identique à l'exception de la locale, des metadata et du lien de bascule :

```tsx
import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import PublicPageForm from "@/components/public-page/PublicPageForm";

export const metadata: Metadata = {
  title: "Créer une page mémorial | Everypaw",
  description:
    "Trois souvenirs suffisent. Nous écrivons son chapitre, et vous repartez avec une page à garder et à partager, sans créer de compte.",
  alternates: {
    canonical: "/fr/memorial/new",
    languages: { en: "/memorial/new", fr: "/fr/memorial/new", "x-default": "/memorial/new" },
  },
  openGraph: {
    title: "Créer une page mémorial | Everypaw",
    description: "Trois souvenirs suffisent. Nous écrivons le reste.",
    url: "/fr/memorial/new",
    siteName: "Everypaw",
    type: "website",
    locale: "fr_FR",
  },
};

export default function MemorialNewPageFr() {
  const t = getTranslations("fr").public_page;
  return (
    <div style={{ minHeight: "100dvh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="fr" />
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "3.5rem 1.5rem 2.5rem", textAlign: "center" }}>
        <div aria-hidden style={{ fontSize: "1.75rem", opacity: 0.5, marginBottom: "1.25rem" }}>🕊️</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.9rem, 5vw, 2.6rem)", fontWeight: 600, lineHeight: 1.15, color: "#3D2B1F", margin: "0 0 1rem" }}>
          {t.form_title_empty}
        </h1>
        <p style={{ fontSize: "1rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: 0 }}>
          {t.form_intro}
        </p>
      </section>
      <PublicPageForm kind="memorial" locale="fr" />
      <PublicFooter variant="minimal" locale="fr" localeSwitch={{ href: "/memorial/new", label: "See in English" }} />
    </div>
  );
}
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: seule l'erreur préexistante.

⚠️ Si l'erreur « importing a component that needs next/headers » apparaît, c'est que `PublicPageForm` tire une chaîne d'imports serveur. `@/lib/public-page` n'importe que `@/lib/html`, et `@/lib/i18n` ne lit que du JSON : vérifier qu'aucun import serveur n'a été ajouté par mégarde.

- [ ] **Step 5: Vérifier le parcours dans un navigateur**

Ouvrir `http://localhost:3000/fr/memorial/new`. Remplir : nom `Pixel`, espèce chat, date de départ d'hier, deux souvenirs de plus de 20 caractères. Valider.

Expected : écran d'attente puis redirection vers `/p/<slug>`, avec le bandeau « Conservez ce lien » visible (ce navigateur a le jeton).

- [ ] **Step 6: Vérifier les refus**

Sur `/fr/memorial/new`, valider avec un nom d'un caractère : l'encart rouge apparaît, la requête n'est pas envoyée (onglet Réseau vide). Même chose avec un seul souvenir rempli.

- [ ] **Step 7: Vérifier la version anglaise et le mobile**

Ouvrir `/memorial/new` : toute la copie est anglaise. Passer la fenêtre en 375 px de large : aucun défilement horizontal, les champs restent lisibles, les boutons font au moins 44 px de haut.

- [ ] **Step 8: Commit**

```bash
git add src/components/public-page/PublicPageForm.tsx src/app/memorial/new src/app/fr/memorial/new
git commit -m "feat(public-pages): formulaire de creation bilingue, recadrage et upload"
```

---

### Task 7: Vérification de bout en bout et documentation

**Files:**
- Modify: `CLAUDE.md` (routes API, pages clés, entrée de session)

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: rien de nouveau, c'est la porte de sortie du chantier.

- [ ] **Step 1: Vérifier l'échappement d'une entrée hostile**

Créer une page dont le premier souvenir contient `<script>alert(1)</script>` et dont le nom contient `<b>gras</b>`.

Expected: sur `/p/<slug>`, les deux s'affichent **en texte littéral**, sans balise interprétée et **sans entité visible** du genre `&lt;`. Aucune alerte ne s'ouvre.

- [ ] **Step 2: Vérifier le plafond par IP**

Créer une quatrième page depuis le même navigateur dans la même journée.

Expected: l'encart rouge affiche « Beaucoup de pages ont été créées aujourd'hui. Revenez demain. », et les champs saisis sont toujours là.

Pour reprendre les tests ensuite, remettre le compteur à zéro dans l'éditeur SQL Supabase :

```sql
delete from rate_limits where key like 'public-page%';
```

- [ ] **Step 3: Vérifier le partage**

Sur `/p/<slug>` en desktop, cliquer « Partager » : le lien est copié et le libellé passe à « Lien copié ». En émulation mobile, la feuille de partage native s'ouvre (ou, à défaut dans le navigateur de test, la copie s'effectue sans erreur en console).

- [ ] **Step 4: Arrêter le serveur de dev, puis construire**

Run: `npm run build`
Expected: succès. `/p/[slug]` apparaît en dynamique (`ƒ`), `/memorial/new` et `/fr/memorial/new` en statique ou dynamique selon le layout racine, sans erreur.

- [ ] **Step 5: Relancer la suite complète**

Run: `npm test` puis `npx tsc --noEmit`
Expected: tous les tests verts, aucune nouvelle erreur de type.

- [ ] **Step 6: Mettre à jour CLAUDE.md**

Dans le tableau « Routes API », ajouter :

```
| `/api/public-pages` | Création d'une page sans compte (PP-1) — 3/jour/IP et 200/jour global, honeypot, génération Claude, renvoie `{ slug, claimToken }` |
| `/api/public-pages/photo` | Upload photo d'une page sans compte — service role, 5 Mo, jpeg/png/webp, 10/jour/IP |
```

Dans le tableau « Pages clés », ajouter :

```
| `/p/[slug]` | Page publique créée sans compte — `noindex`, OG, compteur de vues, partage, encart de réclamation |
| `/memorial/new`, `/fr/memorial/new` | Formulaire de création sans compte, langue figée par URL |
```

Dans « Historique des sessions », compléter l'entrée de session en cours avec PP-1 : ce qui est livré, et le fait que la réclamation reste PP-2. Si le fichier dépasse 750 lignes, déplacer la session la plus ancienne des deux vers `docs/SESSIONS.md`.

- [ ] **Step 7: Commit et PR**

```bash
git add CLAUDE.md
git commit -m "docs: PP-1, routes et pages des pages sans compte"
git push -u origin feat/pp1-public-pages
```

Ouvrir la PR vers `main`, en rappelant dans le corps :
- la migration PP-0 doit être appliquée en production avant le merge ;
- la réclamation, les hommages en attente et la redirection après réclamation sont PP-2 ;
- la purge à 30 jours est PP-5, donc les pages de test créées ici resteront en base jusque-là.

---

## Ce que PP-1 ne fait pas

À ne pas ajouter en cours de route, chacun a sa spec :

- **La réclamation réelle** (RPC `claim_public_page`, création de l'animal, hommages en attente, redirection 308) : PP-2. En PP-1 le bouton mène à l'inscription et s'arrête là.
- **Le CTA des landings `/memorial` et `/fr/memorial`** vers le nouveau formulaire : PP-3.
- **La porte B**, pages d'animaux vivants depuis la landing d'accueil : PP-4, conditionnée à une mesure. Le `kind: "living"` est déjà porté de bout en bout, mais aucune route ne le monte. Piège pour ce jour-là : la copie de PP-1 est écrite au passé (`C'était un`, `They were a`), elle demandera une variante au présent, pas une réutilisation.
- **Le cron de purge à 30 jours** et le paragraphe des pages légales : PP-5, à livrer avant la première publication en communauté.
- **Une interface de modération** : un lien de signalement vers `/contact` suffit ; `status='hidden'` se pose à la main en SQL.

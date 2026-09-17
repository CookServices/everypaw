import { describe, it, expect } from "vitest";
import {
  validatePublicPageInput,
  generateSlug,
  buildPublicPagePrompt,
  isSafePhotoUrl,
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

  it("refuse un 30 février pour une naissance", () => {
    const r = validatePublicPageInput({ ...validBody, birthdate: "2012-02-30" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_birthdate" });
  });

  it("refuse un 31 avril pour une date de départ", () => {
    const r = validatePublicPageInput({ ...validBody, deceasedAt: "2026-04-31" }, TODAY);
    expect(r).toEqual({ ok: false, error: "invalid_deceased_at" });
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

describe("isSafePhotoUrl", () => {
  it("accepte une URL https de longueur normale", () => {
    expect(isSafePhotoUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("refuse une URL http", () => {
    expect(isSafePhotoUrl("http://example.com/photo.jpg")).toBe(false);
  });

  it("refuse une URL de plus de 500 caracteres", () => {
    const url = "https://example.com/" + "a".repeat(481);
    expect(url.length).toBe(501);
    expect(isSafePhotoUrl(url)).toBe(false);
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

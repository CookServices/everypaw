/**
 * The French copy of the app is written in vouvoiement, and it had drifted.
 *
 * The emails were normalised first: the retention series, the first-story
 * nudge and seven of the fifty-two weekly interview questions addressed the
 * reader as "tu", and the weekly reminder managed both registers in the same
 * message. The in-app strings followed: household members, the onboarding
 * question, the book widget and an auth error.
 *
 * This walks every string in the French bundle, not only the email ones.
 */
import { describe, it, expect } from "vitest";
import fr from "../../messages/fr.json";

// Hand-rolled word boundary: \b is ASCII-only and would flag "était" or "côté".
const TUTOIEMENT = /(^|[^A-Za-zÀ-ÿ])(tu|ton|ta|tes|toi|t')($|[^A-Za-zÀ-ÿ])/i;

/**
 * Keys where the reader is addressing their pet rather than the app addressing
 * the reader. Tutoiement is right there. Empty today: the one example, the
 * dedication placeholder "À toi, notre fidèle compagnon", lives in a component
 * rather than in the bundle.
 */
const ADDRESSED_TO_THE_PET: string[] = [];

function leaves(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      leaves(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

describe("french copy", () => {
  it("addresses the reader as vous, everywhere", () => {
    const offenders = leaves(fr, "")
      .filter(([key]) => !ADDRESSED_TO_THE_PET.includes(key))
      .filter(([, text]) => TUTOIEMENT.test(text))
      .map(([key, text]) => `${key}: ${text}`);

    expect(offenders).toEqual([]);
  });
});

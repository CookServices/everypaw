/**
 * The French copy of the app is written in vouvoiement. The email strings had
 * drifted: the retention series, the first-story nudge and seven of the weekly
 * interview questions addressed the reader as "tu", and the weekly reminder
 * managed both registers in the same message.
 *
 * These namespaces all end up in an email, so they are the ones guarded here.
 */
import { describe, it, expect } from "vitest";
import fr from "../../messages/fr.json";

const EMAIL_NAMESPACES = ["retention_emails", "first_story_nudge", "interview", "email"] as const;

// Hand-rolled word boundary: \b is ASCII-only, so an accented letter next to
// the match would read as a boundary and flag "était" or "côté".
const TUTOIEMENT = /(^|[^A-Za-zÀ-ÿ])(tu|ton|ta|tes|toi|t')($|[^A-Za-zÀ-ÿ])/i;

function leaves(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      leaves(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

describe("french email copy", () => {
  it.each(EMAIL_NAMESPACES)("addresses the reader as vous in %s", (namespace) => {
    const offenders = leaves((fr as Record<string, unknown>)[namespace], namespace)
      .filter(([, text]) => TUTOIEMENT.test(text))
      .map(([key, text]) => `${key}: ${text}`);

    expect(offenders).toEqual([]);
  });
});

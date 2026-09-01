/**
 * Cookie consent contract, shared by the banner that collects the decision and
 * the component that gates GA4 / Meta Pixel on it.
 *
 * The key is versioned: consent collected before 2026-09 was gathered under a
 * banner that claimed "no tracking" while both trackers already fired, so it was
 * not informed and cannot be relied on. Bumping the key re-asks everyone.
 */

export const CONSENT_KEY = "cookie_consent_v2";

/** Fired on `window` after a decision, so the same tab reacts without a reload. */
export const CONSENT_EVENT = "ep-consent-change";

export type ConsentValue = "accepted" | "refused";

const VALID: readonly string[] = ["accepted", "refused"];

/**
 * The stored decision, or null when the user has not chosen yet. Anything we do
 * not recognise counts as "not chosen": an unreadable value must never be
 * mistaken for consent.
 */
export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw !== null && VALID.includes(raw) ? (raw as ConsentValue) : null;
  } catch {
    // Private browsing and blocked-cookie settings make the accessor throw.
    return null;
  }
}

/**
 * Persists the decision and announces it. The announcement happens even when
 * persistence fails, so a user who consents in a locked-down browser still gets
 * the behaviour they asked for for the rest of the session.
 */
export function writeConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Ignored on purpose: see above.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * Drops the stored decision, which puts the visitor back in front of the banner.
 * This is how consent gets withdrawn: the GDPR asks for that to be as easy as
 * giving it, and the banner is the only place the choice is offered.
 */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Ignored on purpose: the event below still puts the banner back.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

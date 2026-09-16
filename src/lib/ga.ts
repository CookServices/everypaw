/**
 * GA4 events. `window.gtag` only exists once the visitor has accepted cookies
 * (see Trackers.tsx), so every call is a no-op before consent.
 */
export const gaEvent = (eventName: string, params?: Record<string, unknown>): void => {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
};

/** Marked as a key event in the GA4 property (manual step, see docs/acquisition/specs.md PP-0). */
export const trackSignUp = (method: "email"): void => {
  gaEvent("sign_up", { method });
};

import { timingSafeEqual } from "node:crypto";

/** Constant-time Bearer token verification. Fail-closed: returns false if header is null. */
export function verifyBearer(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false;
  const expected = `Bearer ${secret}`;
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Validate redirect_to against the app's own hostname. Returns fallback on invalid/missing input. */
export function validateRedirectTo(redirectTo: string | undefined, fallback: string): string {
  if (!redirectTo) return fallback;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
  try {
    const parsed = new URL(redirectTo);
    const allowed = new URL(appUrl).hostname;
    if (parsed.hostname !== allowed || parsed.protocol !== "https:") return fallback;
    return redirectTo;
  } catch {
    return fallback;
  }
}

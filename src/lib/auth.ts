import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

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

/**
 * Auth guard for cron routes. Returns a 401/500 Response if the request is not authorized,
 * or null if the request is valid. Usage: `const err = verifyCronRoute(req); if (err) return err;`
 */
export function verifyCronRoute(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("CRON_SECRET is not set or too short (min 32 chars)");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!verifyBearer(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
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

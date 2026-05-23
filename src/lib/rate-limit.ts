/**
 * In-memory rate limiter — NOT reliable on Vercel serverless.
 * State is lost on every cold start and is not shared across concurrent instances.
 * This provides a light deterrent only; it must NOT be relied upon for security-sensitive limits.
 * For enforceable limits use DB-based counting (see /api/generate) or Upstash Redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/** Extract a best-effort IP from Next.js request headers. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

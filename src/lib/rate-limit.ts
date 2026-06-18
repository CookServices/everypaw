import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

/**
 * Persistent, instance-shared rate limit backed by the `check_rate_limit`
 * Postgres function (atomic check-and-increment). Use this for enforceable
 * limits — it survives cold starts and is shared across serverless instances.
 *
 * Fails open: on any DB/RPC error the request is allowed, so an infra hiccup
 * never blocks legitimate users on these low-risk endpoints.
 */
export async function checkRateLimitDb(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: maxRequests,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) {
      log.error("[rate-limit] RPC error, failing open:", error.message);
      return { allowed: true };
    }
    return { allowed: data === true };
  } catch (e) {
    log.error("[rate-limit] unexpected error, failing open:", e);
    return { allowed: true };
  }
}

/**
 * In-memory rate limiter, NOT reliable on Vercel serverless.
 * State is lost on every cold start and is not shared across concurrent instances.
 * This provides a light deterrent only; it must NOT be relied upon for security-sensitive limits.
 * Prefer `checkRateLimitDb` above. Kept for any non-critical synchronous use.
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

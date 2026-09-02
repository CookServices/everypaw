import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/plan";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";

/**
 * Two callers, one behaviour.
 *
 * The /unsubscribe page posts `{ token }` as JSON. Mail clients acting on the
 * List-Unsubscribe-Post header (RFC 8058) post `List-Unsubscribe=One-Click` as
 * a form body to this same route with `?token=` in the query, and never read
 * the response body. Taking the token from either place keeps one code path.
 */
async function readToken(req: Request): Promise<string | null> {
  const fromQuery = new URL(req.url).searchParams.get("token");
  if (fromQuery) return fromQuery;
  try {
    const { token } = await req.json();
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { allowed } = await checkRateLimitDb(`unsub:${getClientIp(req)}`, 5, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const token = await readToken(req);

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Accept UUID or hex string of at least 32 characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hexRegex = /^[0-9a-f]{32,}$/i;
  if (!uuidRegex.test(token) && !hexRegex.test(token)) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { error, count } = await supabase
    .from("profiles")
    .update({ email_reminders: false }, { count: "exact" })
    .eq("unsubscribe_token", token);

  if (error || !count || count === 0) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

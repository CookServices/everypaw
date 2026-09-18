import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const SLUG_REGEX = /^[0-9A-Za-z]{10}$/;
const TOKEN_REGEX = /^[0-9a-f]{64}$/;

export async function POST(req: Request) {
  // Un jeton de 256 bits ne se devine pas, mais rien n'empêche d'essayer en
  // boucle : ce plafond rend la tentative inutile sans gêner un vrai créateur,
  // qui ne réclame qu'une poignée de pages.
  const { allowed } = await checkRateLimitDb(`claim:${getClientIp(req)}`, 20, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { slug?: unknown; claimToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { slug, claimToken } = body;
  if (typeof slug !== "string" || !SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (typeof claimToken !== "string" || !TOKEN_REGEX.test(claimToken)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Le jeton brut ne quitte jamais cette fonction : seule son empreinte part
  // en base, où seule l'empreinte est stockée.
  const tokenHash = createHash("sha256").update(claimToken).digest("hex");

  const { data, error } = await getServiceSupabase().rpc("claim_public_page", {
    p_slug: slug,
    p_token_hash: tokenHash,
    p_user: user.id,
  });

  if (error) {
    log.error("[public-pages/claim] rpc failed:", error.message);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  const result = data as { ok: boolean; reason?: string; pet_id?: string };
  if (!result?.ok) {
    if (result?.reason === "bad_token") {
      return NextResponse.json({ error: "bad_token" }, { status: 403 });
    }
    return NextResponse.json({ error: "not_claimable" }, { status: 409 });
  }

  return NextResponse.json({ petId: result.pet_id });
}

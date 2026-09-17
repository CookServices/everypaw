import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { callClaude, parseStoryResponse, AnthropicError } from "@/lib/anthropic";
import { stripEmDash } from "@/lib/story";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import {
  validatePublicPageInput,
  generateSlug,
  buildPublicPagePrompt,
  isSafePhotoUrl,
} from "@/lib/public-page";
import { log } from "@/lib/log";

/** Une génération dure ~15 s, au-delà du défaut de 10 s du plan Hobby. */
export const maxDuration = 60;

const PER_IP_PER_DAY = 3;
const GLOBAL_PER_DAY = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Honeypot : un vrai visiteur ne remplit jamais ce champ, il est masqué.
  // Réponse volontairement indiscernable d'un succès, sans rien écrire, et
  // avant tout aller-retour base (y compris les plafonds ci-dessous) : un
  // hit de honeypot ne doit rien coûter, ni en écriture ni en quota partagé.
  if (body.website) {
    return NextResponse.json({ slug: "", claimToken: "" }, { status: 201 });
  }

  // Ce plafond reste tôt : il borne un visiteur unique qui s'acharne, quel
  // que soit le contenu qu'il envoie.
  const perIp = await checkRateLimitDb(`public-page:${ip}`, PER_IP_PER_DAY, DAY_MS);
  if (!perIp.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const today = new Date().toISOString().slice(0, 10);
  const parsed = validatePublicPageInput(body, today);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const photoUrl = isSafePhotoUrl(body.photoUrl) ? body.photoUrl : null;

  // Ce plafond protège la facture Anthropic, donc il ne doit consommer une
  // unité que pour une requête sur le point d'appeler Claude pour de vrai :
  // vérifié seulement après le honeypot et la validation, juste avant l'appel.
  const global = await checkRateLimitDb("public-page:global", GLOBAL_PER_DAY, DAY_MS);
  if (!global.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let title: string;
  let content: string;
  try {
    const text = await callClaude({ prompt: buildPublicPagePrompt(input), maxTokens: 800 });
    const story = parseStoryResponse(text);
    title = stripEmDash(story.title).slice(0, 120);
    content = stripEmDash(story.story);
  } catch (err) {
    log.error("[public-pages] generation failed:", err instanceof AnthropicError ? err.message : err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const claimToken = randomBytes(32).toString("hex");
  const supabase = getServiceSupabase();

  // Le slug est aléatoire : une collision est improbable mais pas impossible,
  // et la contrainte unique la transformerait en 500. Trois essais suffisent.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug(randomBytes(10));
    const { error } = await supabase.from("public_pages").insert({
      slug,
      kind: input.kind,
      locale: input.locale,
      pet_name: input.petName,
      species: input.species,
      birthdate: input.birthdate,
      deceased_at: input.deceasedAt,
      photo_url: photoUrl,
      memories: input.memories,
      story_title: title,
      story_content: content,
      claim_token_hash: sha256(claimToken),
      creator_ip_hash: sha256(ip),
      country: req.headers.get("x-vercel-ip-country"),
    });

    if (!error) return NextResponse.json({ slug, claimToken }, { status: 201 });
    if (error.code !== "23505") {
      log.error("[public-pages] insert failed:", error.message);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
  }

  log.error("[public-pages] slug collision after 3 attempts");
  return NextResponse.json({ error: "insert_failed" }, { status: 500 });
}

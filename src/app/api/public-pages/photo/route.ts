import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const DAY_MS = 24 * 60 * 60 * 1000;

// `file.type` is only the Content-Type the client wrote in the multipart part
// header — nothing enforces that it matches the actual bytes. This route is
// unauthenticated and stores to a permanent, publicly readable URL, so a
// declared-type check alone would let anyone host arbitrary binary content
// under a `*.supabase.co/*.jpg` URL. Check the real file signature instead.
function hasImageSignature(bytes: Uint8Array): boolean {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return isJpeg || isPng || isWebp;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Plus permissif que la création : un visiteur peut changer d'avis de photo
  // plusieurs fois avant de valider sa page.
  const { allowed } = await checkRateLimitDb(`public-page-photo:${ip}`, 10, DAY_MS);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Plafond global : 2 photos par page au plafond de 200 pages/jour de la
  // route de création, pour borner l'abus de stockage agrégé sur toutes les IP.
  const global = await checkRateLimitDb("public-page-photo:global", 400, DAY_MS);
  if (!global.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  if (!file || file.size === 0 || file.size > MAX_BYTES || !TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasImageSignature(bytes)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400 });
  }

  // Le nom du fichier vient de nous, jamais du client : un nom fourni pourrait
  // remonter dans l'arborescence du bucket.
  const path = `public/${randomUUID()}.jpg`;
  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (error) {
    log.error("[public-pages/photo] upload failed:", error.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

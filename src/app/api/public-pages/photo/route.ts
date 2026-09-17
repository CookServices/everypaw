import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { checkRateLimitDb, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Plus permissif que la création : un visiteur peut changer d'avis de photo
  // plusieurs fois avant de valider sa page.
  const { allowed } = await checkRateLimitDb(`public-page-photo:${ip}`, 10, DAY_MS);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

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

  // Le nom du fichier vient de nous, jamais du client : un nom fourni pourrait
  // remonter dans l'arborescence du bucket.
  const path = `public/${randomUUID()}.jpg`;
  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, await file.arrayBuffer(), { contentType: "image/jpeg", upsert: false });

  if (error) {
    log.error("[public-pages/photo] upload failed:", error.message);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

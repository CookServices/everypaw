import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 48 * 60 * 60 * 1000; // 48h — Gelato may retry delivery

function getSecret(): string {
  if (!process.env.PDF_ACCESS_SECRET) {
    console.warn("[pdf-token] PDF_ACCESS_SECRET not set — falling back to SUPABASE_SERVICE_ROLE_KEY. Add PDF_ACCESS_SECRET to env vars.");
  }
  const s = process.env.PDF_ACCESS_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("PDF_ACCESS_SECRET not configured");
  return s;
}

export function generatePdfToken(petId: string): { token: string; expires: number } {
  const expires = Date.now() + TTL_MS;
  const token = createHmac("sha256", getSecret())
    .update(`${petId}:${expires}`)
    .digest("hex");
  return { token, expires };
}

export function validatePdfToken(petId: string, token: string, expiresStr: string | null): boolean {
  if (!expiresStr) return false;
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || Date.now() > expires) return false;
  const expected = createHmac("sha256", getSecret())
    .update(`${petId}:${expires}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

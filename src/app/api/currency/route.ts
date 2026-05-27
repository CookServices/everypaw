import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrencyFromCountry } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  const currency = getCurrencyFromCountry(country);
  const isFrance = country === "FR";
  return NextResponse.json({ currency, isFrance });
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { locale } = await req.json();
  
  if (!["en", "fr"].includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let locale: string;
  try {
    ({ locale } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!["en", "fr"].includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    // httpOnly intentionally omitted: useLocale reads this via document.cookie client-side
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}

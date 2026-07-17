import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
  description: "Everypaw is the AI pet journal that turns your daily moments into story chapters, and a printed pet memory book every year. Start free, no credit card.",
  metadataBase: new URL("https://everypaw.app"),
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
    description: "Everypaw is the AI pet journal that turns your daily moments into story chapters, and a printed pet memory book every year. Start free, no credit card.",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw, Your pet's life story, printed" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
    description: "Everypaw is the AI pet journal that turns your daily moments into story chapters, and a printed pet memory book every year. Start free, no credit card.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const lang = pathname.startsWith("/fr") ? "fr" : "en";

  return (
    <html lang={lang}>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Everypaw, Your pet's life story, printed",
  description: "Turn daily pet moments into AI-crafted stories and a hardcover book. Free pet journal, no credit card required.",
  metadataBase: new URL("https://everypaw.app"),
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Everypaw, Your pet's life story, printed",
    description: "Turn your pet's daily moments into a beautiful AI-crafted book.",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw, Your pet's life story, printed" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Everypaw, Your pet's life story, printed",
    description: "Turn your pet's daily moments into a beautiful AI-crafted book.",
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

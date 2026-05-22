import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Everypaw — Your pet's life story, printed",
  description: "Turn daily pet moments into AI-crafted stories and a hardcover book. Free pet journal — no credit card required.",
  metadataBase: new URL("https://everypaw.app"),
  icons: { icon: "/favicon.png" },
  alternates: {
    canonical: "https://everypaw.app",
    languages: {
      "en": "https://everypaw.app",
      "fr": "https://everypaw.app/fr",
      "x-default": "https://everypaw.app",
    },
  },
  openGraph: {
    title: "Everypaw — Your pet's life story, printed",
    description: "Turn your pet's daily moments into a beautiful AI-crafted book.",
    url: "https://everypaw.app",
    siteName: "Everypaw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Everypaw — Your pet's life story, printed",
    description: "Turn your pet's daily moments into a beautiful AI-crafted book.",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Everypaw — Your pet's life story, printed",
  description: "Everypaw turns your daily moments into AI-crafted narratives and a beautiful printed book — one chapter at a time.",
  metadataBase: new URL("https://everypaw.app"),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

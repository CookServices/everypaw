import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gift a Pet Journal & Memory Book | Everypaw",
  description:
    "Give the pet lover in your life 12 months of memories: an AI-crafted journal and a hardcover keepsake book, delivered by email, from $4.99.",
  alternates: { canonical: "/gift" },
  openGraph: {
    title: "Gift a Pet Journal & Memory Book | Everypaw",
    description:
      "Give the pet lover in your life 12 months of memories: an AI-crafted journal and a hardcover keepsake book, delivered by email, from $4.99.",
    url: "/gift",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Gift a Pet Journal & Memory Book | Everypaw" }],
  },
};

export default function GiftLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

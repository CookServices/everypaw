import type { Metadata } from "next";

const TITLE = "Journal animalier IA qui devient un livre imprimé | Everypaw";
const DESCRIPTION =
  "Le journal animalier IA qui transforme les moments de votre animal en chapitres d'histoire — et en un livre souvenir imprimé chaque année. Gratuit, sans carte.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/fr",
    languages: {
      "en": "/",
      "fr": "/fr",
      "x-default": "/",
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/fr",
    siteName: "Everypaw",
    type: "website",
    locale: "fr_FR",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw, la vie de votre animal, racontée et imprimée" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function FrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

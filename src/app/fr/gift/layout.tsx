import type { Metadata } from "next";

const TITLE = "Offrir un journal animalier et un livre souvenir | Everypaw";
const DESCRIPTION =
  "Offrez au passionné d'animaux de votre vie un journal IA et un livre souvenir relié, envoyé par email. À partir de 4,99 €.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/fr/gift",
    languages: {
      "en": "/gift",
      "fr": "/fr/gift",
      "x-default": "/gift",
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/fr/gift",
    siteName: "Everypaw",
    type: "website",
    locale: "fr_FR",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: TITLE }],
  },
};

export default function FrGiftLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

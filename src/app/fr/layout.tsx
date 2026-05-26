import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Everypaw — La vie de votre animal, racontée et imprimée",
  description: "Transformez les moments du quotidien de votre animal en histoires créées par l'IA et en un beau livre imprimé. Journal gratuit — aucune carte bancaire requise.",
  alternates: {
    canonical: "https://everypaw.app/fr",
    languages: {
      "en": "https://everypaw.app",
      "fr": "https://everypaw.app/fr",
      "x-default": "https://everypaw.app",
    },
  },
  openGraph: {
    title: "Everypaw — La vie de votre animal, racontée et imprimée",
    description: "Chaque moment de la vie de votre animal devient une histoire magnifique, imprimée en livre chaque année.",
    url: "https://everypaw.app/fr",
    siteName: "Everypaw",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Everypaw — La vie de votre animal, racontée et imprimée",
    description: "Chaque moment de la vie de votre animal devient une histoire magnifique, imprimée en livre chaque année.",
  },
};

export default function FrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

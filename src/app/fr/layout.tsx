import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Everypaw — L'histoire de vie de votre animal, imprimée",
  description: "Transformez les moments du quotidien de votre animal en histoires IA et en un beau livre relié. Journal gratuit — sans carte bancaire.",
  alternates: {
    canonical: "https://everypaw.app/fr",
    languages: {
      "en": "https://everypaw.app",
      "fr": "https://everypaw.app/fr",
      "x-default": "https://everypaw.app",
    },
  },
  openGraph: {
    title: "Everypaw — L'histoire de vie de votre animal, imprimée",
    description: "Transformez les moments de votre animal en un beau livre IA.",
    url: "https://everypaw.app/fr",
    siteName: "Everypaw",
    type: "website",
    locale: "fr_FR",
  },
};

export default function FrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

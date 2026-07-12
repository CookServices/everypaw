import { getTranslations } from "@/lib/i18n";
import Home from "../home-client";

export const dynamic = "force-dynamic";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Everypaw",
  url: "https://everypaw.app",
  logo: "https://everypaw.app/og-image.png",
  description: "Journal animalier IA qui transforme les moments du quotidien en chapitres d'histoire et en un livre relié imprimé chaque année.",
};

const APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Everypaw",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  url: "https://everypaw.app/fr",
  description: "Journal animalier IA pour chiens et chats. Transformez les moments du quotidien en chapitres d'histoire créés par l'IA et en un livre souvenir imprimé chaque année.",
  offers: [
    { "@type": "Offer", name: "Gratuit",         price: "0",    priceCurrency: "EUR" },
    { "@type": "Offer", name: "Premium Digital", price: "4.99", priceCurrency: "EUR" },
    { "@type": "Offer", name: "Premium Print",   price: "79",   priceCurrency: "EUR" },
  ],
};

// FAQPage schema built from the same i18n keys as the visible FAQ section
// (messages/fr.json → faq.q1..q6 / a1..a6) so the two never drift apart.
const faqFR = getTranslations("fr").faq;
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ([1, 2, 3, 4, 5, 6] as const).map((i) => ({
    "@type": "Question",
    name: faqFR[`q${i}`],
    acceptedAnswer: { "@type": "Answer", text: faqFR[`a${i}`] },
  })),
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <Home locale="fr" />
    </>
  );
}

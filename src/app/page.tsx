import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import Home from "./home-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: {
      "en": "/",
      "fr": "/fr",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "AI Pet Journal That Becomes a Printed Book | Everypaw",
    description: "Everypaw is the AI pet journal that turns your daily moments into story chapters — and a printed pet memory book every year. Start free, no credit card.",
    url: "/",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw, Your pet's life story, printed" }],
  },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Everypaw",
  url: "https://everypaw.app",
  logo: "https://everypaw.app/og-image.png",
  description: "AI-powered pet journal that turns daily moments into story chapters and an annual printed hardcover book.",
};

const APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Everypaw",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  url: "https://everypaw.app",
  description: "AI pet journal for dogs and cats. Turn daily moments into AI-crafted story chapters and a printed pet memory book every year.",
  offers: [
    { "@type": "Offer", name: "Free",            price: "0",    priceCurrency: "USD" },
    { "@type": "Offer", name: "Premium Digital", price: "4.99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Premium Print",   price: "79",   priceCurrency: "USD" },
  ],
};

// FAQPage schema built from the same i18n keys as the visible FAQ section
// (messages/en.json → faq.q1..q6 / a1..a6) so the two never drift apart.
const faqEN = getTranslations("en").faq;
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ([1, 2, 3, 4, 5, 6] as const).map((i) => ({
    "@type": "Question",
    name: faqEN[`q${i}`],
    acceptedAnswer: { "@type": "Answer", text: faqEN[`a${i}`] },
  })),
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSONLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <Home locale="en" />
    </>
  );
}

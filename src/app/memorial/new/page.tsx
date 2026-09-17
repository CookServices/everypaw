import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import PublicPageForm from "@/components/public-page/PublicPageForm";

export const metadata: Metadata = {
  title: "Create a memorial page | Everypaw",
  description:
    "Three memories are enough. We write their chapter, and you get a page to keep and share, with no account needed.",
  alternates: {
    canonical: "/memorial/new",
    languages: { en: "/memorial/new", fr: "/fr/memorial/new", "x-default": "/memorial/new" },
  },
  openGraph: {
    title: "Create a memorial page | Everypaw",
    description: "Three memories are enough. We write the rest.",
    url: "/memorial/new",
    siteName: "Everypaw",
    type: "website",
  },
};

export default function MemorialNewPage() {
  const t = getTranslations("en").public_page;
  return (
    <div style={{ minHeight: "100dvh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="en" />
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "3.5rem 1.5rem 2.5rem", textAlign: "center" }}>
        <div aria-hidden style={{ fontSize: "1.75rem", opacity: 0.5, marginBottom: "1.25rem" }}>🕊️</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.9rem, 5vw, 2.6rem)", fontWeight: 600, lineHeight: 1.15, color: "#3D2B1F", margin: "0 0 1rem" }}>
          {t.form_title_empty}
        </h1>
        <p style={{ fontSize: "1rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: 0 }}>
          {t.form_intro}
        </p>
      </section>
      <PublicPageForm kind="memorial" locale="en" />
      <PublicFooter variant="minimal" locale="en" localeSwitch={{ href: "/fr/memorial/new", label: "Voir en français" }} />
    </div>
  );
}

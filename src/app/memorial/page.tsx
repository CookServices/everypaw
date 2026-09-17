import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Pet Memorial Book & Memorial Page | Everypaw",
  description:
    "A gentle way to remember a pet you've lost: a dedicated memorial page and a hardcover pet memorial book gathering the stories of their life.",
  alternates: {
    canonical: "/memorial",
    languages: { en: "/memorial", fr: "/fr/memorial", "x-default": "/memorial" },
  },
  openGraph: {
    title: "Pet Memorial Book & Memorial Page | Everypaw",
    description:
      "A gentle way to remember a pet you've lost: a dedicated memorial page and a hardcover pet memorial book gathering the stories of their life.",
    url: "/memorial",
    siteName: "Everypaw",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Everypaw pet memorial" }],
  },
};

const SAGE = "#6B7B5E";
const SAGE_DARK = "#566349";

export default function MemorialLanding() {
  const t = getTranslations("en").memorial_landing;

  const sections = [
    { title: t.s1_title, body: t.s1_body },
    { title: t.s2_title, body: t.s2_body },
    { title: t.s3_title, body: t.s3_body },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="en" />

      {/* Hero */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "5rem 1.5rem 3.5rem", textAlign: "center" }}>
        <div aria-hidden style={{ fontSize: "1.75rem", opacity: 0.5, marginBottom: "1.25rem" }}>🕊️</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 600, lineHeight: 1.15, color: "#3D2B1F", margin: "0 0 1.25rem" }}>
          {t.hero_h1}
        </h1>
        <p style={{ fontSize: "1.05rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: 0 }}>
          {t.hero_sub}
        </p>
      </section>

      {/* Sections */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "0 1.5rem" }}>
        {sections.map(({ title, body }) => (
          <section
            key={title}
            style={{
              background: "#FDFAF5",
              borderRadius: 20,
              border: "1px solid rgba(61,43,31,.07)",
              padding: "2rem",
              marginBottom: "1.25rem",
            }}
          >
            <div aria-hidden style={{ width: 32, height: 3, borderRadius: 3, background: SAGE, marginBottom: "1.25rem" }} />
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .6rem" }}>
              {title}
            </h2>
            <p style={{ fontSize: ".98rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: 0 }}>
              {body}
            </p>
          </section>
        ))}
      </main>

      {/* Example: a real memory next to the real chapter it produced. The point
          of the whole page is that the writing is good; nothing argues that as
          well as showing it, so this sits directly above the CTA. */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem 1.5rem 0" }}>
        <div style={{ background: "#1C1410", borderRadius: 20, padding: "2rem", color: "#F7F2EA" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, margin: "0 0 1.5rem", textAlign: "center" }}>
            {t.example_label}
          </h2>

          <div style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(247,242,234,.4)", marginBottom: ".6rem" }}>
            {t.example_input_label}
          </div>
          <p style={{ fontSize: ".92rem", fontWeight: 300, lineHeight: 1.7, color: "rgba(247,242,234,.6)", margin: "0 0 1.75rem" }}>
            {t.example_input}
          </p>

          <div style={{ width: 32, height: 1, background: "rgba(200,129,58,.4)", margin: "0 0 1.75rem" }} />

          <div style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(200,129,58,.75)", marginBottom: ".6rem" }}>
            {t.example_output_label}
          </div>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontStyle: "italic", lineHeight: 1.85, color: "rgba(247,242,234,.88)", margin: 0 }}>
            {t.example_output}
          </p>
        </div>
        <p style={{ fontSize: ".78rem", fontWeight: 300, color: "#9A8070", textAlign: "center", margin: ".9rem 0 0" }}>
          {t.example_note}
        </p>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", textAlign: "center" }}>
        <Link
          href="/memorial/new"
          style={{
            display: "inline-block",
            background: SAGE,
            color: "#FDFAF5",
            padding: ".9rem 2.5rem",
            borderRadius: 100,
            fontSize: "1rem",
            fontWeight: 500,
            textDecoration: "none",
            boxShadow: `0 6px 20px ${SAGE_DARK}40`,
          }}
        >
          {t.cta}
        </Link>
        <p style={{ fontSize: ".85rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: "1rem auto 0", maxWidth: 420 }}>
          {t.cta_note}
        </p>
      </section>

      <PublicFooter variant="minimal" locale="en" />
    </div>
  );
}

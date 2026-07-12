import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Pet Memorial Book & Memorial Page | Everypaw",
  description:
    "A gentle way to remember a pet you've lost: a dedicated memorial page and a hardcover pet memorial book gathering the stories of their life.",
  alternates: { canonical: "/memorial" },
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

      {/* CTA */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", textAlign: "center" }}>
        <Link
          href="/auth/signup"
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
      </section>

      <PublicFooter variant="minimal" locale="en" />
    </div>
  );
}

import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import type { BlogPost } from "@/lib/blog";

/**
 * Shared article chrome: breadcrumb, ~680px reading column, readable typography
 * (Georgia titles / DM Sans body — codebase convention), and a discreet closing CTA.
 * Article pages provide only the body (H2/H3/p) as children; the H1 is the post title.
 */
export default function ArticleLayout({ post, children }: { post: BlogPost; children: React.ReactNode }) {
  const dateFmt = new Date(`${post.datePublished}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="en" />

      <style>{`
        .ep-article h1 { font-family: Georgia, serif; font-size: clamp(2rem, 4vw, 2.75rem); font-weight: 600; line-height: 1.15; color: #3D2B1F; margin: 0 0 .5rem; }
        .ep-article h2 { font-family: Georgia, serif; font-size: 1.5rem; font-weight: 600; color: #3D2B1F; margin: 2.5rem 0 .75rem; }
        .ep-article h3 { font-family: Georgia, serif; font-size: 1.15rem; font-weight: 600; color: #3D2B1F; margin: 1.75rem 0 .5rem; }
        .ep-article p  { font-size: 1.02rem; font-weight: 400; color: #3D2B1F; line-height: 1.8; margin: 0 0 1.15rem; }
        .ep-article ul, .ep-article ol { margin: 0 0 1.15rem; padding-left: 1.4rem; }
        .ep-article li { font-size: 1.02rem; font-weight: 400; color: #3D2B1F; line-height: 1.75; margin-bottom: .4rem; }
        .ep-article a { color: #C8813A; }
      `}</style>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: ".8rem", color: "#7A5C44", marginBottom: "2.5rem" }}>
          <Link href="/" style={{ color: "#7A5C44", textDecoration: "none" }}>Home</Link>
          <span style={{ opacity: 0.5, margin: "0 .35rem" }}>/</span>
          <Link href="/blog" style={{ color: "#7A5C44", textDecoration: "none" }}>Blog</Link>
          <span style={{ opacity: 0.5, margin: "0 .35rem" }}>/</span>
          <span style={{ color: "#3D2B1F" }}>{post.title}</span>
        </nav>

        <article className="ep-article">
          <h1>{post.title}</h1>
          <p style={{ fontSize: ".8rem", fontWeight: 300, color: "#9A8070", margin: "0 0 2.5rem" }}>{dateFmt}</p>
          {children}
        </article>

        {/* Discreet closing CTA → homepage */}
        <aside style={{ marginTop: "3.5rem", padding: "1.75rem", background: "#FDFAF5", border: "1px solid rgba(61,43,31,.08)", borderRadius: 16, textAlign: "center" }}>
          <p style={{ fontSize: ".95rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.6, margin: "0 0 1rem" }}>
            Everypaw turns your pet&rsquo;s daily moments into an AI-written story — and a printed book each year.
          </p>
          <Link
            href="/"
            style={{ display: "inline-block", padding: ".7rem 2rem", borderRadius: 100, border: "1.5px solid #C8813A", background: "transparent", color: "#C8813A", fontSize: ".9rem", fontWeight: 500, textDecoration: "none" }}
          >
            Discover Everypaw
          </Link>
        </aside>
      </main>

      <PublicFooter variant="minimal" locale="en" />
    </div>
  );
}

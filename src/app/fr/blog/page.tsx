import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import { getPublishedPostsFr } from "@/lib/blog";

export const metadata = {
  title: "Blog : conseils journal animalier & souvenirs | Everypaw",
  description:
    "Idées et guides pour capturer l'histoire de votre animal : prompts de journal, conservation des souvenirs, et création d'un livre souvenir imprimé qui dure.",
  alternates: {
    canonical: "/fr/blog",
    languages: { en: "/blog", fr: "/fr/blog", "x-default": "/blog" },
  },
  openGraph: {
    title: "Blog : conseils journal animalier & souvenirs | Everypaw",
    description:
      "Idées et guides pour capturer l'histoire de votre animal : prompts de journal, conservation des souvenirs, et création d'un livre souvenir imprimé qui dure.",
    url: "/fr/blog",
    siteName: "Everypaw",
    type: "website",
    locale: "fr_FR",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Le blog Everypaw" }],
  },
};

export default function BlogIndexFr() {
  const posts = getPublishedPostsFr();

  const dateFmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" locale="fr" />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "3.5rem 1.5rem 5rem" }}>
        <header style={{ marginBottom: "3rem" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .75rem" }}>
            Le Journal Everypaw
          </h1>
          <p style={{ fontSize: "1.05rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
            Idées et guides pour capturer l&rsquo;histoire de votre animal : prompts de journal, conservation des
            souvenirs, et livres souvenirs.
          </p>
        </header>

        {posts.length === 0 ? (
          <p style={{ fontSize: "1rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.7 }}>
            De nouveaux articles arrivent bientôt. Revenez vite.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/fr/blog/${post.slug}`}
                style={{ display: "flex", flexDirection: "column", background: "#FDFAF5", border: "1px solid rgba(61,43,31,.08)", borderRadius: 18, padding: "1.75rem", textDecoration: "none", color: "inherit" }}
              >
                <span style={{ fontSize: ".72rem", fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: "#9A8070", marginBottom: ".75rem" }}>
                  {dateFmt(post.datePublished)}
                </span>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.35rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .6rem", lineHeight: 1.25 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: ".92rem", fontWeight: 300, color: "#7A5C44", lineHeight: 1.6, margin: 0, flex: 1 }}>
                  {post.description}
                </p>
                <span style={{ marginTop: "1.25rem", fontSize: ".85rem", fontWeight: 500, color: "#C8813A" }}>Lire</span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter variant="minimal" locale="fr" />
    </div>
  );
}

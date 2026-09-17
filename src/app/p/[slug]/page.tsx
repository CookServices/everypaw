import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getTranslations, type Locale } from "@/lib/i18n";
import PublicFooter from "@/components/PublicFooter";
import PublicPageActions from "@/components/public-page/PublicPageActions";

// Le compteur de vues s'incrémente à chaque requête : rien ne doit être mis en cache.
export const dynamic = "force-dynamic";

const SLUG_REGEX = /^[0-9A-Za-z]{10}$/;

// Ces pages sont faites pour être collées sur Facebook, iMessage, WhatsApp,
// Slack, Discord : chacun de ces services charge la page une fois pour son
// aperçu (OpenGraph). Sans ce filtre, chaque partage gonflerait `view_count`
// d'une visite qui n'est jamais un visiteur, faussant la métrique que
// `funnel.sql` (PP-0) lit pour mesurer l'acquisition.
const BOT_UA =
  /bot|crawler|spider|facebookexternalhit|slackbot|discordbot|whatsapp|twitterbot|bingpreview|embedly|preview/i;

interface PublicPageRow {
  slug: string;
  kind: "memorial" | "living";
  locale: Locale;
  pet_name: string;
  species: string | null;
  birthdate: string | null;
  deceased_at: string | null;
  photo_url: string | null;
  memories: string[];
  story_title: string;
  story_content: string;
  status: string;
  expires_at: string;
  claimed_pet_id: string | null;
}

/**
 * Service role obligatoire : `public_pages` a RLS activée sans aucune policy,
 * donc la clé anon ne lit rien. La clé ne quitte pas le serveur et la lecture
 * est filtrée par slug.
 */
async function loadPage(slug: string): Promise<PublicPageRow | null> {
  if (!SLUG_REGEX.test(slug)) return null;
  const { data } = await getServiceSupabase()
    .from("public_pages")
    .select(
      "slug, kind, locale, pet_name, species, birthdate, deceased_at, photo_url, memories, story_title, story_content, status, expires_at, claimed_pet_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as PublicPageRow | null) ?? null;
}

function isVisible(page: PublicPageRow | null): page is PublicPageRow {
  if (!page) return false;
  if (page.status === "hidden") return false;
  // Une page réclamée ne périme jamais ; une page active périme à 30 jours.
  if (page.status === "active" && new Date(page.expires_at) < new Date()) return false;
  return true;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!isVisible(page)) return { title: "Everypaw", robots: { index: false, follow: false } };

  const isFr = page.locale === "fr";
  const title = isFr ? `En mémoire de ${page.pet_name}` : `Remembering ${page.pet_name}`;
  const living = isFr ? `L'histoire de ${page.pet_name}` : `${page.pet_name}'s story`;
  const heading = page.kind === "memorial" ? title : living;
  const description = page.story_content.slice(0, 160);

  return {
    title: `${heading} · Everypaw`,
    description,
    // Ces pages ne sont pas du contenu de site : elles se partagent par lien.
    robots: { index: false, follow: false },
    openGraph: {
      title: heading,
      description,
      siteName: "Everypaw",
      type: "website",
      ...(page.photo_url
        ? { images: [{ url: page.photo_url, width: 800, height: 800, alt: page.pet_name }] }
        : {}),
    },
    twitter: {
      card: page.photo_url ? "summary_large_image" : "summary",
      title: heading,
      description,
      ...(page.photo_url ? { images: [page.photo_url] } : {}),
    },
  };
}

export default async function PublicPage({ params }: { params: { slug: string } }) {
  const page = await loadPage(params.slug);
  const t = getTranslations(page?.locale ?? "en").public_page;
  // Calculé avant le rétrécissement de `isVisible` : celui-ci ramène `page` à
  // `null` dans la branche négative (son prédicat ne distingue pas « absent »
  // de « caché/expiré »), et un accès à `.status` y échouerait à la compilation.
  const expired = page?.status === "active";

  if (!isVisible(page)) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#1C1410",
          color: "rgba(247,242,234,.6)",
          fontFamily: "Georgia, serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: ".75rem",
          padding: "2rem 1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "1.2rem", margin: 0 }}>{expired ? t.expired_title : t.not_found}</p>
        {expired && (
          <p style={{ fontSize: ".9rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 300, margin: 0, opacity: 0.7 }}>
            {t.expired_body}
          </p>
        )}
      </div>
    );
  }

  // Compteur de vues. Un échec ne doit jamais empêcher la page de s'afficher.
  // Les crawlers de prévisualisation ne comptent pas comme des vues.
  const userAgent = headers().get("user-agent") ?? "";
  if (!BOT_UA.test(userAgent)) {
    await getServiceSupabase()
      .rpc("increment_public_page_view", { p_slug: page.slug })
      .then(
        () => undefined,
        () => undefined,
      );
  }

  const isFr = page.locale === "fr";
  const dateLocale = isFr ? "fr-FR" : "en-US";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app";
  const url = `${appUrl}/p/${page.slug}`;

  const born = page.birthdate
    ? new Date(page.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    : null;
  const passed = page.deceased_at
    ? new Date(page.deceased_at).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" })
    : null;

  const dark = page.kind === "memorial";
  const bg = dark ? "#1C1410" : "#F7F2EA";
  const ink = dark ? "#F7F2EA" : "#3D2B1F";
  const soft = dark ? "rgba(247,242,234,.55)" : "#7A5C44";
  const faint = dark ? "rgba(247,242,234,.3)" : "#9A8070";
  const rule = dark ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.08)";

  return (
    <div style={{ minHeight: "100dvh", background: bg, color: ink, fontFamily: "Georgia, serif" }}>
      <nav
        style={{
          padding: "1.5rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${rule}`,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: soft,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: ".4rem",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
      </nav>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          {page.photo_url ? (
            <img
              src={page.photo_url}
              alt={page.pet_name}
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(200,129,58,.3)",
                display: "block",
                margin: "0 auto 2rem",
              }}
            />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: "rgba(200,129,58,.08)",
                border: "2px solid rgba(200,129,58,.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                margin: "0 auto 2rem",
              }}
            >
              🐾
            </div>
          )}

          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 600, margin: "0 0 1rem", lineHeight: 1.1 }}>
            {page.pet_name}
          </h1>

          {(born || passed) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                fontSize: ".85rem",
                color: faint,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 300,
              }}
            >
              {born && <span>{isFr ? "Né en" : "Born"} {born}</span>}
              {born && passed && <span style={{ fontSize: ".6rem" }}>•</span>}
              {passed && <span>{isFr ? "Parti le" : "Passed"} {passed}</span>}
            </div>
          )}

          <div style={{ margin: "2.5rem auto", width: 48, height: 1, background: "rgba(200,129,58,.3)" }} />
        </div>

        <article style={{ marginBottom: "3.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, textAlign: "center", margin: "0 0 2rem" }}>
            {page.story_title}
          </h2>
          {page.story_content.split(/\n+/).map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: "1rem",
                lineHeight: 1.9,
                color: soft,
                margin: "0 0 1.5rem",
                fontWeight: 300,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {para}
            </p>
          ))}
        </article>

        <section style={{ borderTop: `1px solid ${rule}`, paddingTop: "2.5rem", marginBottom: "3rem" }}>
          <div
            style={{
              fontSize: ".65rem",
              fontWeight: 500,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "rgba(200,129,58,.7)",
              marginBottom: "1.5rem",
              textAlign: "center",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.memories_heading}
          </div>
          {page.memories.map((memory, i) => (
            <p
              key={i}
              style={{
                fontSize: ".95rem",
                fontStyle: "italic",
                lineHeight: 1.8,
                color: soft,
                margin: "0 0 1.25rem",
                fontWeight: 300,
              }}
            >
              {memory}
            </p>
          ))}
        </section>

        <PublicPageActions slug={page.slug} url={url} petName={page.pet_name} locale={page.locale} />

        {/* L'invitation vit en pied de page, jamais en en-tête : une pastille
            commerciale en tête d'une page de deuil se lit comme une bannière.
            PP-2 remplacera ce lien par la réclamation réelle. */}
        <div style={{ textAlign: "center", borderTop: `1px solid ${rule}`, paddingTop: "3rem" }}>
          <p style={{ fontSize: "1rem", fontStyle: "italic", color: soft, marginBottom: ".75rem" }}>
            {t.claim_title}
          </p>
          <p
            style={{
              fontSize: ".85rem",
              color: faint,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: 420,
              margin: "0 auto 1.5rem",
            }}
          >
            {t.claim_body}
          </p>
          <Link
            href={`/auth/signup?next=${encodeURIComponent(`/p/${page.slug}?claim=1`)}`}
            style={{
              display: "inline-block",
              background: "rgba(200,129,58,.15)",
              border: "1px solid rgba(200,129,58,.3)",
              color: "#C8813A",
              padding: ".625rem 1.5rem",
              borderRadius: 100,
              fontSize: ".85rem",
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t.claim_cta}
          </Link>

          <div style={{ marginTop: "2.5rem" }}>
            <Link
              href={`/contact?subject=${encodeURIComponent(`Signalement /p/${page.slug}`)}`}
              style={{ fontSize: ".75rem", color: faint, fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}
            >
              {t.report}
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter variant="minimal" locale={page.locale} />
    </div>
  );
}

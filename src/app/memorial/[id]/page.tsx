import { createClient as createServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "@/lib/i18n";
import PublicFooter from "@/components/PublicFooter";
import TributeSection from "@/components/memorial/TributeSection";

// ── OG meta ───────────────────────────────────────────────────────────────────

// Service role is required: pets/stories RLS is restricted to owner + accepted
// members (no public-read policy), so the anon key returns nothing for public
// visitors. The key never leaves the server; reads are filtered by pet id and
// the page only renders when deceased_at is set (memorial pages are public).

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const { data: pet } = await getServiceSupabase()
    .from("pets")
    .select("name, species, memorial_message, memorial_photo_url, photo_url, deceased_at")
    .eq("id", params.id)
    .single();

  if (!pet || !pet.deceased_at) return { title: "Mémorial · Everypaw" };

  const image = pet.memorial_photo_url ?? pet.photo_url ?? null;
  const description = pet.memorial_message
    ?? `En mémoire de ${pet.name} · Everypaw`;

  return {
    title: `En mémoire de ${pet.name} · Everypaw`,
    description,
    openGraph: {
      title: `En mémoire de ${pet.name}`,
      description,
      url: `https://everypaw.app/memorial/${params.id}`,
      siteName: "Everypaw",
      type: "website",
      ...(image ? { images: [{ url: image, width: 800, height: 800, alt: pet.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `En mémoire de ${pet.name}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MemorialPage({ params, searchParams }: { params: { id: string }; searchParams: { lang?: string } }) {
  const langParam = searchParams.lang;
  let locale: "en" | "fr";
  if (langParam === "fr" || langParam === "en") {
    locale = langParam;
  } else {
    const cookieStore = cookies();
    const localeCookie = cookieStore.get("locale")?.value;
    if (localeCookie === "fr" || localeCookie === "en") {
      locale = localeCookie;
    } else {
      const acceptLang = (await headers()).get("accept-language") ?? "";
      locale = acceptLang.toLowerCase().startsWith("fr") ? "fr" : "en";
    }
  }
  const t = getTranslations(locale);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  const supabase = getServiceSupabase();

  // Check if the viewer is the owner (for edit button)
  const supabaseAuth = await createServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  const [{ data: pet }, { data: stories }, { data: tributes }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", params.id).single(),
    supabase
      .from("stories")
      .select("*")
      .eq("pet_id", params.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("memorial_tributes")
      .select("id, author_name, message, created_at")
      .eq("pet_id", params.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
  ]);

  const isOwner = user?.id === pet?.user_id;

  if (!pet || !pet.deceased_at) return (
    <div style={{ minHeight: "100vh", background: "#1C1410", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "rgba(247,242,234,.4)" }}>
      {t.public_pet.not_found}
    </div>
  );

  const bornYear = pet.birthdate
    ? new Date(pet.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    : null;
  const passedDate = new Date(pet.deceased_at).toLocaleDateString(dateLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#1C1410", color: "#F7F2EA", fontFamily: "Georgia, serif" }}>

      {/* Nav */}
      <nav style={{ padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(247,242,234,.06)" }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "rgba(247,242,234,.5)", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {isOwner && (
            <Link
              href={`/dashboard/pets/${params.id}?openMemorial=1`}
              style={{ fontSize: ".75rem", color: "rgba(200,129,58,.7)", textDecoration: "none", fontFamily: "sans-serif", border: "1px solid rgba(200,129,58,.25)", padding: ".3rem .75rem", borderRadius: 100 }}
            >
              {locale === "fr" ? "Modifier" : "Edit"}
            </Link>
          )}
          <span style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(247,242,234,.3)", fontFamily: "sans-serif" }}>
            {t.memorial.badge}
          </span>
        </div>
      </nav>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>

        {/* Photo + identity */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          {(pet.memorial_photo_url ?? pet.photo_url) ? (
            <img
              src={(pet.memorial_photo_url ?? pet.photo_url)!}
              alt={pet.name}
              style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(200,129,58,.3)", marginBottom: "2rem", display: "block", margin: "0 auto 2rem" }}
            />
          ) : (
            <div style={{ width: 140, height: 140, borderRadius: "50%", background: "rgba(200,129,58,.08)", border: "2px solid rgba(200,129,58,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", margin: "0 auto 2rem" }}>
              🐾
            </div>
          )}

          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 600, color: "#F7F2EA", margin: "0 0 1rem", lineHeight: 1.1 }}>
            {pet.name}
          </h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", fontSize: ".85rem", color: "rgba(247,242,234,.45)", fontFamily: "sans-serif", fontWeight: 300 }}>
            {bornYear && <span>{t.memorial.born} {bornYear}</span>}
            {bornYear && <span style={{ fontSize: ".6rem" }}>•</span>}
            <span>{t.memorial.passed} {passedDate}</span>
          </div>

          {/* Decorative plant + line */}
          <img src="/illustrations/plant.svg" alt="" aria-hidden style={{ width: 44, display: "block", margin: "2.5rem auto 0", opacity: .85 }} />
          <div style={{ margin: "1.25rem auto 2.5rem", width: 48, height: 1, background: "rgba(200,129,58,.3)" }} />

          {/* Memorial message */}
          {pet.memorial_message && (
            <p style={{ fontSize: "1.1rem", fontStyle: "italic", color: "rgba(247,242,234,.75)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto", fontWeight: 300 }}>
              &ldquo;{pet.memorial_message}&rdquo;
            </p>
          )}
        </div>

        {/* Stories */}
        {stories && stories.length > 0 && (
          <div style={{ marginBottom: "4rem" }}>
            <div style={{ fontSize: ".65rem", fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(200,129,58,.7)", marginBottom: "1.5rem", textAlign: "center", fontFamily: "sans-serif" }}>
              {t.public_pet.stories}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {stories.map((story) => (
                <div key={story.id} style={{ borderTop: "1px solid rgba(247,242,234,.06)", paddingTop: "1.5rem" }}>
                  {story.title && (
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "rgba(247,242,234,.85)", marginBottom: ".75rem" }}>
                      {story.title}
                    </h3>
                  )}
                  <p style={{ fontSize: ".9rem", color: "rgba(247,242,234,.55)", lineHeight: 1.85, margin: 0, fontStyle: "italic" }}>
                    {story.content.slice(0, 500)}{story.content.length > 500 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tributes */}
        <TributeSection
          petId={params.id}
          petName={pet.name}
          initialTributes={tributes ?? []}
          locale={locale}
        />

        {/* Foot of the page: the one place a quiet invitation belongs. Visitors
            came to pay their respects and are shown what Everypaw is; the owner
            is already signed in, so inviting them to start a story would be
            meaningless. They are offered the book instead, in the same restrained
            register as the rest of the page: no price, no urgency, no argument. */}
        <div style={{ textAlign: "center", borderTop: "1px solid rgba(247,242,234,.06)", paddingTop: "3rem", marginTop: "3rem" }}>
          <p style={{ fontSize: ".8rem", color: "rgba(247,242,234,.3)", fontFamily: "sans-serif", marginBottom: ".5rem", letterSpacing: ".04em" }}>
            Everypaw
          </p>
          <p style={{ fontSize: "1rem", fontStyle: "italic", color: "rgba(247,242,234,.5)", marginBottom: "1.5rem" }}>
            {isOwner
              ? t.memorial.owner_book_title.replace("{name}", pet.name)
              : t.memorial.cta_title}
          </p>
          <Link
            href={isOwner ? `/dashboard/pets/${params.id}/order` : "/auth/signup"}
            style={{ display: "inline-block", background: "rgba(200,129,58,.15)", border: "1px solid rgba(200,129,58,.3)", color: "#C8813A", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, textDecoration: "none", fontFamily: "sans-serif" }}
          >
            {isOwner ? t.memorial.owner_book_link : t.memorial.cta_button}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

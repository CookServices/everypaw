import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

export default async function MemorialPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale = (localeCookie === "fr" ? "fr" : "en") as "en" | "fr";
  const t = getTranslations(locale);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  // Anon key is sufficient here — RLS allows public reads on pets/stories.
  // Never use the service role key in public server components.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: pet }, { data: stories }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", params.id).single(),
    supabase
      .from("stories")
      .select("*")
      .eq("pet_id", params.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

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
        <span style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(247,242,234,.3)", fontFamily: "sans-serif" }}>
          {t.memorial.badge}
        </span>
      </nav>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>

        {/* Photo + identity */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          {pet.photo_url ? (
            <img
              src={pet.photo_url}
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

          {/* Decorative line */}
          <div style={{ margin: "2.5rem auto", width: 48, height: 1, background: "rgba(200,129,58,.3)" }} />

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

        {/* CTA */}
        <div style={{ textAlign: "center", borderTop: "1px solid rgba(247,242,234,.06)", paddingTop: "3rem" }}>
          <p style={{ fontSize: ".8rem", color: "rgba(247,242,234,.3)", fontFamily: "sans-serif", marginBottom: ".5rem", letterSpacing: ".04em" }}>
            Everypaw
          </p>
          <p style={{ fontSize: "1rem", fontStyle: "italic", color: "rgba(247,242,234,.5)", marginBottom: "1.5rem" }}>
            {t.memorial.cta_title}
          </p>
          <Link href="/auth/signup" style={{ display: "inline-block", background: "rgba(200,129,58,.15)", border: "1px solid rgba(200,129,58,.3)", color: "#C8813A", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, textDecoration: "none", fontFamily: "sans-serif" }}>
            {t.memorial.cta_button}
          </Link>
        </div>
      </main>
    </div>
  );
}

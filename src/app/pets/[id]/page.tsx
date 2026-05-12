import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

const MOOD_OPTIONS: Record<string, string> = {
  happy: "😄", funny: "😂", tender: "🥰", sad: "😢", proud: "🏆"
};

export default async function PublicPetPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale = (localeCookie === "fr" ? "fr" : "en") as "en" | "fr";
  const t = getTranslations(locale);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: pet }, { data: stories }, { data: entries }] = await Promise.all([
    supabase.from("pets").select("*").eq("id", params.id).single(),
    supabase.from("stories").select("*").eq("pet_id", params.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("entries").select("*").eq("pet_id", params.id).order("entry_date", { ascending: false }).limit(6),
  ]);

  if (!pet) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#7A5C44" }}>
      {t.public_pet.not_found}
    </div>
  );

  const photos = entries?.flatMap(e => e.photo_urls || []).slice(0, 6) || [];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <Link href="/auth/signup" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".5rem 1.25rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
          {t.public_pet.start_story}
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Pet header */}
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", marginBottom: "2rem", border: "1px solid rgba(61,43,31,.08)", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{SPECIES_EMOJI[pet.species]}</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .5rem" }}>{pet.name}</h1>
          <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, margin: "0 0 1rem" }}>
            {pet.breed || pet.species}{pet.birthdate ? ` · ${t.pet.born} ${new Date(pet.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}` : ""}
          </p>
          {pet.bio && <p style={{ fontSize: ".95rem", color: "#7A5C44", fontStyle: "italic", fontFamily: "Georgia, serif", maxWidth: 480, margin: "0 auto" }}>{pet.bio}</p>}
        </div>

        {/* Photos grid */}
        {photos.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.public_pet.moments}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", borderRadius: 16, overflow: "hidden" }}>
              {photos.map((url: string, i: number) => (
                <img key={i} src={url} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
              ))}
            </div>
          </div>
        )}

        {/* Stories */}
        {stories && stories.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.public_pet.stories}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {stories.map(story => (
                <div key={story.id} style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".75rem" }}>{story.title || `${pet.name}'s Story`}</h3>
                  <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.75, margin: 0, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                    {story.content.slice(0, 300)}…
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent entries */}
        {entries && entries.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.public_pet.recent_moments}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {entries.map(entry => (
                <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.25rem", border: "1px solid rgba(61,43,31,.06)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300, minWidth: 70 }}>
                    {new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                    {entry.mood && <div style={{ marginTop: 4, fontSize: "1rem" }}>{MOOD_OPTIONS[entry.mood]}</div>}
                  </div>
                  {entry.content.trim() && <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.6, margin: 0, flex: 1 }}>{entry.content.slice(0, 120)}{entry.content.length > 120 ? "…" : ""}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: "#3D2B1F", borderRadius: 24, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🐾</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#F7F2EA", marginBottom: ".75rem" }}>{t.public_pet.cta_title}</h2>
          <p style={{ fontSize: ".875rem", color: "rgba(247,242,234,.65)", fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {t.public_pet.cta_desc}
          </p>
          <Link href="/auth/signup" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
            {t.public_pet.cta_button}
          </Link>
        </div>
      </main>
    </div>
  );
}

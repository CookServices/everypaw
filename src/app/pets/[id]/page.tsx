import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { getServiceSupabase } from "@/lib/plan";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

const ALL_EMOJIS: Record<string, string> = {
  happy: "😄", funny: "😂", tender: "🥰", sad: "😢", proud: "🏆",
  love: "❤️", surprised: "😲", sleepy: "😴", silly: "🤪", nervous: "😰",
  walk: "🐾", play: "🎾", swim: "🏊", run: "🏃", sleep_act: "🛌",
  bath: "🛁", car: "🚗", park: "🌳", beach: "🏖️", home: "🏠",
  vet: "🏥", medicine: "💊", healthy: "💪", sick: "🤒", vaccine: "💉",
  grooming: "✂️", checkup: "🩺", recovered: "🌟",
  food: "🍖", treat: "🦴", fish: "🐟", carrot: "🥕", hungry: "😋", yummy: "🤤",
  sun: "☀️", rain: "🌧️", snow: "❄️", flower: "🌸", leaf: "🍂", moon: "🌙", star: "⭐", rainbow: "🌈",
};

export default async function PublicPetPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale = (localeCookie === "fr" ? "fr" : "en") as "en" | "fr";
  const t = getTranslations(locale);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  // Service role is required here: entries RLS is restricted to authenticated owners.
  // The key never leaves the server; explicit pet_id filters limit the scope.
  const supabase = getServiceSupabase();

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

  const photoEntries = entries?.filter(e => e.photo_urls && e.photo_urls.length > 0) || [];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <Link href="/auth/signup" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".5rem 1.25rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
          {t.public_pet.cta_button}
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Pet header */}
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", marginBottom: "2rem", border: "1px solid rgba(61,43,31,.08)", textAlign: "center" }}>
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#C8813A", display: "flex", alignItems: "center", justifyContent: "center", color: "#FDFAF5", fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600 }}>
                {pet.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .5rem" }}>{pet.name}</h1>
          <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, margin: "0 0 1rem" }}>
            {pet.breed || pet.species}{pet.birthdate ? ` · ${t.pet.born} ${new Date(pet.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}` : ""}
          </p>
          {pet.bio && <p style={{ fontSize: ".95rem", color: "#7A5C44", fontStyle: "italic", fontFamily: "Georgia, serif", maxWidth: 480, margin: "0 auto" }}>{pet.bio}</p>}
        </div>

        {/* Moments with photos */}
        {photoEntries.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.public_pet.moments}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {photoEntries.map(entry => (
                <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(61,43,31,.06)" }}>
                  <div style={{ padding: ".875rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: entry.content?.trim() ? ".5rem" : 0 }}>
                      <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>
                        {new Date(entry.entry_date).toLocaleDateString(dateLocale, { day: "numeric", month: "long" })}
                      </span>
                      {entry.mood && <span style={{ fontSize: ".9rem" }}>{ALL_EMOJIS[entry.mood] ?? ""}</span>}
                    </div>
                    {entry.content?.trim() && <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.65, margin: 0 }}>{entry.content}</p>}
                  </div>
                  {entry.photo_urls && entry.photo_urls.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: entry.photo_urls.length === 1 ? "1fr" : entry.photo_urls.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "2px" }}>
                      {entry.photo_urls.slice(0, 3).map((url: string, i: number) => (
                        <img key={i} src={url} alt="" style={{ width: "100%", height: entry.photo_urls.length === 1 ? 240 : 160, objectFit: "cover", display: "block" }} />
                      ))}
                    </div>
                  )}
                </div>
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
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".75rem" }}>{story.title || (locale === "fr" ? `L'histoire de ${pet.name}` : `${pet.name}'s Story`)}</h3>
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
                <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(61,43,31,.06)", boxShadow: "0 1px 4px rgba(61,43,31,.04)" }}>
                  <div style={{ padding: ".875rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: entry.content?.trim() ? ".5rem" : 0 }}>
                      <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>
                        {new Date(entry.entry_date).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      {entry.mood && <span style={{ fontSize: ".9rem" }}>{ALL_EMOJIS[entry.mood] ?? ""}</span>}
                    </div>
                    {entry.content?.trim() && (
                      <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.65, margin: 0 }}>
                        {entry.content.slice(0, 200)}{entry.content.length > 200 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  {entry.photo_urls && entry.photo_urls.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: entry.photo_urls.length === 1 ? "1fr" : "1fr 1fr", gap: "2px" }}>
                      {entry.photo_urls.slice(0, 2).map((url: string, i: number) => (
                        <img key={i} src={url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                      ))}
                    </div>
                  )}
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

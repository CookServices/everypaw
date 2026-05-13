"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry } from "@/types";
import Link from "next/link";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const [pets, setPets] = useState<Pet[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasStories, setHasStories] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: petsData } = await supabase.from("pets").select("*").order("created_at", { ascending: false });
      const { data: entriesData } = await supabase.from("entries").select("*").order("entry_date", { ascending: false }).limit(5);
      const { data: profile } = await supabase.from("profiles").select("is_premium, onboarding_completed").single();
      const { data: storiesData } = await supabase.from("stories").select("id").limit(1);
      setPets(petsData || []);
      setEntries(entriesData || []);
      setIsPremium(profile?.is_premium || false);
      setShowOnboarding(!profile?.onboarding_completed);
      setHasStories((storiesData?.length || 0) > 0);
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setSubscribing(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#7A5C44" }}>{t.dashboard.loading}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {!isPremium && (
            <button onClick={handleSubscribe} disabled={subscribing} style={{ background: "#C8813A", color: "#FDFAF5", padding: ".5rem 1.25rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, border: "none", cursor: "pointer", opacity: subscribing ? .7 : 1, fontFamily: "inherit" }}>
              {subscribing ? t.dashboard.loading_btn : t.dashboard.upgrade_title}
            </button>
          )}
          {isPremium && (
            <Link href="/dashboard/upgrade" style={{ fontSize: ".75rem", color: "#C8813A", fontWeight: 500, textDecoration: "none", padding: ".35rem .75rem", borderRadius: 100, border: "1px solid rgba(200,129,58,.25)", transition: "background .15s", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,129,58,.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >{t.dashboard.premium_badge}</Link>
          )}
          <LanguageSwitcher />
          <Link href="/dashboard/settings" style={{ fontSize: ".8rem", color: "#7A5C44", textDecoration: "none" }}>{t.nav.settings}</Link>
          <button onClick={handleLogout} style={{ fontSize: ".8rem", color: "#7A5C44", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{t.nav.sign_out}</button>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {showOnboarding && (
          <OnboardingModal
            hasPets={pets.length > 0}
            hasEntries={entries.length > 0}
            hasStories={hasStories}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        <div style={{ marginBottom: "2.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .25rem" }}>{t.dashboard.title}</h1>
            <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300 }}>{t.dashboard.subtitle}</p>
          </div>
          <Link href="/dashboard/pets/new" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".625rem 1.25rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
            {t.dashboard.add_pet}
          </Link>
        </div>

        {!isPremium && (
          <div style={{ background: "rgba(200,129,58,.08)", border: "1.5px solid rgba(200,129,58,.25)", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ fontSize: ".875rem", color: "#3D2B1F", fontWeight: 500, margin: "0 0 .25rem" }}>{t.dashboard.upgrade_title}</p>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.dashboard.upgrade_desc}</p>
            </div>
            <button onClick={handleSubscribe} disabled={subscribing} style={{ background: "#C8813A", color: "#FDFAF5", padding: ".5rem 1.25rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {subscribing ? t.dashboard.loading_btn : t.dashboard.upgrade_cta}
            </button>
          </div>
        )}

        {pets.length === 0 ? (
          <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "3rem 2rem", textAlign: "center", border: "1.5px dashed rgba(61,43,31,.15)", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐾</div>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: ".5rem" }}>{t.dashboard.no_pets_title}</h3>
            <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, marginBottom: "1.5rem" }}>{t.dashboard.no_pets_desc}</p>
            <Link href="/dashboard/pets/new" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
              {t.dashboard.add_first_pet}
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
            {pets.map(pet => (
              <Link key={pet.id} href={`/dashboard/pets/${pet.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)", cursor: "pointer", transition: "transform .15s, box-shadow .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 30px rgba(61,43,31,.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", marginBottom: "1rem" }}>
                    {pet.photo_url ? <img src={pet.photo_url} alt={pet.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} /> : SPECIES_EMOJI[pet.species]}
                  </div>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".25rem" }}>{pet.name}</h3>
                  <p style={{ fontSize: ".8rem", color: "#7A5C44", textTransform: "capitalize", fontWeight: 300 }}>{pet.breed || pet.species}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1rem" }}>{t.dashboard.recent_moments}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {entries.map(entry => (
                <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.25rem", border: "1px solid rgba(61,43,31,.08)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300, minWidth: 70, paddingTop: "2px" }}>
                    {new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                    {entry.mood && (
                      <div style={{ marginTop: "4px", fontSize: "1rem" }}>
                        {entry.mood === "happy" ? "😄" : entry.mood === "funny" ? "😂" : entry.mood === "tender" ? "🥰" : entry.mood === "sad" ? "😢" : entry.mood === "proud" ? "🏆" : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    {entry.content.trim() && (
                      <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.6, margin: "0 0 .5rem" }}>
                        {entry.content.slice(0, 120)}{entry.content.length > 120 ? "…" : ""}
                      </p>
                    )}
                    {entry.photo_urls && entry.photo_urls.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {entry.photo_urls.slice(0, 3).map((url: string, i: number) => (
                          <img key={i} src={url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />
                        ))}
                        {entry.photo_urls.length > 3 && (
                          <div style={{ width: 56, height: 56, borderRadius: 8, background: "rgba(61,43,31,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", color: "#7A5C44" }}>
                            +{entry.photo_urls.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

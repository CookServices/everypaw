"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry } from "@/types";
import Link from "next/link";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

function relativeDate(dateStr: string, t: { dashboard: Record<string, string> }): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 864e5);
  if (diff === 0) return t.dashboard.last_entry_today;
  if (diff === 1) return t.dashboard.last_entry_yesterday;
  if (diff < 14) return t.dashboard.last_entry_days_ago.replace("{days}", String(diff));
  return t.dashboard.last_entry_weeks_ago.replace("{weeks}", String(Math.floor(diff / 7)));
}

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
  const [monthlyEntryCount, setMonthlyEntryCount] = useState(0);
  const [lastStoryDate, setLastStoryDate] = useState<string | null>(null);
  const [kpiPetFilter, setKpiPetFilter] = useState<string | "all">("all");
  const [petMetadata, setPetMetadata] = useState<Record<string, {
    lastEntry: string | null;
    monthlyCount: number;
    hasNewChapter: boolean;
  }>>({});

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      const [
        { data: petsData },
        { data: entriesData },
        { data: profile },
        { data: storiesData },
        { count: monthlyCount },
        { data: lastStoryData },
        { data: allEntriesMeta },
        { data: recentStories },
      ] = await Promise.all([
        supabase.from("pets").select("*").order("created_at", { ascending: false }),
        supabase.from("entries").select("*").order("entry_date", { ascending: false }).limit(5),
        supabase.from("profiles").select("is_premium, onboarding_completed").single(),
        supabase.from("stories").select("id").limit(1),
        supabase.from("entries").select("*", { count: "exact", head: true }).gte("entry_date", monthStart).lte("entry_date", monthEnd),
        supabase.from("stories").select("created_at").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("entries").select("pet_id, entry_date").order("entry_date", { ascending: false }),
        supabase.from("stories").select("pet_id").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
      ]);

      setPets(petsData || []);
      setEntries(entriesData || []);
      setIsPremium(profile?.is_premium || false);
      setShowOnboarding(!profile?.onboarding_completed);
      setHasStories((storiesData?.length || 0) > 0);
      setMonthlyEntryCount(monthlyCount ?? 0);
      setLastStoryDate(lastStoryData?.created_at ?? null);

      // Build per-pet metadata
      const meta: Record<string, { lastEntry: string | null; monthlyCount: number; hasNewChapter: boolean }> = {};
      for (const e of (allEntriesMeta || []) as { pet_id: string; entry_date: string }[]) {
        if (!meta[e.pet_id]) meta[e.pet_id] = { lastEntry: e.entry_date, monthlyCount: 0, hasNewChapter: false };
        if (e.entry_date >= monthStart) meta[e.pet_id].monthlyCount++;
      }
      for (const s of (recentStories || []) as { pet_id: string }[]) {
        if (!meta[s.pet_id]) meta[s.pet_id] = { lastEntry: null, monthlyCount: 0, hasNewChapter: false };
        meta[s.pet_id].hasNewChapter = true;
      }
      setPetMetadata(meta);

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

        {/* Month-in-progress widgets */}
        {(() => {
          const now = new Date();
          const year = now.getFullYear();
          const firstOfNextMonth = new Date(year, now.getMonth() + 1, 1);
          const daysUntilChapter = Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const chapterLabel = daysUntilChapter <= 0
            ? t.dashboard.month_chapter_soon
            : daysUntilChapter === 1
              ? t.dashboard.month_chapter_day
              : t.dashboard.month_chapter_days.replace("{days}", String(daysUntilChapter));

          const filteredMonthlyCount = kpiPetFilter === "all"
            ? monthlyEntryCount
            : (petMetadata[kpiPetFilter]?.monthlyCount ?? 0);

          const entriesLabel = isPremium
            ? t.dashboard.month_entries_premium.replace("{count}", String(filteredMonthlyCount))
            : t.dashboard.month_entries_free.replace("{count}", String(filteredMonthlyCount));
          const freeProgress = Math.min(filteredMonthlyCount / 10, 1);

          return (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem", marginBottom: ".75rem" }}>
                <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
                  {t.dashboard.month_title}
                </p>
                {pets.length > 1 && (
                  <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setKpiPetFilter("all")}
                      style={{
                        padding: ".25rem .625rem", borderRadius: 100, fontSize: ".72rem", fontWeight: 500,
                        border: "1px solid", cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                        background: kpiPetFilter === "all" ? "#C8813A" : "transparent",
                        color: kpiPetFilter === "all" ? "#FDFAF5" : "#7A5C44",
                        borderColor: kpiPetFilter === "all" ? "#C8813A" : "rgba(61,43,31,.2)",
                      }}
                    >
                      {locale === "fr" ? "Tous" : "All"}
                    </button>
                    {pets.map(pet => (
                      <button
                        key={pet.id}
                        onClick={() => setKpiPetFilter(pet.id)}
                        style={{
                          padding: ".25rem .625rem", borderRadius: 100, fontSize: ".72rem", fontWeight: 500,
                          border: "1px solid", cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                          background: kpiPetFilter === pet.id ? "#C8813A" : "transparent",
                          color: kpiPetFilter === pet.id ? "#FDFAF5" : "#7A5C44",
                          borderColor: kpiPetFilter === pet.id ? "#C8813A" : "rgba(61,43,31,.2)",
                        }}
                      >
                        {SPECIES_EMOJI[pet.species]} {pet.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isPremium ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: ".75rem" }}>

                {/* Entries widget */}
                <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(61,43,31,.07)" }}>
                  <p style={{ fontSize: ".68rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 .4rem", fontFamily: "sans-serif" }}>
                    {t.dashboard.month_entries_label}
                  </p>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .6rem", lineHeight: 1 }}>
                    {entriesLabel}
                  </p>
                  {!isPremium && (
                    <div style={{ height: 4, borderRadius: 100, background: "rgba(61,43,31,.1)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 100, background: freeProgress >= 1 ? "#A32D2D" : "#C8813A", width: `${freeProgress * 100}%`, transition: "width .4s ease" }} />
                    </div>
                  )}
                  {isPremium && (
                    <p style={{ fontSize: ".72rem", color: "#C8813A", margin: 0, fontWeight: 400 }}>∞ {t.dashboard.premium_badge}</p>
                  )}
                </div>

                {/* Next chapter widget */}
                <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(61,43,31,.07)" }}>
                  <p style={{ fontSize: ".68rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 .4rem", fontFamily: "sans-serif" }}>
                    {t.dashboard.month_chapter_label}
                  </p>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .3rem", lineHeight: 1.2 }}>
                    {chapterLabel}
                  </p>
                  <p style={{ fontSize: ".72rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>
                    {new Date(year, now.getMonth() + 1, 1).toLocaleDateString(dateLocale, { month: "long", day: "numeric" })}
                  </p>
                </div>

                {/* Book widget — Premium only */}
                {isPremium && (
                  <div style={{ background: "linear-gradient(135deg, rgba(200,129,58,.1) 0%, rgba(200,129,58,.05) 100%)", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(200,129,58,.2)" }}>
                    <p style={{ fontSize: ".68rem", fontWeight: 500, color: "#C8813A", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 .4rem", fontFamily: "sans-serif" }}>
                      {t.dashboard.month_book_label.replace("{year}", String(year))}
                    </p>
                    <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .3rem", lineHeight: 1.2 }}>
                      {t.dashboard.month_book_value}
                    </p>
                    <p style={{ fontSize: ".72rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>
                      {monthlyEntryCount > 0
                        ? `${monthlyEntryCount} ${monthlyEntryCount === 1 ? (locale === "fr" ? "entrée ajoutée" : "entry added") : (locale === "fr" ? "entrées ajoutées" : "entries added")}`
                        : (locale === "fr" ? "Ajoutez votre premier moment ✨" : "Add your first moment ✨")}
                    </p>
                  </div>
                )}

              </div>
            </div>
          );
        })()}

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
            {pets.map(pet => {
              const meta = petMetadata[pet.id];
              return (
                <Link key={pet.id} href={`/dashboard/pets/${pet.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.25rem 1.5rem", border: "1px solid rgba(61,43,31,.08)", cursor: "pointer", transition: "transform .18s, box-shadow .18s, border-color .18s", position: "relative" }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "translateY(-4px)";
                      el.style.boxShadow = "0 12px 40px rgba(61,43,31,.13)";
                      el.style.borderColor = "rgba(200,129,58,.35)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = "none";
                      el.style.boxShadow = "none";
                      el.style.borderColor = "rgba(61,43,31,.08)";
                    }}
                  >
                    {/* New chapter badge */}
                    {meta?.hasNewChapter && (
                      <span style={{ position: "absolute", top: ".875rem", right: ".875rem", fontSize: ".65rem", fontWeight: 600, background: "rgba(200,129,58,.12)", color: "#C8813A", border: "1px solid rgba(200,129,58,.3)", borderRadius: 100, padding: ".2rem .55rem", letterSpacing: ".02em", whiteSpace: "nowrap" }}>
                        {t.dashboard.new_chapter_badge}
                      </span>
                    )}

                    <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: ".875rem" }}>
                      {pet.photo_url ? <img src={pet.photo_url} alt={pet.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} /> : SPECIES_EMOJI[pet.species]}
                    </div>

                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .2rem" }}>{pet.name}</h3>
                    <p style={{ fontSize: ".78rem", color: "#7A5C44", textTransform: "capitalize", fontWeight: 300, margin: "0 0 .75rem" }}>{pet.breed || pet.species}</p>

                    {/* Metadata footer */}
                    <div style={{ display: "flex", gap: ".75rem", borderTop: "1px solid rgba(61,43,31,.06)", paddingTop: ".75rem" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: ".65rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 .2rem", fontFamily: "sans-serif" }}>
                          {t.dashboard.month_entries_label}
                        </p>
                        <p style={{ fontSize: ".8rem", color: "#3D2B1F", margin: 0, fontWeight: 400 }}>
                          {meta
                            ? t.dashboard.entries_month.replace("{count}", String(meta.monthlyCount))
                            : t.dashboard.no_entries_yet}
                        </p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: ".65rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 .2rem", fontFamily: "sans-serif" }}>
                          {t.dashboard.recent_moments}
                        </p>
                        <p style={{ fontSize: ".8rem", color: "#3D2B1F", margin: 0, fontWeight: 400 }}>
                          {meta?.lastEntry ? relativeDate(meta.lastEntry, t) : t.dashboard.no_entries_yet}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {entries.length > 0 && (
          <div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "1rem" }}>{t.dashboard.recent_moments}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {entries.map(entry => {
                const entryPet = pets.find(p => p.id === entry.pet_id);
                return (
                  <Link key={entry.id} href={`/dashboard/pets/${entry.pet_id}?tab=journal`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.25rem", border: "1px solid rgba(61,43,31,.08)", display: "flex", gap: "1rem", alignItems: "flex-start", transition: "border-color .15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,129,58,.3)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.08)"}
                    >
                      <div style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300, minWidth: 70, paddingTop: "2px" }}>
                        {new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                        {entry.mood && (
                          <div style={{ marginTop: "4px", fontSize: "1rem" }}>
                            {entry.mood === "happy" ? "😄" : entry.mood === "funny" ? "😂" : entry.mood === "tender" ? "🥰" : entry.mood === "sad" ? "😢" : entry.mood === "proud" ? "🏆" : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        {pets.length > 1 && entryPet && (
                          <p style={{ fontSize: ".7rem", color: "#C8813A", fontWeight: 500, margin: "0 0 .35rem", display: "flex", alignItems: "center", gap: ".25rem" }}>
                            <span>{SPECIES_EMOJI[entryPet.species] ?? "🐾"}</span>
                            <span>{entryPet.name}</span>
                          </p>
                        )}
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
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

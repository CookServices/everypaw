"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry } from "@/types";
import Link from "next/link";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };
const LAST_PET_KEY = "lastPetId";

function relativeDate(dateStr: string, t: { dashboard: Record<string, string> }): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + "T12:00:00").getTime()) / 864e5);
  if (diff === 0) return t.dashboard.last_entry_today;
  if (diff === 1) return t.dashboard.last_entry_yesterday;
  if (diff < 14) return t.dashboard.last_entry_days_ago.replace("{days}", String(diff));
  return t.dashboard.last_entry_weeks_ago.replace("{weeks}", String(Math.floor(diff / 7)));
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const isFR = locale === "fr";
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  const [pets, setPets] = useState<Pet[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasStories, setHasStories] = useState(false);
  const [monthlyEntryCount, setMonthlyEntryCount] = useState(0);
  const [resolvedPetId, setResolvedPetId] = useState<string | null>(null);
  const [petMetadata, setPetMetadata] = useState<Record<string, {
    lastEntry: string | null;
    monthlyCount: number;
    hasNewChapter: boolean;
  }>>({});

  useEffect(() => {
    try { setResolvedPetId(localStorage.getItem(LAST_PET_KEY)); } catch {}
  }, []);

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
        { data: allEntriesMeta },
        { data: recentStories },
      ] = await Promise.all([
        supabase.from("pets").select("*").order("created_at", { ascending: false }),
        supabase.from("entries").select("*").order("entry_date", { ascending: false }).limit(5),
        supabase.from("profiles").select("is_premium, onboarding_completed").single(),
        supabase.from("stories").select("id").limit(1),
        supabase.from("entries").select("*", { count: "exact", head: true }).gte("entry_date", monthStart).lte("entry_date", monthEnd),
        supabase.from("entries").select("pet_id, entry_date").order("entry_date", { ascending: false }),
        supabase.from("stories").select("pet_id").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
      ]);

      setPets(petsData || []);
      setEntries(entriesData || []);
      setIsPremium(profile?.is_premium || false);
      setShowOnboarding(!profile?.onboarding_completed);
      setHasStories((storiesData?.length || 0) > 0);
      setMonthlyEntryCount(monthlyCount ?? 0);

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

      // Sync resolvedPetId from loaded pets
      setResolvedPetId(prev => {
        if (prev) return prev;
        const firstId = (petsData || [])[0]?.id ?? null;
        return firstId;
      });

      setLoading(false);
    };
    load();
  }, []);

  const handleSubscribe = async (plan: "digital" | "print_monthly" = "digital") => {
    setSubscribing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setSubscribing(false);
    } catch {
      setSubscribing(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "#7A5C44" }}>{t.dashboard.loading}</div>
    </div>
  );

  const now = new Date();
  const year = now.getFullYear();
  const firstOfNextMonth = new Date(year, now.getMonth() + 1, 1);
  const daysUntilChapter = Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const chapterLabel = daysUntilChapter <= 0
    ? t.dashboard.month_chapter_soon
    : daysUntilChapter === 1
      ? t.dashboard.month_chapter_day
      : t.dashboard.month_chapter_days.replace("{days}", String(daysUntilChapter));

  const entriesLabel = isPremium
    ? t.dashboard.month_entries_premium.replace("{count}", String(monthlyEntryCount))
    : t.dashboard.month_entries_free.replace("{count}", String(monthlyEntryCount));

  const progressGoal = 15;
  const progressPct = Math.min(monthlyEntryCount / progressGoal, 1);
  const progressColor = progressPct >= 1 ? "#A32D2D" : "#C8813A";

  const orderLink = resolvedPetId ? `/dashboard/pets/${resolvedPetId}/order` : "/dashboard";
  const storiesLink = resolvedPetId ? `/dashboard/pets/${resolvedPetId}?tab=stories` : "/dashboard";

  // Pet chips (max 3 visible)
  const visiblePets = pets.slice(0, 3);
  const extraPets = pets.length > 3 ? pets.length - 3 : 0;

  const chipActiveStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: ".35rem",
    padding: ".35rem .75rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500,
    border: "1.5px solid #C8813A", background: "rgba(200,129,58,.12)", color: "#C8813A",
    cursor: "default", whiteSpace: "nowrap",
  };
  const chipStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: ".35rem",
    padding: ".35rem .75rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 400,
    border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44",
    textDecoration: "none", whiteSpace: "nowrap", transition: "border-color .12s, background .12s",
  };

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

        {/* ── Zone A — Header with pet chips ────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".75rem", marginBottom: "1rem" }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>
              {t.dashboard.title}
            </h1>
            <Link
              href="/dashboard/pets/new"
              style={{
                display: "inline-flex", alignItems: "center", gap: ".35rem",
                padding: ".4rem .875rem", borderRadius: 100,
                border: "1.5px solid rgba(61,43,31,.2)", background: "transparent",
                color: "#7A5C44", fontSize: ".8rem", textDecoration: "none",
                transition: "border-color .12s, background .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8813A"; (e.currentTarget as HTMLElement).style.color = "#C8813A"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.2)"; (e.currentTarget as HTMLElement).style.color = "#7A5C44"; }}
            >
              + {isFR ? "Ajouter un animal" : "Add a pet"}
            </Link>
          </div>

          {/* Pet navigation chips */}
          {pets.length > 0 && (
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
              {visiblePets.map(pet => (
                <Link
                  key={pet.id}
                  href={`/dashboard/pets/${pet.id}`}
                  style={chipStyle}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8813A"; (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.06)"; (e.currentTarget as HTMLElement).style.color = "#C8813A"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.15)"; (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#7A5C44"; }}
                >
                  <span>{SPECIES_EMOJI[pet.species] ?? "🐾"}</span>
                  <span>{pet.name}</span>
                  {petMetadata[pet.id]?.hasNewChapter && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8813A", display: "inline-block", flexShrink: 0 }} />
                  )}
                </Link>
              ))}
              {extraPets > 0 && (
                <span style={{ fontSize: ".78rem", color: "#9A8070" }}>+{extraPets}</span>
              )}
            </div>
          )}

          {/* Subtitle: this month */}
          <p style={{ fontSize: ".8rem", color: "#9A8070", margin: ".625rem 0 0", fontWeight: 300 }}>
            {monthlyEntryCount > 0
              ? `${monthlyEntryCount} ${isFR ? "moments ce mois" : "moments this month"} · ${isFR ? "prochain chapitre dans" : "next chapter in"} ${daysUntilChapter}j`
              : (isFR ? "Aucun moment ajouté ce mois — commencez votre premier ✨" : "No moments this month — start your first one ✨")}
          </p>
        </div>

        {/* ── Zone B — KPI cards ────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .75rem" }}>
            {t.dashboard.month_title}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isPremium ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: ".75rem" }}>

            {/* Entries card */}
            <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(61,43,31,.07)" }}>
              <p style={{ fontSize: ".68rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 .4rem", fontFamily: "sans-serif" }}>
                {t.dashboard.month_entries_label}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .5rem", lineHeight: 1 }}>
                {entriesLabel}
              </p>
              {/* Progress bar toward 15-entry goal */}
              <div style={{ height: 4, borderRadius: 100, background: "rgba(61,43,31,.1)", overflow: "hidden", marginBottom: ".35rem" }}>
                <div style={{ height: "100%", borderRadius: 100, background: progressColor, width: `${progressPct * 100}%`, transition: "width .4s ease" }} />
              </div>
              <p style={{ fontSize: ".68rem", color: "#9A8070", margin: 0, fontWeight: 300 }}>
                {isPremium
                  ? `∞ ${t.dashboard.premium_badge}`
                  : `${isFR ? "Objectif" : "Goal"} : ${progressGoal} ${isFR ? "moments" : "moments"}`}
              </p>
            </div>

            {/* Next chapter card */}
            <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(61,43,31,.07)" }}>
              <p style={{ fontSize: ".68rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 .4rem", fontFamily: "sans-serif" }}>
                {t.dashboard.month_chapter_label}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .3rem", lineHeight: 1.2 }}>
                {chapterLabel}
              </p>
              <p style={{ fontSize: ".72rem", color: "#7A5C44", margin: "0 0 .5rem", fontWeight: 300 }}>
                {firstOfNextMonth.toLocaleDateString(dateLocale, { month: "long", day: "numeric" })}
              </p>
              {hasStories && (
                <Link
                  href={storiesLink}
                  style={{ fontSize: ".72rem", color: "#C8813A", textDecoration: "none", fontWeight: 400 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  {isFR ? "Voir les chapitres précédents →" : "See past chapters →"}
                </Link>
              )}
            </div>

            {/* Book card — Premium only */}
            {isPremium && (
              <div style={{ background: "linear-gradient(135deg, rgba(200,129,58,.1) 0%, rgba(200,129,58,.05) 100%)", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(200,129,58,.2)" }}>
                <p style={{ fontSize: ".68rem", fontWeight: 500, color: "#C8813A", textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 .4rem", fontFamily: "sans-serif" }}>
                  {t.dashboard.month_book_label.replace("{year}", String(year))}
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .3rem", lineHeight: 1.2 }}>
                  {t.dashboard.month_book_value}
                </p>
                <p style={{ fontSize: ".72rem", color: "#7A5C44", margin: "0 0 .625rem", fontWeight: 300 }}>
                  {monthlyEntryCount > 0
                    ? `${monthlyEntryCount} ${monthlyEntryCount === 1 ? (isFR ? "entrée ajoutée" : "entry added") : (isFR ? "entrées ajoutées" : "entries added")}`
                    : (isFR ? "Ajoutez votre premier moment ✨" : "Add your first moment ✨")}
                </p>
                <Link
                  href={orderLink}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: ".3rem",
                    fontSize: ".75rem", fontWeight: 500, color: "#C8813A",
                    textDecoration: "none", border: "1.5px solid rgba(200,129,58,.4)",
                    borderRadius: 100, padding: ".3rem .75rem",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.12)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {isFR ? "Commander →" : "Order book →"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Premium upsell — 2 cartes */}
        {!isPremium && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .75rem" }}>
              {isFR ? "Passer à Premium" : "Upgrade to Premium"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>

              {/* Digital */}
              <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1.1rem", border: "1.5px solid rgba(200,129,58,.2)", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#C8813A", textTransform: "uppercase", letterSpacing: ".07em", margin: 0 }}>
                  Premium Digital
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", margin: 0, lineHeight: 1 }}>
                  4,99 €<span style={{ fontSize: ".75rem", fontWeight: 400, color: "#7A5C44" }}>/mois</span>
                </p>
                <p style={{ fontSize: ".75rem", color: "#7A5C44", margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
                  {isFR ? "Entrées illimitées, histoires IA, export PDF" : "Unlimited entries, AI stories, PDF export"}
                </p>
                <button
                  onClick={() => handleSubscribe("digital")}
                  disabled={subscribing}
                  style={{ marginTop: "auto", padding: ".5rem .875rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: subscribing ? "wait" : "pointer", opacity: subscribing ? .7 : 1 }}
                >
                  {isFR ? "Choisir Digital →" : "Choose Digital →"}
                </button>
              </div>

              {/* Print */}
              <div style={{ background: "linear-gradient(135deg, rgba(200,129,58,.1) 0%, rgba(200,129,58,.04) 100%)", borderRadius: 16, padding: "1.1rem", border: "1.5px solid rgba(200,129,58,.35)", display: "flex", flexDirection: "column", gap: ".5rem", position: "relative" }}>
                <div style={{ position: "absolute", top: "-.6rem", right: ".875rem", background: "#C8813A", color: "#FDFAF5", fontSize: ".65rem", fontWeight: 600, borderRadius: 100, padding: ".2rem .6rem", letterSpacing: ".04em" }}>
                  {isFR ? "Meilleure valeur" : "Best value"}
                </div>
                <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#C8813A", textTransform: "uppercase", letterSpacing: ".07em", margin: 0 }}>
                  Premium Print
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", margin: 0, lineHeight: 1 }}>
                  9,99 €<span style={{ fontSize: ".75rem", fontWeight: 400, color: "#7A5C44" }}>/mois</span>
                </p>
                <p style={{ fontSize: ".75rem", color: "#7A5C44", margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
                  {isFR ? "Tout Digital + livre relié annuel livré chez vous" : "All Digital + annual hardcover book delivered"}
                </p>
                <button
                  onClick={() => handleSubscribe("print_monthly")}
                  disabled={subscribing}
                  style={{ marginTop: "auto", padding: ".5rem .875rem", borderRadius: 100, border: "1.5px solid #C8813A", background: "transparent", color: "#C8813A", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: subscribing ? "wait" : "pointer", opacity: subscribing ? .7 : 1 }}
                >
                  {isFR ? "Choisir Print →" : "Choose Print →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state — no pets */}
        {pets.length === 0 && (
          <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "3rem 2rem", textAlign: "center", border: "1.5px dashed rgba(61,43,31,.15)", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐾</div>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#3D2B1F", marginBottom: ".5rem" }}>{t.dashboard.no_pets_title}</h3>
            <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, marginBottom: "1.5rem" }}>{t.dashboard.no_pets_desc}</p>
            <Link href="/dashboard/pets/new" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
              {t.dashboard.add_first_pet}
            </Link>
          </div>
        )}

        {/* ── Zone C — Recent moments feed ─────────────────────────────── */}
        {entries.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>
                {t.dashboard.recent_moments}
              </h2>
              {resolvedPetId && (
                <Link
                  href={`/dashboard/pets/${resolvedPetId}?tab=journal`}
                  style={{ fontSize: ".8rem", color: "#C8813A", textDecoration: "none", fontWeight: 400 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  {isFR ? "Voir tout le journal →" : "See full journal →"}
                </Link>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
              {entries.map(entry => {
                const entryPet = pets.find(p => p.id === entry.pet_id);
                return (
                  <Link key={entry.id} href={`/dashboard/pets/${entry.pet_id}?tab=journal`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ background: "#FDFAF5", borderRadius: 14, padding: ".875rem 1.125rem", border: "1px solid rgba(61,43,31,.07)", display: "flex", gap: ".875rem", alignItems: "flex-start", transition: "border-color .15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,129,58,.3)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.07)"}
                    >
                      {/* Pet avatar */}
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".95rem", flexShrink: 0, marginTop: "1px" }}>
                        {entryPet ? SPECIES_EMOJI[entryPet.species] ?? "🐾" : "🐾"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Pet name badge (multi-pet view) */}
                        {pets.length > 1 && entryPet && (
                          <p style={{ fontSize: ".68rem", color: "#C8813A", fontWeight: 500, margin: "0 0 .2rem" }}>{entryPet.name}</p>
                        )}
                        {entry.content.trim() && (
                          <p style={{ fontSize: ".875rem", color: "#3D2B1F", lineHeight: 1.55, margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {entry.content.slice(0, 80)}{entry.content.length > 80 ? "…" : ""}
                          </p>
                        )}
                        {!entry.content.trim() && entry.photo_urls && entry.photo_urls.length > 0 && (
                          <p style={{ fontSize: ".875rem", color: "#9A8070", margin: 0, fontStyle: "italic" }}>
                            {entry.photo_urls.length} {isFR ? "photo(s)" : "photo(s)"}
                          </p>
                        )}
                      </div>
                      {/* Date + mood */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                        <span style={{ fontSize: ".72rem", color: "#9A8070", fontWeight: 300, whiteSpace: "nowrap" }}>
                          {new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                        </span>
                        {entry.mood && (
                          <span style={{ fontSize: ".9rem" }}>
                            {entry.mood === "happy" ? "😄" : entry.mood === "funny" ? "😂" : entry.mood === "tender" ? "🥰" : entry.mood === "sad" ? "😢" : entry.mood === "proud" ? "🏆" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {resolvedPetId && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <Link
                  href={`/dashboard/pets/${resolvedPetId}?tab=journal`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: ".35rem",
                    fontSize: ".8rem", color: "#7A5C44", textDecoration: "none",
                    padding: ".5rem 1rem", borderRadius: 100,
                    border: "1px solid rgba(61,43,31,.15)",
                    transition: "border-color .12s, color .12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8813A"; (e.currentTarget as HTMLElement).style.color = "#C8813A"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.15)"; (e.currentTarget as HTMLElement).style.color = "#7A5C44"; }}
                >
                  {isFR ? "Voir tout le journal →" : "See full journal →"}
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

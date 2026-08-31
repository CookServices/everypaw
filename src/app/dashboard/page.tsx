"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry } from "@/types";
import Link from "next/link";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import GettingStartedChecklist from "@/components/onboarding/GettingStartedChecklist";
import OriginsFlow from "@/components/onboarding/OriginsFlow";
import BookProgressWidget from "@/components/BookProgressWidget";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice, type Currency } from "@/lib/currency";
import { fmtDateOrdinal } from "@/lib/date";
import type { Plan } from "@/lib/plan";
import { getChapterEligibility } from "@/lib/plan-guards";
import { getWeeklyQuestion, currentISOWeekBounds } from "@/lib/interview";

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
  const [plan, setPlan] = useState<Plan>("free");
  const [bookCredits, setBookCredits] = useState(0);
  const [subscriptionRenewalDate, setSubscriptionRenewalDate] = useState<number | null>(null);
  const [paymentPastDue, setPaymentPastDue] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState(false);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasStories, setHasStories] = useState(false);
  const [hasOrigins, setHasOrigins] = useState(false);
  const [originsSkipped, setOriginsSkipped] = useState(false);
  const [monthlyEntryCount, setMonthlyEntryCount] = useState(0);
  const [resolvedPetId, setResolvedPetId] = useState<string | null>(null);
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [interviewDone, setInterviewDone] = useState(false);
  const [interviewAnsweredContent, setInterviewAnsweredContent] = useState("");
  const [interviewSubmitting, setInterviewSubmitting] = useState(false);
  const [interviewError, setInterviewError] = useState(false);
  const [totalEntriesCount, setTotalEntriesCount] = useState(0);
  const [petMetadata, setPetMetadata] = useState<Record<string, {
    lastEntry: string | null;
    monthlyCount: number;
    hasNewChapter: boolean;
  }>>({});

  useEffect(() => {
    try { setResolvedPetId(localStorage.getItem(LAST_PET_KEY)); } catch {}
    try { setOriginsSkipped(localStorage.getItem("ep_origins_skipped") === "1"); } catch {}
    fetch("/api/currency").then(r => r.json()).then(d => setCurrency(d.currency as Currency)).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      const { start: weekStart, end: weekEnd } = currentISOWeekBounds();

      const [
        { data: petsData },
        { data: entriesData },
        { data: profile },
        { data: storiesData },
        { count: monthlyCount },
        { data: allEntriesMeta },
        { data: recentStories },
        { count: originsCount },
        { data: interviewEntry },
        { count: totalEntries },
      ] = await Promise.all([
        supabase.from("pets").select("*").order("created_at", { ascending: false }),
        supabase.from("entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(5),
        supabase.from("profiles").select("is_premium, onboarding_dismissed, book_credits, subscription_renewal_date, plan, payment_past_due").single(),
        supabase.from("stories").select("id").eq("user_id", user.id).limit(1),
        supabase.from("entries").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("entry_date", monthStart).lte("entry_date", monthEnd),
        supabase.from("entries").select("pet_id, entry_date").eq("user_id", user.id).order("entry_date", { ascending: false }),
        supabase.from("stories").select("pet_id").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
        supabase.from("stories").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("story_type", "origins"),
        supabase.from("entries").select("content").eq("user_id", user.id).contains("tags", ["interview"]).gte("entry_date", weekStart).lte("entry_date", weekEnd).limit(1).maybeSingle(),
        supabase.from("entries").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setPets(petsData || []);
      setEntries(entriesData || []);
      setIsPremium(profile?.is_premium || false);
      setPlan((profile?.plan ?? "free") as Plan);
      setBookCredits(profile?.book_credits ?? 0);
      if (profile?.subscription_renewal_date) setSubscriptionRenewalDate(profile.subscription_renewal_date);
      setPaymentPastDue(!!profile?.payment_past_due);
      // Modal visibility follows onboarding_dismissed, not onboarding_completed: completion now
      // reflects having a real pet (set in pets/new), dismissal is what stops the modal recurring.
      setShowOnboarding(!profile?.onboarding_dismissed);
      setHasStories((storiesData?.length || 0) > 0);
      setHasOrigins((originsCount ?? 0) > 0);
      setMonthlyEntryCount(monthlyCount ?? 0);
      setInterviewDone(!!interviewEntry);
      if (interviewEntry?.content) setInterviewAnsweredContent(interviewEntry.content);
      setTotalEntriesCount(totalEntries ?? 0);

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

  const handleSubscribe = async (plan: "digital" | "print_annual" = "digital") => {
    setSubscribing(true);
    setSubscribeError(false);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("[subscribe] No URL returned:", data);
        setSubscribeError(true);
        setSubscribing(false);
      }
    } catch (err) {
      console.error("[subscribe] Fetch error:", err);
      setSubscribeError(true);
      setSubscribing(false);
    }
  };

  const handleInterviewSubmit = async () => {
    if (!interviewAnswer.trim() || !resolvedPetId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const resolvedPet = pets.find(p => p.id === resolvedPetId);
    const petName = resolvedPet?.name || t.interview.fallback_name;
    const question = getWeeklyQuestion(locale).replace("{petName}", petName);
    const content = `Q: ${question}\n${interviewAnswer.trim()}`;
    const today = new Date().toISOString().slice(0, 10);

    setInterviewSubmitting(true);
    setInterviewError(false);
    const { error } = await supabase.from("entries").insert({
      pet_id: resolvedPetId,
      user_id: user.id,
      content,
      entry_date: today,
      tags: ["interview"],
    });
    setInterviewSubmitting(false);
    if (!error) {
      setInterviewDone(true);
      setInterviewAnsweredContent(content);
      setInterviewAnswer("");
    } else {
      setInterviewError(true);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "var(--ep-bg)", padding: "2.5rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div className="ep-skeleton" style={{ width: 160, height: 28 }} />
        <div className="ep-skeleton" style={{ width: 110, height: 32, borderRadius: 100 }} />
      </div>
      {/* Chips skeleton */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "2rem" }}>
        {[80, 100, 90].map(w => <div key={w} className="ep-skeleton" style={{ width: w, height: 28, borderRadius: 100 }} />)}
      </div>
      {/* KPI cards skeleton */}
      <div className="ep-grid-kpi" style={{ marginBottom: "1.5rem" }}>
        {[1, 2].map(i => <div key={i} className="ep-skeleton" style={{ height: 90, borderRadius: 16 }} />)}
      </div>
      {/* Entries skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
        {[1, 2, 3].map(i => <div key={i} className="ep-skeleton" style={{ height: 60, borderRadius: 14 }} />)}
      </div>
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

  const chapterEligibility = getChapterEligibility(plan, monthlyEntryCount);

  // Free plan's "10" is a lifetime cap (see plan-guards.ts canAddEntry), not a monthly one,
  // so its progress must track totalEntriesCount, not monthlyEntryCount.
  const entriesLabel = isPremium
    ? t.dashboard.month_entries_premium.replace("{count}", String(monthlyEntryCount))
    : t.dashboard.month_entries_free.replace("{count}", String(totalEntriesCount));

  const progressGoal = isPremium ? 15 : 10;
  const progressCount = isPremium ? monthlyEntryCount : totalEntriesCount;
  const progressPct = Math.min(progressCount / progressGoal, 1);
  const progressColor = progressPct >= 1 ? "var(--ep-alert)" : "var(--ep-brand)";

  const orderLink = resolvedPetId ? `/dashboard/pets/${resolvedPetId}/order` : "/dashboard";
  const storiesLink = resolvedPetId ? `/dashboard/pets/${resolvedPetId}?tab=stories` : "/dashboard";

  // Pet chips (max 3 visible)
  const visiblePets = pets.slice(0, 3);
  const extraPets = pets.length > 3 ? pets.length - 3 : 0;

  const chipActiveStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: ".35rem",
    padding: ".35rem .75rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500,
    border: "1.5px solid var(--ep-brand)", background: "rgba(200,129,58,.12)", color: "var(--ep-brand)",
    cursor: "default", whiteSpace: "nowrap",
  };
  const chipStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: ".35rem",
    padding: ".35rem .75rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 400,
    border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "var(--ep-text-muted)",
    textDecoration: "none", whiteSpace: "nowrap", transition: "border-color .12s, background .12s",
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600,
    color: "var(--ep-text)", margin: "0 0 .875rem",
  };
  const cardLabelStyle: React.CSSProperties = {
    fontSize: ".7rem", fontWeight: 600, color: "var(--ep-text-muted)", margin: "0 0 .4rem",
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--ep-bg)", fontFamily: "'DM Sans', sans-serif" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {showOnboarding && !pets.length && (
          <OnboardingModal
            hasPets={false}
            hasEntries={entries.length > 0}
            hasStories={hasStories}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
        {showOnboarding && pets.length > 0 && !hasOrigins && !originsSkipped && (
          <OriginsFlow
            pet={pets[0]}
            onComplete={() => {
              setHasOrigins(true);
              try { localStorage.removeItem("ep_origins_skipped"); } catch {}
              window.location.href = `/dashboard/pets/${pets[0].id}?tab=stories`;
            }}
            onSkip={() => {
              try { localStorage.setItem("ep_origins_skipped", "1"); } catch {}
              setOriginsSkipped(true);
            }}
          />
        )}
        {showOnboarding && (pets.length > 0 ? (hasOrigins || originsSkipped) : false) && (
          <OnboardingModal
            hasPets={true}
            hasEntries={entries.length > 0}
            hasStories={hasStories}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        {paymentPastDue && (
          <div style={{ background: "var(--ep-error-bg)", border: "1px solid var(--ep-error-border)", borderRadius: 8, padding: "12px 16px", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: ".875rem", fontWeight: 600, color: "var(--ep-error-ink)", margin: "0 0 .25rem" }}>
              {t.dashboard.payment_issue_title}
            </p>
            <p style={{ fontSize: ".85rem", color: "var(--ep-error-ink)", lineHeight: 1.5, margin: "0 0 .5rem" }}>
              {t.dashboard.payment_issue_desc}
            </p>
            <Link href="/dashboard/settings" style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--ep-error-ink)", textDecoration: "underline" }}>
              {t.dashboard.payment_issue_cta}
            </Link>
          </div>
        )}

        {!showOnboarding && (
          <GettingStartedChecklist
            hasPets={pets.length > 0}
            hasEntries={entries.length > 0}
            hasStories={hasStories}
            firstPetId={resolvedPetId}
          />
        )}

        {/* ── Zone A, Header with pet chips ────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".75rem", marginBottom: "1rem" }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 600, color: "var(--ep-text)", margin: 0 }}>
              {t.dashboard.title}
            </h1>
            <Link
              href="/dashboard/pets/new"
              style={{
                display: "inline-flex", alignItems: "center", gap: ".35rem",
                padding: ".4rem .875rem", borderRadius: 100,
                border: "1.5px solid rgba(61,43,31,.2)", background: "transparent",
                color: "var(--ep-text-muted)", fontSize: ".8rem", textDecoration: "none",
                transition: "border-color .12s, background .12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ep-brand)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-brand)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.2)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-text-muted)"; }}
            >
              {isFR ? "Ajouter un animal" : "Add a pet"}
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
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ep-brand)"; (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.06)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-brand)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.15)"; (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--ep-text-muted)"; }}
                >
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt={pet.name} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <span>{SPECIES_EMOJI[pet.species] ?? "🐾"}</span>
                  )}
                  <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pet.name}</span>
                  {petMetadata[pet.id]?.hasNewChapter && (
                    <span
                      role="img"
                      title={isFR ? "Nouveau chapitre disponible" : "New chapter available"}
                      aria-label={isFR ? "Nouveau chapitre disponible" : "New chapter available"}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ep-brand)", display: "inline-block", flexShrink: 0 }}
                    />
                  )}
                </Link>
              ))}
              {extraPets > 0 && (
                <span style={{ fontSize: ".78rem", color: "var(--ep-text-muted)" }}>+{extraPets}</span>
              )}
            </div>
          )}

          {/* Subtitle: this month */}
          <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", margin: ".625rem 0 0", fontWeight: 300 }}>
            {monthlyEntryCount > 0
              ? `${monthlyEntryCount} ${isFR ? "moment(s) ce mois" : "moments this month"} · ${isFR ? "prochain chapitre dans" : "next chapter in"} ${daysUntilChapter}j`
              : (isFR ? "Aucun moment ajouté ce mois, commencez votre premier ✨" : "No moments this month, start your first one ✨")}
          </p>
        </div>

        {/* ── Zone B, KPI cards ────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={sectionHeadingStyle}>
            {t.dashboard.month_title}
          </p>
          <div className="ep-grid-kpi" style={{ gridTemplateColumns: isPremium ? undefined : "repeat(2, 1fr)" }}>

            {/* Entries card */}
            <div style={{ background: "var(--ep-bg-card)", borderRadius: 16, padding: "1rem 1.1rem", border: "1px solid rgba(61,43,31,.07)" }}>
              <p style={cardLabelStyle}>
                {t.dashboard.month_entries_label}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .5rem", lineHeight: 1 }}>
                {entriesLabel}
              </p>
              {/* Progress bar toward the plan's real cap: 10 lifetime (free) or 15 monthly (premium, decorative) */}
              <div style={{ height: 4, borderRadius: 100, background: "rgba(61,43,31,.1)", overflow: "hidden", marginBottom: ".35rem" }}>
                <div style={{ height: "100%", borderRadius: 100, background: progressColor, width: "100%", transform: `scaleX(${progressPct})`, transformOrigin: "left", transition: "transform .4s ease" }} />
              </div>
              <p style={{ fontSize: ".68rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300 }}>
                {isPremium
                  ? `∞ ${t.dashboard.premium_badge}`
                  : t.dashboard.month_entries_free_period}
              </p>
            </div>

            {/* Next chapter card — emotional focal point */}
            <div style={{ background: "linear-gradient(135deg, rgba(200,129,58,.12) 0%, rgba(200,129,58,.05) 100%)", borderRadius: 16, padding: "1.1rem 1.2rem", border: "1.5px solid rgba(200,129,58,.25)" }}>
              <p style={cardLabelStyle}>
                {t.dashboard.month_chapter_label}
              </p>
              {chapterEligibility.state === "eligible" && (
                <>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 5vw, 1.65rem)", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .35rem", lineHeight: 1.15 }}>
                    {chapterLabel}
                  </p>
                  <p style={{ fontSize: ".72rem", color: "var(--ep-text-muted)", margin: "0 0 .15rem", fontWeight: 300 }}>
                    {(() => {
                      const d = firstOfNextMonth.getDate();
                      const m = firstOfNextMonth.toLocaleDateString(dateLocale, { month: "long" });
                      const ord = isFR ? (d === 1 ? "1er" : `${d}`) : (d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`);
                      return isFR ? `${ord} ${m}` : `${m} ${ord}`;
                    })()}
                  </p>
                  <p style={{ fontSize: ".68rem", color: "var(--ep-text-muted)", margin: "0 0 .5rem", fontWeight: 300 }}>
                    {isFR ? "Généré automatiquement" : "Auto-generated"}
                  </p>
                </>
              )}
              {chapterEligibility.state === "needs_entries" && (
                <>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .35rem", lineHeight: 1.3 }}>
                    {t.dashboard.month_chapter_missing.replace("{n}", String(chapterEligibility.missing))}
                  </p>
                  {resolvedPetId && (
                    <Link
                      href={`/dashboard/pets/${resolvedPetId}?tab=journal`}
                      style={{ fontSize: ".72rem", color: "var(--ep-brand)", textDecoration: "none", fontWeight: 500, display: "inline-block", marginBottom: ".5rem" }}
                    >
                      {t.dashboard.month_chapter_add_moment}
                    </Link>
                  )}
                </>
              )}
              {chapterEligibility.state === "not_included" && (
                <>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .35rem", lineHeight: 1.3 }}>
                    {t.dashboard.month_chapter_not_included}
                  </p>
                  <Link
                    href={storiesLink}
                    style={{ fontSize: ".72rem", color: "var(--ep-brand)", textDecoration: "none", fontWeight: 500, display: "inline-block", marginBottom: ".5rem" }}
                  >
                    {t.dashboard.month_chapter_write_manually}
                  </Link>
                </>
              )}
              {hasStories && (
                <Link
                  href={storiesLink}
                  style={{ fontSize: ".72rem", color: "var(--ep-brand)", textDecoration: "none", fontWeight: 400 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  {isFR ? "Voir les chapitres précédents" : "See past chapters"}
                </Link>
              )}
            </div>

            {/* Book card, Premium only */}
            {isPremium && (
              <div style={{ background: "var(--ep-bg-card)", borderRadius: 16, padding: "1rem 1.1rem", border: "1.5px solid rgba(200,129,58,.25)", gridColumn: "1 / -1" }}>
                <p style={{ ...cardLabelStyle, color: "var(--ep-brand)" }}>
                  {t.dashboard.month_book_label.replace("{year}", String(year))}
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .3rem", lineHeight: 1.2 }}>
                  {t.dashboard.month_book_value}
                </p>
                <p style={{ fontSize: ".72rem", color: "var(--ep-text-muted)", margin: "0 0 .25rem", fontWeight: 300 }}>
                  {monthlyEntryCount > 0
                    ? `${monthlyEntryCount} ${monthlyEntryCount === 1 ? (isFR ? "entrée ajoutée" : "entry added") : (isFR ? "entrées ajoutées" : "entries added")}`
                    : (isFR ? "Aucune entrée ce mois, ajoutez des moments ✨" : "No entries this month, add some moments ✨")}
                </p>
                <p style={{ fontSize: ".72rem", color: bookCredits > 0 ? "var(--ep-brand)" : "var(--ep-text-muted)", margin: "0 0 .625rem", fontWeight: 300 }}>
                  {bookCredits > 0
                    ? t.dashboard.month_book_credit_available.replace("{n}", String(bookCredits))
                    : subscriptionRenewalDate
                      ? t.dashboard.month_book_credit_used.replace("{date}", fmtDateOrdinal(new Date(subscriptionRenewalDate * 1000), isFR, { month: "short", year: "numeric" }))
                      : (isFR ? "Crédit utilisé cette année" : "Credit used this year")}
                </p>
                <Link
                  href={orderLink}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: ".3rem",
                    fontSize: ".75rem", fontWeight: 500, color: "var(--ep-brand)",
                    textDecoration: "none", border: "1.5px solid rgba(200,129,58,.4)",
                    borderRadius: 100, padding: ".3rem .75rem",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.12)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  {isFR ? "Commander" : "Order book"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Origins waiting card ─────────────────────────────────────── */}
        {pets.length > 0 && !hasOrigins && originsSkipped && (
          <div style={{
            background: "rgba(200,129,58,.06)", border: "1.5px solid rgba(200,129,58,.25)",
            borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "1.5rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
          }}>
            <div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .25rem" }}>
                {(t.onboarding.origins_dashboard_title as string).replace("{petName}", pets[0]?.name || "")}
              </p>
              <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300 }}>
                {t.onboarding.origins_dashboard_desc as string}
              </p>
            </div>
            <button
              onClick={() => {
                try { localStorage.removeItem("ep_origins_skipped"); } catch {}
                setOriginsSkipped(false);
              }}
              style={{
                flexShrink: 0, padding: ".5rem 1rem", borderRadius: 100, border: "none",
                background: "var(--ep-brand)", color: "var(--ep-bg-card)",
                fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.onboarding.origins_dashboard_cta as string}
            </button>
          </div>
        )}

        {/* ── Zone B.5, Book progress widget ─────────────────────────── */}
        {pets.length > 0 && resolvedPetId && (() => {
          const resolvedPet = pets.find(p => p.id === resolvedPetId);
          if (!resolvedPet) return null;
          return (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={sectionHeadingStyle}>
                {isFR ? `Votre livre ${year}` : `Your ${year} book`}
              </p>
              <BookProgressWidget pet={resolvedPet} plan={plan} />
            </div>
          );
        })()}

        {/* ── Weekly interview card ────────────────────────────────────── */}
        {pets.length > 0 && resolvedPetId && (() => {
          const resolvedPet = pets.find(p => p.id === resolvedPetId);
          const petName = resolvedPet?.name || t.interview.fallback_name;
          const question = getWeeklyQuestion(locale).replace("{petName}", petName);
          const isEntryLimitReached = plan === "free" && totalEntriesCount >= 10;

          return (
            <div style={{ background: "var(--ep-bg-card)", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.07)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", margin: "0 0 .75rem" }}>
                <p style={{ ...cardLabelStyle, margin: 0 }}>
                  {t.dashboard.interview_title}
                </p>
                {/* Which pet this question is about: needed once there's more than one, since the
                    dashboard nav can be in "All my pets" mode while this card still targets one pet. */}
                {pets.length > 1 && resolvedPet && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", fontSize: ".72rem", color: "var(--ep-brand)", fontWeight: 500, flexShrink: 0 }}>
                    {resolvedPet.photo_url ? (
                      <img src={resolvedPet.photo_url} alt={resolvedPet.name} style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span>{SPECIES_EMOJI[resolvedPet.species] ?? "🐾"}</span>
                    )}
                    {resolvedPet.name}
                  </span>
                )}
              </div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 400, color: "var(--ep-text)", lineHeight: 1.6, margin: "0 0 .875rem", fontStyle: "italic" }}>
                {question}
              </p>
              {interviewDone ? (
                <div>
                  <p style={{ fontSize: ".8rem", color: "var(--ep-text-muted)", margin: "0 0 .35rem", fontWeight: 300, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {interviewAnsweredContent.split("\n").slice(1).join("\n")}
                  </p>
                  <p style={{ fontSize: ".75rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300 }}>
                    {t.dashboard.interview_done}
                  </p>
                </div>
              ) : isEntryLimitReached ? (
                <p style={{ fontSize: ".8rem", color: "var(--ep-brand)", margin: 0, fontWeight: 400 }}>
                  {t.dashboard.interview_upgrade_hint}{" "}
                  <Link href="/dashboard/settings" style={{ color: "var(--ep-brand)", fontWeight: 500 }}>
                    {locale === "fr" ? "Passer Premium" : "Upgrade"}
                  </Link>
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  <textarea
                    value={interviewAnswer}
                    onChange={e => setInterviewAnswer(e.target.value)}
                    placeholder={t.dashboard.interview_placeholder}
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: ".625rem .75rem", borderRadius: 10,
                      border: "1.5px solid rgba(61,43,31,.15)", background: "var(--ep-bg)",
                      fontFamily: "'DM Sans', sans-serif", fontSize: ".875rem",
                      color: "var(--ep-text)", resize: "vertical", outline: "none",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--ep-brand)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(61,43,31,.15)")}
                  />
                  <button
                    onClick={handleInterviewSubmit}
                    disabled={interviewSubmitting || !interviewAnswer.trim()}
                    style={{
                      alignSelf: "flex-start", padding: ".45rem 1.1rem", borderRadius: 100,
                      border: "none", background: "var(--ep-brand)", color: "var(--ep-bg-card)",
                      fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500,
                      cursor: interviewSubmitting || !interviewAnswer.trim() ? "not-allowed" : "pointer",
                      opacity: interviewSubmitting || !interviewAnswer.trim() ? .55 : 1,
                      transition: "opacity .15s",
                    }}
                  >
                    {interviewSubmitting ? t.dashboard.interview_submitting : t.dashboard.interview_cta}
                  </button>
                  {interviewError && (
                    <p style={{ fontSize: ".8rem", color: "var(--ep-error-ink)", margin: 0, fontWeight: 400 }}>
                      {isFR
                        ? "Échec de l'enregistrement. Vérifie ta connexion et réessaie."
                        : "Couldn't save your answer. Check your connection and try again."}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Premium upsell, 2 cartes */}
        {!isPremium && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={sectionHeadingStyle}>
              {isFR ? "Passer à Premium" : "Upgrade to Premium"}
            </p>
            <div className="ep-grid-2">

              {/* Digital */}
              <div style={{ background: "var(--ep-bg-card)", borderRadius: 16, padding: "1.1rem", border: "1.5px solid rgba(200,129,58,.2)", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <p style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--ep-brand)", margin: 0 }}>
                  Premium Digital
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--ep-text)", margin: 0, lineHeight: 1 }}>
                  {formatPrice(currency, "digital")}<span style={{ fontSize: ".75rem", fontWeight: 400, color: "var(--ep-text-muted)" }}>/{isFR ? "mois" : "mo"}</span>
                </p>
                <p style={{ fontSize: ".75rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
                  {isFR ? "Entrées illimitées, histoires IA, export PDF" : "Unlimited entries, AI stories, PDF export"}
                </p>
                <button
                  onClick={() => handleSubscribe("digital")}
                  disabled={subscribing}
                  style={{ marginTop: "auto", padding: ".5rem .875rem", borderRadius: 100, border: "none", background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: subscribing ? "wait" : "pointer", opacity: subscribing ? .7 : 1 }}
                >
                  {isFR ? "Choisir Digital" : "Choose Digital"}
                </button>
              </div>

              {/* Print */}
              <div style={{ background: "linear-gradient(135deg, rgba(200,129,58,.1) 0%, rgba(200,129,58,.04) 100%)", borderRadius: 16, padding: "1.1rem", border: "1.5px solid rgba(200,129,58,.35)", display: "flex", flexDirection: "column", gap: ".5rem", position: "relative" }}>
                <div style={{ position: "absolute", top: "-.6rem", right: ".875rem", background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontSize: ".65rem", fontWeight: 600, borderRadius: 100, padding: ".2rem .6rem", letterSpacing: ".04em" }}>
                  {isFR ? "Meilleure valeur" : "Best value"}
                </div>
                <p style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--ep-brand)", margin: 0 }}>
                  Premium Print
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--ep-text)", margin: 0, lineHeight: 1 }}>
                  {formatPrice(currency, "printAnnual")}<span style={{ fontSize: ".75rem", fontWeight: 400, color: "var(--ep-text-muted)" }}>/{isFR ? "an" : "yr"}</span>
                </p>
                <p style={{ fontSize: ".75rem", color: "var(--ep-text-muted)", margin: 0, fontWeight: 300, lineHeight: 1.5 }}>
                  {isFR ? "Tout Digital + livre relié annuel livré chez vous" : "All Digital + annual hardcover book delivered"}
                </p>
                <button
                  onClick={() => handleSubscribe("print_annual")}
                  disabled={subscribing}
                  style={{ marginTop: "auto", padding: ".5rem .875rem", borderRadius: 100, border: "1.5px solid var(--ep-brand)", background: "transparent", color: "var(--ep-brand)", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: subscribing ? "wait" : "pointer", opacity: subscribing ? .7 : 1 }}
                >
                  {isFR ? "Choisir Print" : "Choose Print"}
                </button>
              </div>
            </div>
            {subscribeError && (
              <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", marginTop: ".75rem", textAlign: "center" }}>
                {isFR
                  ? "Une erreur est survenue. Vérifie ta connexion ou réessaie."
                  : "Something went wrong. Please check your connection and try again."}
              </p>
            )}
          </div>
        )}

        {/* Empty state, no pets */}
        {pets.length === 0 && (
          <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "3rem 2rem", textAlign: "center", border: "1.5px dashed rgba(61,43,31,.15)", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐾</div>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "var(--ep-text)", marginBottom: ".5rem" }}>{t.dashboard.no_pets_title}</h3>
            <p style={{ fontSize: ".875rem", color: "var(--ep-text-muted)", fontWeight: 300, marginBottom: "1.5rem" }}>{t.dashboard.no_pets_desc}</p>
            <Link href="/dashboard/pets/new" style={{ background: "var(--ep-brand)", color: "var(--ep-bg-card)", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
              {t.dashboard.add_first_pet}
            </Link>
          </div>
        )}

        {/* ── Zone C, Recent moments feed ─────────────────────────────── */}
        {entries.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.15rem", fontWeight: 600, color: "var(--ep-text)", margin: 0 }}>
                {t.dashboard.recent_moments}
              </h2>
              {resolvedPetId && (
                <Link
                  href={`/dashboard/pets/${resolvedPetId}?tab=journal`}
                  style={{ fontSize: ".8rem", color: "var(--ep-brand)", textDecoration: "none", fontWeight: 400 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
                >
                  {isFR ? "Voir tout le journal" : "See full journal"}
                </Link>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
              {entries.map(entry => {
                const entryPet = pets.find(p => p.id === entry.pet_id);
                return (
                  <Link key={entry.id} href={`/dashboard/pets/${entry.pet_id}?tab=journal`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ background: "var(--ep-bg-card)", borderRadius: 14, padding: ".875rem 1.125rem", border: "1px solid rgba(61,43,31,.07)", display: "flex", gap: ".875rem", alignItems: "flex-start", transition: "border-color .15s" }}
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
                          <p style={{ fontSize: ".68rem", color: "var(--ep-brand)", fontWeight: 500, margin: "0 0 .2rem" }}>{entryPet.name}</p>
                        )}
                        {entry.content.trim() && (
                          <p style={{ fontSize: ".875rem", color: "var(--ep-text)", lineHeight: 1.55, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                            {entry.content}
                          </p>
                        )}
                        {!entry.content.trim() && entry.photo_urls && entry.photo_urls.length > 0 && (
                          <p style={{ fontSize: ".875rem", color: "var(--ep-text-muted)", margin: 0, fontStyle: "italic" }}>
                            {entry.photo_urls.length} {isFR ? "photo(s)" : "photo(s)"}
                          </p>
                        )}
                      </div>
                      {/* Date + mood */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                        <span style={{ fontSize: ".72rem", color: "var(--ep-text-muted)", fontWeight: 300, whiteSpace: "nowrap" }}>
                          {fmtDateOrdinal(new Date(entry.entry_date), isFR, { month: "short" })}
                        </span>
                        {entry.mood && (
                          <span
                            role="img"
                            aria-label={
                              entry.mood === "happy" ? (isFR ? "Heureux" : "Happy")
                                : entry.mood === "funny" ? (isFR ? "Drôle" : "Funny")
                                  : entry.mood === "tender" ? (isFR ? "Tendre" : "Tender")
                                    : entry.mood === "sad" ? (isFR ? "Triste" : "Sad")
                                      : entry.mood === "proud" ? (isFR ? "Fier" : "Proud") : ""
                            }
                            style={{ fontSize: ".9rem" }}
                          >
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
                    fontSize: ".8rem", color: "var(--ep-text-muted)", textDecoration: "none",
                    padding: ".5rem 1rem", borderRadius: 100,
                    border: "1px solid rgba(61,43,31,.15)",
                    transition: "border-color .12s, color .12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ep-brand)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-brand)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.15)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-text-muted)"; }}
                >
                  {isFR ? "Voir tout le journal" : "See full journal"}
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

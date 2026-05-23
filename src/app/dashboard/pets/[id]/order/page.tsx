"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

type Step = "preview" | "address" | "confirm" | "success";

interface Story {
  id: string;
  title: string | null;
  content: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface Entry {
  id: string;
  photo_urls: string[];
  entry_date: string;
}

interface Pet {
  id: string;
  name: string;
  birthdate: string | null;
  created_at: string;
}

const SHIPPING_BY_COUNTRY: Record<string, string> = {
  FR: "~5–10 €", DE: "~5–10 €", ES: "~5–10 €", IT: "~5–10 €",
  NL: "~5–10 €", BE: "~5–10 €", PT: "~5–10 €", AT: "~5–10 €",
  CH: "~8–14 CHF", SE: "~80–120 SEK", DK: "~70–110 DKK", NO: "~90–140 NOK",
  FI: "~5–10 €", IE: "~5–10 €", PL: "~5–10 €",
  GB: "~£8–14", US: "~$12–18", CA: "~$15–22", AU: "~$18–28",
  NZ: "~$22–32", SG: "~$18–26", JP: "~¥1800–2800", KR: "~₩18000–28000",
  AE: "~$18–28", ZA: "~$20–32",
};

const COUNTRIES = [
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
  { code: "ES", name: "Spain" }, { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" }, { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" }, { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" }, { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" }, { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" }, { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" }, { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" }, { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
];

export default function OrderPage({ params }: { params: { id: string } }) {
  const { t, locale } = useLocale();
  const { id } = params;
  const searchParams = useSearchParams();
  const isMemorial = searchParams.get("memorial") === "true";

  const [pet, setPet] = useState<Pet | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [step, setStep] = useState<Step>("preview");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // New states for Points 4, 7, 9, 10
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [dedicationText, setDedicationText] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<number | null>(new Date().getFullYear());
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);

  const [address, setAddress] = useState(() => ({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postCode: "",
    country: typeof navigator !== "undefined" && navigator.language.startsWith("fr") ? "FR" : "",
  }));

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("pets").select("id, name, birthdate, created_at").eq("id", id).single(),
      supabase.from("stories").select("id, title, content, period_start, period_end, created_at").eq("pet_id", id).order("created_at", { ascending: true }),
      supabase.from("entries").select("id, photo_urls, entry_date").eq("pet_id", id).order("entry_date", { ascending: true }),
    ]).then(([{ data: petData }, { data: storiesData }, { data: entriesData }]) => {
      if (petData) setPet(petData);
      if (storiesData) setStories(storiesData);
      if (entriesData) setEntries(entriesData);
    });
  }, [id]);

  // Initialize yearFilter to most recent year with data, then select all stories for that year
  useEffect(() => {
    if (stories.length > 0) {
      const years = stories.map(s => new Date(s.period_start ?? s.created_at).getFullYear());
      const mostRecentYear = Math.max(...years);
      setYearFilter(mostRecentYear);
      setSelectedStoryIds(
        stories
          .filter(s => new Date(s.period_start ?? s.created_at).getFullYear() === mostRecentYear)
          .map(s => s.id)
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]);

  // Reset selectedStoryIds when yearFilter changes (Point 9)
  const handleYearChange = (year: number | null) => {
    setYearFilter(year);
    const visible = year === null
      ? stories
      : stories.filter(s => new Date(s.period_start ?? s.created_at).getFullYear() === year);
    setSelectedStoryIds(visible.map(s => s.id));
  };

  // Derived: available years (Point 9)
  const availableYears = Array.from(
    new Set(
      stories.map(s => new Date(s.period_start ?? s.created_at).getFullYear())
    )
  ).sort((a, b) => b - a);

  // Derived: stories filtered by year (Point 9)
  const visibleStories = yearFilter === null
    ? stories
    : stories.filter(s => new Date(s.period_start ?? s.created_at).getFullYear() === yearFilter);

  // Derived: entries filtered by year (Point 9)
  const filteredEntries = yearFilter === null
    ? entries
    : entries.filter(e => new Date(e.entry_date).getFullYear() === yearFilter);

  const petName = pet?.name ?? "";
  const photoEntries = filteredEntries.filter(e => e.photo_urls?.length > 0);
  const photoCount = Math.min(photoEntries.flatMap(e => e.photo_urls).length, 6);

  // All photos available for cover selection — from all entries, not filtered by year (Point 10)
  const availablePhotos = entries
    .flatMap(e => e.photo_urls ?? [])
    .filter(Boolean)
    .slice(0, 8);

  const coverPeriod = (() => {
    if (!pet) return "";
    const allDates: Date[] = [];
    if (pet.birthdate) allDates.push(new Date(pet.birthdate));
    visibleStories.forEach(s => { if (s.period_start) allDates.push(new Date(s.period_start)); });
    filteredEntries.forEach(e => { if (e.entry_date) allDates.push(new Date(e.entry_date)); });
    const start = allDates.length ? allDates.reduce((a, b) => a < b ? a : b) : new Date(pet.created_at);
    const startYear = start.getFullYear();
    const endYear = yearFilter ?? new Date().getFullYear();
    return startYear === endYear ? String(startYear) : `${startYear}–${endYear}`;
  })();

  const monthsCount = (() => {
    if (!pet) return 1;
    const start = pet.birthdate ? new Date(pet.birthdate) : new Date(pet.created_at);
    return Math.max(1, Math.round((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  })();

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gelato/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: id,
          shippingAddress: address,
          memorial: isMemorial,
          selectedStoryIds,
          dedicationText: dedicationText.trim() || null,
          coverPhotoUrl,
          yearFilter,
        }),
      });
      const data = await res.json();
      if (data.orderId) {
        setOrderId(data.orderId);
        setStep("success");
      } else {
        alert(t.order.order_failed);
      }
    } catch {
      alert(t.order.order_failed);
    }
    setLoading(false);
  };

  const fields = [
    { key: "firstName", label: t.order.first_name, placeholder: "" },
    { key: "lastName", label: t.order.last_name, placeholder: "" },
    { key: "addressLine1", label: t.order.address, placeholder: "" },
    { key: "addressLine2", label: t.order.apt, placeholder: "" },
    { key: "city", label: t.order.city, placeholder: "" },
    { key: "postCode", label: t.order.postal_code, placeholder: "" },
  ];

  const bg = isMemorial ? "#1C1410" : "#F7F2EA";
  const cardBg = isMemorial ? "rgba(247,242,234,.04)" : "#FDFAF5";
  const cardBorder = isMemorial ? "1px solid rgba(247,242,234,.08)" : "1px solid rgba(61,43,31,.08)";
  const textPrimary = isMemorial ? "#F7F2EA" : "#3D2B1F";
  const textMuted = isMemorial ? "rgba(247,242,234,.5)" : "#7A5C44";
  const labelColor = isMemorial ? "rgba(247,242,234,.4)" : "#7A5C44";
  const accentColor = isMemorial ? "#8B6B4A" : "#C8813A";
  const price = isMemorial ? t.memorial.order_price : t.order.product_price;
  const productName = isMemorial
    ? (petName ? t.memorial.order_tribute.replace("{name}", petName) : "…")
    : t.order.product_detail;
  const productSpecs = isMemorial ? t.memorial.order_specs : t.order.product_specs;
  const warningText = isMemorial ? t.memorial.order_note : t.order.warning;

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.12)" : "rgba(61,43,31,.15)"}`,
    background: isMemorial ? "rgba(247,242,234,.05)" : "#F7F2EA",
    fontFamily: "inherit", fontSize: ".9rem",
    color: isMemorial ? "#F7F2EA" : "#3D2B1F",
    outline: "none", boxSizing: "border-box" as const,
  };

  // Stepper: preview=0, address=1, confirm=2 (success has no stepper)
  const stepIndex: Record<Step, number> = { preview: 0, address: 1, confirm: 2, success: 3 };
  const currentIdx = stepIndex[step];
  const stepLabels = [t.order.step_preview, t.order.step_address, t.order.step_payment];

  const shippingEstimate = SHIPPING_BY_COUNTRY[address.country];

  const dedicationLabel = locale === "fr" ? "Dédicace (optionnel)" : "Dedication (optional)";
  const dedicationPlaceholder = locale === "fr"
    ? "Ex : À toi, notre fidèle compagnon…"
    : "E.g.: To you, our faithful companion…";
  const bookYearLabel = locale === "fr" ? "Année du livre" : "Book year";
  const allYearsLabel = locale === "fr" ? "Toutes les années" : "All years";
  const coverPhotoLabel = locale === "fr" ? "Photo de couverture" : "Cover photo";
  const coverDefaultLabel = locale === "fr" ? "Par défaut" : "Default";
  const chaptersLabel = locale === "fr" ? "Chapitres à inclure" : "Chapters to include";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', sans-serif", transition: "background .3s" }}>
      <nav style={{ background: isMemorial ? "rgba(28,20,16,.9)" : "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${isMemorial ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.08)"}`, padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/dashboard/pets/${id}`} style={{ fontSize: ".85rem", color: textMuted, textDecoration: "none" }}>{t.order.back}</Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary }}>
          {isMemorial && petName
            ? t.memorial.order_tribute.replace("{name}", petName)
            : t.order.title}
        </span>
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Stepper — hidden on success */}
        {step !== "success" && (
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "2.5rem" }}>
            {stepLabels.map((label, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Connector line left */}
                {i > 0 && (
                  <div style={{
                    position: "absolute", top: 15, right: "50%", width: "100%", height: 2,
                    background: i <= currentIdx ? accentColor : isMemorial ? "rgba(247,242,234,.1)" : "rgba(61,43,31,.12)",
                    zIndex: 0,
                  }} />
                )}
                {/* Circle */}
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", zIndex: 1, position: "relative",
                  background: i < currentIdx ? accentColor : i === currentIdx ? accentColor : isMemorial ? "rgba(247,242,234,.08)" : "rgba(61,43,31,.08)",
                  border: i === currentIdx ? `2px solid ${accentColor}` : "2px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: i <= currentIdx ? "#FDFAF5" : textMuted,
                  fontSize: i < currentIdx ? ".85rem" : ".8rem",
                  fontWeight: 600, transition: "all .3s",
                }}>
                  {i < currentIdx ? "✓" : i + 1}
                </div>
                {/* Label */}
                <span style={{
                  fontSize: ".7rem", marginTop: ".35rem",
                  color: i === currentIdx ? accentColor : i < currentIdx ? accentColor : textMuted,
                  fontWeight: i === currentIdx ? 600 : 400,
                  textAlign: "center", lineHeight: 1.2,
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Memorial hero — preview step only */}
        {isMemorial && petName && step === "preview" && (
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600, color: "#F7F2EA", marginBottom: ".5rem" }}>
              {t.memorial.order_tribute.replace("{name}", petName)}
            </h1>
            <p style={{ fontSize: ".9rem", color: "rgba(247,242,234,.5)", fontWeight: 300, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
              {t.memorial.order_subtitle}
            </p>
          </div>
        )}

        {/* ─── PREVIEW STEP ─── */}
        {step === "preview" && (
          <div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.25rem", textAlign: "center" }}>
              {t.order.preview_title}
            </h2>

            {/* Year filter — shown as soon as there is data (Point 9) */}
            {availableYears.length >= 1 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>
                  {bookYearLabel}
                </label>
                <select
                  value={yearFilter ?? ""}
                  onChange={e => handleYearChange(e.target.value === "" ? null : Number(e.target.value))}
                  style={inputStyle}
                >
                  {availableYears.length > 1 && (
                    <option value="">{allYearsLabel}</option>
                  )}
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Book cover */}
            <div style={{
              background: isMemorial ? "#0E0B08" : (coverPhotoUrl ? "transparent" : "#3D2B1F"),
              backgroundImage: coverPhotoUrl
                ? `linear-gradient(rgba(61,43,31,.7), rgba(61,43,31,.85)), url('${coverPhotoUrl}')`
                : undefined,
              backgroundSize: coverPhotoUrl ? "cover" : undefined,
              backgroundPosition: coverPhotoUrl ? "center" : undefined,
              borderRadius: 20, padding: "3rem 2rem",
              textAlign: "center", marginBottom: "1.25rem",
              boxShadow: "0 12px 40px rgba(0,0,0,.25)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Decorative spine line */}
              <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 4, background: isMemorial ? "rgba(139,107,74,.4)" : "rgba(200,129,58,.35)", borderRadius: 2 }} />
              <div style={{ fontSize: "2.75rem", marginBottom: "1.25rem" }}>{isMemorial ? "🕊️" : "🐾"}</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 600, color: "#F7C27A", lineHeight: 1.25, marginBottom: ".75rem" }}>
                {isMemorial
                  ? t.order.memorial_cover_title.replace("{name}", petName || "…")
                  : t.order.book_cover_title.replace("{name}", petName || "…")}
              </div>
              {coverPeriod && (
                <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "1rem", color: "rgba(247,242,234,.45)", marginBottom: "1.5rem" }}>
                  {petName} · {coverPeriod}
                </div>
              )}
              <div style={{ width: 48, height: 2, background: accentColor, margin: "0 auto 1.5rem", borderRadius: 1 }} />
              <div style={{ fontSize: ".7rem", color: "rgba(247,242,234,.3)", letterSpacing: ".12em", textTransform: "uppercase" }}>
                {t.order.book_cover_label}
              </div>
            </div>

            {/* Cover photo picker (Point 10) */}
            {availablePhotos.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".875rem", fontFamily: "sans-serif" }}>
                  {coverPhotoLabel}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", alignItems: "center" }}>
                  {/* Default button */}
                  <button
                    onClick={() => setCoverPhotoUrl(null)}
                    style={{
                      width: 60, height: 60, borderRadius: 8,
                      background: "#3D2B1F",
                      border: coverPhotoUrl === null ? "2px solid #C8813A" : "2px solid transparent",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "rgba(247,242,234,.6)", fontSize: ".6rem", fontFamily: "sans-serif",
                      textAlign: "center", padding: 4, lineHeight: 1.2,
                    }}
                  >
                    {coverDefaultLabel}
                  </button>
                  {/* Photo thumbnails */}
                  {availablePhotos.map((photoUrl, i) => (
                    <button
                      key={i}
                      onClick={() => setCoverPhotoUrl(photoUrl)}
                      style={{
                        width: 60, height: 60, borderRadius: 8,
                        border: coverPhotoUrl === photoUrl ? "2px solid #C8813A" : "2px solid transparent",
                        padding: 0, cursor: "pointer", overflow: "hidden", background: "transparent",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content summary pill */}
            <div style={{
              background: cardBg, border: cardBorder, borderRadius: 14,
              padding: ".875rem 1.25rem", marginBottom: "1.5rem",
              display: "flex", justifyContent: "center", alignItems: "center",
              gap: ".75rem", flexWrap: "wrap",
            }}>
              {[
                t.order.summary_chapters.replace("{n}", String(visibleStories.length)),
                t.order.summary_photos.replace("{n}", String(photoCount)),
                t.order.summary_months.replace("{n}", String(monthsCount)),
              ].map((item, i, arr) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                  <span style={{ fontSize: ".875rem", fontWeight: i === 1 ? 400 : 500, color: i === 1 ? accentColor : textPrimary }}>
                    {item}
                  </span>
                  {i < arr.length - 1 && <span style={{ color: isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)", fontSize: ".75rem" }}>·</span>}
                </span>
              ))}
            </div>

            {/* Chapter selection (Point 4 & 9) */}
            {visibleStories.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".875rem", fontFamily: "sans-serif" }}>
                  {chaptersLabel}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {visibleStories.map((story, i) => {
                    const isSelected = selectedStoryIds.includes(story.id);
                    return (
                      <div
                        key={story.id}
                        onClick={() => {
                          setSelectedStoryIds(prev =>
                            isSelected
                              ? prev.filter(sid => sid !== story.id)
                              : [...prev, story.id]
                          );
                        }}
                        style={{
                          background: cardBg,
                          border: isSelected
                            ? `1.5px solid ${accentColor}`
                            : cardBorder,
                          borderRadius: 16, padding: "1.25rem 1.5rem",
                          cursor: "pointer",
                          display: "flex", alignItems: "flex-start", gap: "1rem",
                          transition: "border-color .15s",
                        }}
                      >
                        {/* Checkbox indicator */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                          background: isSelected ? accentColor : "transparent",
                          border: `2px solid ${isSelected ? accentColor : isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#FDFAF5", fontSize: ".7rem", fontWeight: 700,
                        }}>
                          {isSelected ? "✓" : ""}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: ".7rem", fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: ".4rem" }}>
                            {t.order.preview_chapter} {i + 1}
                          </div>
                          <div style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem", lineHeight: 1.3 }}>
                            {story.title || `${petName}'s Story`}
                          </div>
                          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: ".84rem", color: textMuted, lineHeight: 1.75 }}>
                            {story.content.slice(0, 160).trim()}
                            {story.content.length > 160 ? "…" : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Photo preview (first available photo) */}
            {photoEntries.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".875rem", fontFamily: "sans-serif" }}>
                  {t.order.preview_photos_page}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: photoEntries.length > 1 ? "1fr 1fr" : "1fr", gap: ".625rem" }}>
                  {photoEntries.slice(0, 2).map(e => (
                    <div key={e.id} style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "4/3", background: isMemorial ? "rgba(247,242,234,.04)" : "rgba(61,43,31,.05)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.photo_urls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <button
                onClick={() => setStep("address")}
                style={{ width: "100%", padding: ".875rem", borderRadius: 100, border: "none", background: accentColor, color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer" }}
              >
                {t.order.preview_cta}
              </button>
              <Link
                href={`/dashboard/pets/${id}`}
                style={{ display: "block", textAlign: "center", padding: ".75rem", borderRadius: 100, border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`, color: textMuted, textDecoration: "none", fontSize: ".875rem" }}
              >
                {t.order.preview_back}
              </Link>
            </div>
          </div>
        )}

        {/* ─── SUCCESS STEP ─── */}
        {step === "success" && (
          <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{isMemorial ? "🕊️" : "📬"}</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: textPrimary, marginBottom: ".75rem" }}>{t.order.success_title}</h2>
            <p style={{ fontSize: ".9rem", color: textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: ".5rem" }}>
              {t.order.success_desc}
            </p>
            <p style={{ fontSize: ".8rem", color: textMuted, fontWeight: 300, marginBottom: "2rem" }}>
              {t.order.order_id} <code style={{ background: isMemorial ? "rgba(247,242,234,.08)" : "rgba(61,43,31,.06)", padding: "2px 6px", borderRadius: 4 }}>{orderId}</code>
            </p>
            <Link href="/dashboard" style={{ background: accentColor, color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
              {t.order.back_dashboard}
            </Link>
          </div>
        )}

        {/* ─── CONFIRM STEP ─── */}
        {step === "confirm" && (
          <div style={{ background: cardBg, borderRadius: 24, padding: "2rem", border: cardBorder }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.5rem" }}>{t.order.confirm_title}</h2>

            <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "#F7F2EA", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".75rem", fontFamily: "sans-serif" }}>{t.order.shipping_to}</div>
              <p style={{ fontSize: ".9rem", color: textPrimary, lineHeight: 1.7, margin: 0 }}>
                {address.firstName} {address.lastName}<br />
                {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />
                {address.city}, {address.postCode}<br />
                {address.country}
              </p>
            </div>

            <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "#F7F2EA", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".75rem", fontFamily: "sans-serif" }}>{t.order.order_summary}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem", color: textPrimary, marginBottom: ".5rem" }}>
                <span>{isMemorial && petName ? t.memorial.order_tribute.replace("{name}", petName) : t.order.product_name}</span>
                <span style={{ fontWeight: 500 }}>{price}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem", color: textMuted }}>
                <span>{t.order.shipping}</span>
                <span>{t.order.shipping_calculated}</span>
              </div>
            </div>

            {selectedStoryIds.length < 3 && (
              <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.3)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem", fontSize: ".8rem", color: "#C8813A", lineHeight: 1.5, fontFamily: "sans-serif" }}>
                {t.order.few_stories_warning}
              </div>
            )}
            <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem", fontSize: ".8rem", color: textMuted, lineHeight: 1.5, fontFamily: "sans-serif" }}>
              {warningText}
            </div>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={() => setStep("address")} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`, background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: textMuted, cursor: "pointer" }}>
                {t.order.edit_address}
              </button>
              <button onClick={handleOrder} disabled={loading} style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: accentColor, color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: loading ? .7 : 1 }}>
                {loading ? t.order.placing : t.order.place_order}
              </button>
            </div>
          </div>
        )}

        {/* ─── ADDRESS STEP ─── */}
        {step === "address" && (
          <div style={{ background: cardBg, borderRadius: 24, padding: "2rem", border: cardBorder }}>
            <div style={{ background: isMemorial ? "rgba(200,129,58,.06)" : "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontSize: "1.5rem" }}>{isMemorial ? "🕊️" : "📖"}</span>
              <div>
                <p style={{ fontSize: ".875rem", fontWeight: 500, color: textPrimary, margin: "0 0 .2rem" }}>{productName}</p>
                <p style={{ fontSize: ".8rem", color: textMuted, margin: 0, fontWeight: 300, fontFamily: "sans-serif" }}>{productSpecs}</p>
              </div>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#C8813A", marginLeft: "auto", whiteSpace: "nowrap" }}>{price}</span>
            </div>

            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.5rem" }}>{t.order.shipping_address}</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {fields.slice(0, 2).map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{field.label}</label>
                    <input type="text" placeholder={field.placeholder} value={address[field.key as keyof typeof address]} onChange={e => setAddress({ ...address, [field.key]: e.target.value })} style={inputStyle} />
                  </div>
                ))}
              </div>
              {fields.slice(2).map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{field.label}</label>
                  <input type="text" placeholder={field.placeholder} value={address[field.key as keyof typeof address]} onChange={e => setAddress({ ...address, [field.key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{t.order.country}</label>
                <select value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} style={inputStyle}>
                  <option value="" disabled>—</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shipping + price estimate (shown once country selected) */}
            {address.country && (
              <div style={{ marginTop: "1.25rem", background: isMemorial ? "rgba(200,129,58,.06)" : "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.18)", borderRadius: 14, padding: "1rem 1.25rem" }}>
                <div style={{ fontSize: ".7rem", fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: ".75rem", fontFamily: "sans-serif" }}>
                  {t.order.price_total_est}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", color: textPrimary, marginBottom: ".375rem" }}>
                  <span>{t.order.price_book}</span>
                  <span style={{ fontWeight: 500 }}>{price}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", color: textMuted }}>
                  <span>{t.order.estimated_shipping}</span>
                  <span>{shippingEstimate ?? t.order.shipping_calculated}</span>
                </div>
              </div>
            )}

            {/* Dedication textarea (Point 7) */}
            <div style={{ marginTop: "1.5rem" }}>
              <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>
                {dedicationLabel}
              </label>
              <textarea
                value={dedicationText}
                onChange={e => setDedicationText(e.target.value)}
                maxLength={400}
                rows={4}
                placeholder={dedicationPlaceholder}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
              <div style={{ fontSize: ".7rem", color: textMuted, textAlign: "right", marginTop: ".25rem", fontFamily: "sans-serif" }}>
                {dedicationText.length}/400
              </div>
            </div>

            <button
              onClick={() => {
                if (!address.firstName || !address.lastName || !address.addressLine1 || !address.city || !address.postCode) {
                  alert(t.order.required_fields);
                  return;
                }
                setStep("confirm");
              }}
              style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: accentColor, color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer" }}
            >
              {t.order.continue_to_payment}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

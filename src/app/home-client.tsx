"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";
import { formatPrice, type Currency } from "@/lib/currency";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";
import LangSuggestBanner from "@/components/LangSuggestBanner";

const tEN = getTranslations("en");
const tFR = getTranslations("fr");

const FAQ_IDS = [
  "comment-fonctionne-ia",
  "animal-nous-quitte",
  "personnaliser-livre",
  "qualite-impression",
  "plan-gratuit",
  "annuler-abonnement",
];

export default function Home({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const isFR = locale === "fr";
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoSlide, setDemoSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDemoSlide(s => (s + 1) % 3), 5000);
    return () => clearInterval(id);
  }, []);

  // Open FAQ from URL hash on first load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const idx = FAQ_IDS.indexOf(hash);
    if (idx !== -1) {
      setOpenFaq(idx);
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, []);

  const handleFaqClick = (i: number) => {
    const isOpening = openFaq !== i;
    setOpenFaq(isOpening ? i : null);
    window.history.replaceState(null, "", isOpening ? `#${FAQ_IDS[i]}` : window.location.pathname);
  };

  const features = [
    ["📝", t.landing.f1_title, t.landing.f1_desc],
    ["✨", t.landing.f2_title, t.landing.f2_desc],
    ["📖", t.landing.f3_title, t.landing.f3_desc],
    ["🐾", t.landing.f4_title, t.landing.f4_desc],
    ["🕊️", t.landing.f5_title, t.landing.f5_desc, "/memorial"],
  ];

  const steps = [
    ["1", t.landing.s1_title, t.landing.s1_desc],
    ["2", t.landing.s2_title, t.landing.s2_desc],
    ["3", t.landing.s3_title, t.landing.s3_desc],
  ];

  // Digital = monthly, Print = annual, no toggle needed
  const [currency, setCurrency] = useState<Currency>("USD");
  const [isFrance, setIsFrance] = useState(false);
  const [digitalCtaHovered, setDigitalCtaHovered] = useState(false);

  useEffect(() => {
    fetch("/api/currency").then(r => r.json()).then(d => {
      setCurrency(d.currency as Currency);
      setIsFrance(d.isFrance ?? false);
    }).catch(() => {});
  }, []);

  const tReviews = isFrance ? tFR : tEN;
  const reviews = [
    [tReviews.landing.r1_quote, tReviews.landing.r1_author],
    [tReviews.landing.r2_quote, tReviews.landing.r2_author],
    [tReviews.landing.r3_quote, tReviews.landing.r3_author],
  ];

  const freeFeatures    = [t.landing.free_f1, t.landing.free_f2, t.landing.free_f3];
  const digitalFeatures = [t.landing.premium_f1, t.landing.premium_f2, t.landing.premium_f3, t.landing.premium_f4, t.landing.premium_f5];
  const printFeatures   = [t.landing.print_f1, t.landing.print_f2, t.landing.print_f3, t.landing.print_f4];

  const localeSwitch = isFR
    ? { href: "/", label: "English" }
    : { href: "/fr", label: "Français" };

  return (
    <>
      <PublicNav variant="full" fixed locale={locale} />

      {/* HERO */}
      <style>{`
        @keyframes ep-typing {
          from { width: 0 }
          to { width: 100% }
        }
        @keyframes ep-blink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0 }
        }
        @keyframes ep-progress {
          from { transform: scaleX(0) }
          to   { transform: scaleX(1) }
        }
        @keyframes ep-fade-up {
          from { opacity: 0; transform: translateY(10px) }
          to { opacity: 1; transform: translateY(0) }
        }
        @keyframes ep-fade-in {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @media (max-width: 860px) {
          .ep-hero-inner { flex-direction: column !important; text-align: center !important; }
          .ep-hero-text { align-items: center !important; text-align: center !important; }
          .ep-hero-demo { margin-top: 3rem; }
        }
        .ep-deco { position: absolute; pointer-events: none; user-select: none; }
        @media (max-width: 760px) {
          .ep-deco { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ep-hero-demo * {
            animation: none !important;
            transition: none !important;
          }
          .ep-hero-demo [style*="opacity: 0"] {
            opacity: 1 !important;
          }
        }
      `}</style>
      <section style={{
        minHeight: "100dvh",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "7rem 1.25rem 4rem",
        background: "radial-gradient(ellipse 90% 70% at 50% 25%, rgba(200,129,58,.18) 0%, rgba(200,129,58,.04) 45%, transparent 72%)",
        position: "relative",
      }}>
        <img src="/illustrations/yarn.svg" alt="" aria-hidden className="ep-deco" style={{ left: "4%", bottom: "6%", width: 64, transform: "rotate(-10deg)", opacity: .9 }} />
        <div className="ep-hero-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4rem", maxWidth: 1100, width: "100%", flexWrap: "wrap" }}>

          {/* LEFT, copy */}
          <div className="ep-hero-text" style={{ flex: "1 1 380px", maxWidth: 540, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: ".5rem",
              background: "rgba(200,129,58,.12)", border: "1px solid rgba(200,129,58,.25)",
              color: "#C8813A", fontSize: ".75rem", fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase",
              padding: ".35rem .9rem", borderRadius: "100px", marginBottom: "1.25rem",
            }}>{t.landing.early_access}</span>

            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: "clamp(2.6rem, 6vw, 5.25rem)",
              fontWeight: 600, lineHeight: 1.05, letterSpacing: "-.02em", textWrap: "balance",
              color: "#3D2B1F", margin: "0 0 1.25rem",
            }}>
              {t.landing.hero_title_1}<br />
              <em style={{ color: "#C8813A", fontStyle: "italic" }}>{t.landing.hero_title_em}</em>{t.landing.hero_title_2}
            </h1>

            <h2 style={{ fontSize: "1rem", fontWeight: 300, color: "#7A5C44", maxWidth: 440, lineHeight: 1.7, margin: "0 0 .5rem" }}>
              {t.landing.hero_sub}
            </h2>

            <p style={{ fontSize: "1rem", fontWeight: 300, color: "#7A5C44", maxWidth: 440, lineHeight: 1.7, margin: "0 0 2rem" }}>
              {t.landing.hero_desc}
            </p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
              <Link href="/auth/signup" style={{
                background: "#C8813A", color: "#FDFAF5",
                padding: "1rem 2.75rem", borderRadius: "100px",
                fontSize: "1.05rem", fontWeight: 600, textDecoration: "none",
                boxShadow: "0 8px 28px rgba(200,129,58,.4)",
              }}>
                {t.landing.hero_cta}
              </Link>
              <Link href="/auth/login" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none", opacity: .7, alignSelf: "center" }}>
                {t.landing.hero_signin}
              </Link>
            </div>

            <p style={{ fontSize: ".75rem", color: "#7A5C44", opacity: .6, marginTop: "1.25rem" }}>
              {t.landing.hero_note}
            </p>
          </div>

          {/* RIGHT, product demo */}
          <div className="ep-hero-demo" style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            {/* Phone frame */}
            <div style={{
              width: 280, height: 520,
              background: "#FDFAF5",
              borderRadius: 36,
              border: "8px solid #2a1d12",
              boxShadow: "0 40px 80px rgba(61,43,31,.28), 0 0 0 1px rgba(61,43,31,.08), inset 0 0 0 1px rgba(247,242,234,.5)",
              overflow: "hidden",
              position: "relative",
              userSelect: "none",
            }}>
              {/* Notch */}
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 72, height: 22, background: "#2a1d12", borderRadius: "0 0 14px 14px", zIndex: 10 }} />

              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Status bar */}
                <div style={{ height: 30, background: "#F7F2EA", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px 5px" }}>
                  <span style={{ fontSize: 10, color: "#3D2B1F", fontWeight: 600 }}>9:41</span>
                  <span style={{ fontSize: 9, color: "#3D2B1F", letterSpacing: 1 }}>●●●</span>
                </div>

                {/* App nav bar */}
                <div style={{ background: "#F7F2EA", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "7px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 12.5, fontWeight: 600, color: "#3D2B1F", lineHeight: 1 }}>
                      {demoSlide === 0
                        ? "Max · Journal"
                        : demoSlide === 1
                          ? (isFR ? "Max · Histoire IA" : "Max · AI Story")
                          : (isFR ? "Max · Livre 2025" : "Max · Book 2025")}
                    </div>
                    <div style={{ fontSize: 9, color: "#7A5C44", marginTop: 2, fontWeight: 300 }}>
                      {isFR ? "Golden Retriever · 2 ans" : "Golden Retriever · 2 yrs"}
                    </div>
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#C8813A,#5C3A1E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🐾</div>
                </div>

                {/* Slide area */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#F7F2EA" }}>

                  {/* Slide 0, Journal */}
                  <div style={{ position: "absolute", inset: 0, opacity: demoSlide === 0 ? 1 : 0, transition: "opacity .5s ease", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {(isFR
                      ? [
                          { icon: "🚶", text: "Promenade au parc, 2h de course !", when: "il y a 2 jours" },
                          { icon: "🍽️", text: "A refusé ses croquettes... encore.", when: "hier" },
                        ]
                      : [
                          { icon: "🚶", text: "Walk at the park, 2h run!", when: "2 days ago" },
                          { icon: "🍽️", text: "Refused kibble... again.", when: "yesterday" },
                        ]
                    ).map((e, i) => (
                      <div key={i} style={{ background: "#FDFAF5", borderRadius: 12, padding: "9px 11px", border: "1px solid rgba(61,43,31,.07)", animation: demoSlide === 0 ? `ep-fade-up .4s ease ${i * .12}s both` : "none" }}>
                        <div style={{ fontSize: 10.5, color: "#3D2B1F", display: "flex", gap: 6, alignItems: "flex-start" }}>
                          <span style={{ flexShrink: 0 }}>{e.icon}</span>
                          <span style={{ lineHeight: 1.4 }}>{e.text}</span>
                        </div>
                        <div style={{ fontSize: 9, color: "#7A5C44", marginTop: 4, opacity: .55 }}>{e.when}</div>
                      </div>
                    ))}

                    {/* Typing entry */}
                    {demoSlide === 0 && (
                      <div style={{ background: "#FDFAF5", borderRadius: 12, padding: "9px 11px", border: "1.5px solid rgba(200,129,58,.45)", animation: "ep-fade-up .4s ease .25s both" }}>
                        <div style={{ fontSize: 10, color: "#7A5C44", fontWeight: 300, marginBottom: 4 }}>
                          {isFR ? "Aujourd'hui" : "Today"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: 10.5, color: "#3D2B1F", overflow: "hidden", whiteSpace: "nowrap", display: "inline-block", animation: "ep-typing 2.2s steps(30, end) .8s both" }}>
                            {isFR ? "Premier bain, pas content ! 🛁" : "First bath, not happy! 🛁"}
                          </span>
                          <span style={{ width: 1.5, height: 12, background: "#C8813A", display: "inline-block", animation: "ep-blink 1s step-end infinite", marginLeft: 1, flexShrink: 0 }} />
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: "auto", background: "#C8813A", borderRadius: 100, padding: "8px 0", textAlign: "center", animation: demoSlide === 0 ? "ep-fade-up .4s ease .4s both" : "none" }}>
                      <span style={{ fontSize: 11, color: "#FDFAF5", fontWeight: 500 }}>
                        {isFR ? "+ Ajouter un moment" : "+ Add a moment"}
                      </span>
                    </div>
                  </div>

                  {/* Slide 1, AI story generation */}
                  <div style={{ position: "absolute", inset: 0, opacity: demoSlide === 1 ? 1 : 0, transition: "opacity .5s ease", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ animation: demoSlide === 1 ? "ep-fade-up .4s ease both" : "none" }}>
                      <div style={{ fontSize: 11, color: "#C8813A", fontWeight: 500, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>✨</span> {isFR ? "Génération en cours..." : "Generating story..."}
                      </div>
                      <div style={{ background: "rgba(200,129,58,.15)", borderRadius: 100, height: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "linear-gradient(90deg,#C8813A,#F7C27A)", borderRadius: 100, transformOrigin: "left", animation: demoSlide === 1 ? "ep-progress 2.8s ease .3s both" : "none", transform: demoSlide === 1 ? undefined : "scaleX(0)" }} />
                      </div>
                    </div>

                    <div style={{ flex: 1, background: "#FDFAF5", borderRadius: 14, padding: 12, border: "1px solid rgba(61,43,31,.07)", animation: demoSlide === 1 ? "ep-fade-in .6s ease 2s both" : "none", opacity: 0 }}>
                      <div style={{ fontSize: 9, color: "#C8813A", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
                        {isFR ? "Chapitre 3 · Novembre 2025" : "Chapter 3 · November 2025"}
                      </div>
                      {isFR ? (
                        <>
                          <p style={{ fontFamily: "Georgia, serif", fontSize: 10.5, color: "#3D2B1F", lineHeight: 1.75, fontStyle: "italic", margin: 0 }}>
                            « Ce mois a été particulièrement magique. Ma première promenade dans les feuilles d'automne, le museau plongé dans chaque nouvelle odeur...
                          </p>
                          <p style={{ fontFamily: "Georgia, serif", fontSize: 10.5, color: "#3D2B1F", lineHeight: 1.75, fontStyle: "italic", margin: "8px 0 0", opacity: .75 }}>
                            Et ce fameux bain dont je n'avais absolument pas besoin, selon moi. »
                          </p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontFamily: "Georgia, serif", fontSize: 10.5, color: "#3D2B1F", lineHeight: 1.75, fontStyle: "italic", margin: 0 }}>
                            "This month was particularly magical. My first walk through the autumn leaves, nose buried in every new scent...
                          </p>
                          <p style={{ fontFamily: "Georgia, serif", fontSize: 10.5, color: "#3D2B1F", lineHeight: 1.75, fontStyle: "italic", margin: "8px 0 0", opacity: .75 }}>
                            And that infamous bath I absolutely didn't need, according to me."
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Slide 2, Book preview */}
                  <div style={{ position: "absolute", inset: 0, opacity: demoSlide === 2 ? 1 : 0, transition: "opacity .5s ease", padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    <div style={{
                      width: 120, height: 160,
                      background: "linear-gradient(135deg, #5C3A1E 0%, #3D2B1F 100%)",
                      borderRadius: "3px 10px 10px 3px",
                      boxShadow: "-4px 0 0 rgba(0,0,0,.3), 6px 14px 40px rgba(61,43,31,.4)",
                      position: "relative", overflow: "hidden",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 14,
                      animation: demoSlide === 2 ? "ep-fade-up .5s ease both" : "none",
                      flexShrink: 0,
                    }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 9, background: "rgba(0,0,0,.3)" }} />
                      <div style={{ fontSize: 22, marginBottom: 6 }}>🐾</div>
                      <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 9, color: "#F7C27A", textAlign: "center", lineHeight: 1.4 }}>La Vie de Max<br />2023 – 2025</div>
                      <div style={{ fontSize: 7, color: "rgba(247,242,234,.35)", marginTop: 5, letterSpacing: ".08em", textTransform: "uppercase" }}>Everypaw</div>
                    </div>

                    <div style={{ textAlign: "center", animation: demoSlide === 2 ? "ep-fade-up .5s ease .15s both" : "none" }}>
                      <div style={{ fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 600, color: "#3D2B1F", marginBottom: 3 }}>
                        {isFR ? "Aperçu de votre livre" : "Your book preview"}
                      </div>
                      <div style={{ fontSize: 9.5, color: "#7A5C44", fontWeight: 300 }}>
                        {isFR ? "Imprimé et livré chaque année" : "Printed & shipped each year"}
                      </div>
                    </div>

                    <div style={{ background: "rgba(200,129,58,.1)", border: "1px solid rgba(200,129,58,.3)", borderRadius: 100, padding: "7px 16px", animation: demoSlide === 2 ? "ep-fade-up .5s ease .3s both" : "none" }}>
                      <span style={{ fontSize: 10.5, color: "#C8813A", fontWeight: 500 }}>
                        {isFR ? "📖 Inclus avec Premium" : "📖 Included with Premium"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dots */}
                <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "#F7F2EA", borderTop: "1px solid rgba(61,43,31,.06)", flexShrink: 0 }}>
                  {[0, 1, 2].map(i => (
                    <button key={i} onClick={() => setDemoSlide(i)} style={{ width: i === demoSlide ? 18 : 6, height: 6, borderRadius: 3, background: i === demoSlide ? "#C8813A" : "rgba(61,43,31,.18)", transition: "all .3s", border: "none", padding: 0, cursor: "pointer" }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Label below phone */}
            <p style={{ fontSize: ".72rem", color: "#7A5C44", opacity: .5, fontWeight: 300, textAlign: "center", margin: 0 }}>
              {demoSlide === 0
                ? (isFR ? "📝 Journal de vie" : "📝 Life journal")
                : demoSlide === 1
                  ? (isFR ? "✨ Histoire générée par l'IA" : "✨ AI-generated story")
                  : (isFR ? "📖 Aperçu du livre annuel" : "📖 Annual book preview")}
            </p>
          </div>

        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ padding: "4rem 2rem", textAlign: "center", background: "#EDE5D4" }}>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1rem" }}>
          {[
            { num: isFrance ? "20,3M" : "94M", lbl: isFrance ? tFR.landing.stats_pets : tEN.landing.stats_pets, src: isFrance ? "FACCO / Kantar, 2023" : "APPA NPOS, 2023–24" },
            { num: "69%", lbl: t.landing.stats_millennials, src: isFrance ? "FACCO / Kantar, 2023" : "APPA NPOS, 2023–24" },
            { num: "12", lbl: t.landing.stats_memories, src: isFrance ? "FACCO / Kantar, 2023" : "APPA NPOS, 2023–24" },
          ].map(({ num, lbl, src }) => (
            <div key={num} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", margin: "0 1.25rem", minWidth: 0 }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "3rem", fontWeight: 600, color: "#C8813A" }}>{num}</span>
              <span style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginTop: ".25rem", textAlign: "center", maxWidth: 160, lineHeight: 1.4 }}>{lbl}</span>
              <span style={{ fontSize: ".65rem", color: "#9A8070", fontWeight: 300, marginTop: ".25rem" }}>{src}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "6rem 2rem", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative" }}>
          <img src="/illustrations/pencil.svg" alt="" aria-hidden className="ep-deco" style={{ right: 0, top: -14, width: 64, transform: "rotate(8deg)" }} />
          <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.landing.features_tag}</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, lineHeight: 1.15, marginBottom: "3.5rem", maxWidth: 560 }}>
            {t.landing.features_title_1}<br />{t.landing.features_title_2}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {features.map(([icon, title, desc, href]) => {
              const cardStyle = { background: "#F7F2EA", borderRadius: 20, padding: "1.75rem" };
              const inner = (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", marginBottom: "1rem" }}>{icon}</div>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: ".5rem" }}>{title}</h3>
                  <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
                </>
              );
              return href ? (
                <Link key={title as string} href={href as string} aria-label={`${title}, pet memorial page and memorial book`} style={{ ...cardStyle, display: "block", color: "inherit", textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={title as string} style={cardStyle}>{inner}</div>
              );
            })}
            {/* Gift card, standalone with CTA */}
            <div style={{ background: "#F7F2EA", borderRadius: 20, padding: "1.75rem", display: "flex", flexDirection: "column" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", marginBottom: "1rem" }}>🎁</div>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: ".5rem" }}>{t.landing.f6_title}</h3>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, fontWeight: 300, flex: 1 }}>{t.landing.f6_desc}</p>
              <Link href="/gift" style={{ display: "block", marginTop: "1.25rem", padding: ".75rem 1.75rem", borderRadius: "100px", background: "#C8813A", color: "#FDFAF5", fontSize: ".875rem", fontWeight: 500, textDecoration: "none", textAlign: "center", boxShadow: "0 4px 20px rgba(200,129,58,.35)" }}>
                {t.landing.f6_cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "6rem 2rem", background: "#3D2B1F", color: "#F7F2EA" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <img src="/illustrations/star.svg" alt="" aria-hidden className="ep-deco" style={{ right: 8, top: -24, width: 48 }} />
          <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#E8A96A", marginBottom: "1rem" }}>{t.landing.how_tag}</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: "3.5rem", color: "#F7F2EA" }}>
            {t.landing.how_title_1}<br />{t.landing.how_title_2}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
            {steps.map(([num, title, desc]) => (
              <div key={num} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", border: "1.5px solid rgba(200,129,58,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontSize: "1.25rem", color: "#C8813A", marginBottom: "1.25rem" }}>{num}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 500, marginBottom: ".5rem", color: "#F7F2EA" }}>{title}</h3>
                <p style={{ fontSize: ".85rem", color: "rgba(247,242,234,.6)", lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "6rem 2rem", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <img src="/illustrations/heart.svg" alt="" aria-hidden style={{ width: 42, display: "block", margin: "0 auto 1rem" }} />
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.75rem)", fontWeight: 600, marginBottom: "3rem", textAlign: "center" }}>
            {t.landing.reviews_title}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {reviews.map(([quote, author]) => {
              const authorStr = author as string;
              const parts = authorStr.split(", ");
              const name = parts[0];
              const meta = parts.slice(1).join(", ");
              return (
                <div key={authorStr} style={{ background: "#F7F2EA", borderRadius: 18, padding: "1.5rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  <div style={{ color: "#C8813A", fontSize: "1rem", letterSpacing: ".1em" }}>★★★★★</div>
                  <p style={{ fontSize: ".875rem", fontStyle: "italic", lineHeight: 1.65, color: "#3D2B1F", fontFamily: "Georgia, serif", flex: 1 }}>&ldquo;{quote}&rdquo;</p>
                  <div>
                    <p style={{ fontSize: ".8rem", color: "#3D2B1F", fontWeight: 600, margin: 0 }}>{name}</p>
                    {meta && <p style={{ fontSize: ".72rem", color: "#7A5C44", fontWeight: 400, margin: ".2rem 0 0", lineHeight: 1.4 }}>{meta}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOOK VISUAL */}
      <section style={{ padding: "5rem 2rem", background: "#EDE5D4" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "center" }}>

          {/* Left: specs */}
          <div>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>
              {isFR ? "Un vrai objet" : "A real object"}
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, lineHeight: 1.2, color: "#3D2B1F", marginBottom: "1.5rem" }}>
              {t.landing.book_h2_1}<br />{t.landing.book_h2_2}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
              {(isFR ? [
                ["📄", "Papier 170 g/m²", "Couché satiné, couleurs éclatantes"],
                ["📖", "Couverture rigide", "Dos carré collé, mat plastifié"],
                ["📐", "Format 20 × 20 cm", "Carré, adapté aux photos"],
                ["🎨", "5 thèmes de couverture", "Classique, Noir, Forêt, Océan, Rose"],
              ] : [
                ["📄", "170 gsm silk paper", "Coated, vivid print quality"],
                ["📖", "Rigid hardcover", "Perfect-bound, matt laminated"],
                ["📐", "20 × 20 cm format", "Square, photo-friendly"],
                ["🎨", "5 cover themes", "Classic, Noir, Forest, Ocean, Rose"],
              ]).map(([icon, title, sub]) => (
                <div key={title} style={{ background: "rgba(255,255,255,.5)", borderRadius: 14, padding: ".875rem 1rem" }}>
                  <div style={{ fontSize: "1.2rem", marginBottom: ".35rem" }}>{icon}</div>
                  <div style={{ fontSize: ".8rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".15rem" }}>{title}</div>
                  <div style={{ fontSize: ".72rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3D book mockup */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem 0" }}>
            <div style={{ perspective: 800, perspectiveOrigin: "50% 50%" }}>
              <div style={{ position: "relative", width: 180, height: 240, transformStyle: "preserve-3d", transform: "rotateY(-20deg) rotateX(4deg)", filter: "drop-shadow(16px 24px 40px rgba(61,43,31,.35))" }}>
                {/* Front cover */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #5C3A1E 0%, #3D2B1F 100%)", borderRadius: "3px 12px 12px 3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", gap: ".75rem" }}>
                  <div style={{ fontSize: "2.5rem" }}>🐾</div>
                  <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "0.95rem", color: "#F7C27A", textAlign: "center", lineHeight: 1.4 }}>
                    {isFR ? "La vie de Biscuit" : "Biscuit's Life"}
                    <div style={{ fontSize: ".65rem", color: "rgba(247,194,122,.6)", marginTop: ".35rem", letterSpacing: ".08em", fontStyle: "normal", textTransform: "uppercase" }}>2023, 2026</div>
                  </div>
                  <div style={{ fontSize: ".55rem", color: "rgba(247,242,234,.3)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: ".5rem" }}>Everypaw</div>
                </div>
                {/* Spine */}
                <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 18, background: "linear-gradient(to right, rgba(0,0,0,.45), rgba(0,0,0,.2))", borderRadius: "3px 0 0 3px", transform: "rotateY(90deg) translateZ(-9px) translateX(-9px)" }} />
                {/* Pages */}
                <div style={{ position: "absolute", top: 2, right: -10, bottom: 2, width: 12, background: "repeating-linear-gradient(to bottom, #F0EBE3, #F0EBE3 1px, #E8E0D5 1px, #E8E0D5 2px)", borderRadius: "0 2px 2px 0", transform: "rotateY(-90deg) translateZ(169px)" }} />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "6rem 2rem", background: "#F7F2EA", textAlign: "center" }}>
        <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.landing.pricing_tag}</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: ".75rem" }}>
          {t.landing.pricing_title}
        </h2>
        <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, marginBottom: ".75rem" }}>{t.landing.pricing_desc}</p>
        <img src="/illustrations/squiggle.svg" alt="" aria-hidden style={{ width: 170, display: "block", margin: "0 auto 2.25rem", opacity: .9 }} />

        {/* Digital = monthly, Print = annual, no toggle needed */}

        <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", flexWrap: "wrap", maxWidth: 960, margin: "0 auto" }}>

          {/* Free */}
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem 2rem", flex: 1, minWidth: 240, maxWidth: 300, textAlign: "left", border: "1.5px solid rgba(61,43,31,.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#7A5C44", marginBottom: ".75rem" }}>{t.landing.free_label}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem" }}>{t.landing.free_price}</div>
            <div style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginBottom: "1.5rem" }}>{t.landing.free_period}</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0, flex: 1 }}>
              {freeFeatures.map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "flex-start", gap: ".5rem", fontWeight: 300 }}>
                  <span style={{ color: "#C8813A", fontWeight: 600, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: ".72rem", color: "#9A8070", margin: "0 0 .75rem", lineHeight: 1.6, fontWeight: 300 }}>
              {isFR
                ? "Au-delà de 10 entrées, un message d'upgrade s'affiche. Après votre 1ère histoire IA, un upgrade est nécessaire pour continuer."
                : "Beyond 10 entries, an upgrade prompt appears. After your 1st AI story, an upgrade is needed to generate more."}
            </p>
            <Link href="/auth/signup" style={{ display: "block", width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, border: "1.5px solid rgba(61,43,31,.55)", background: "transparent", color: "#3D2B1F", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t.landing.free_cta}
            </Link>
          </div>

          {/* Digital */}
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem 2rem", flex: 1, minWidth: 240, maxWidth: 300, textAlign: "left", border: "1.5px solid rgba(200,129,58,.25)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#C8813A", marginBottom: ".75rem" }}>{t.landing.premium_label}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem" }}>
              {formatPrice(currency, "digital")}
            </div>
            <div style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginBottom: "1.5rem" }}>
              {t.landing.premium_period}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0, flex: 1 }}>
              {digitalFeatures.map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "flex-start", gap: ".5rem", fontWeight: 300 }}>
                  <span style={{ color: "#C8813A", fontWeight: 600, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup?plan=digital"
              onMouseEnter={() => setDigitalCtaHovered(true)}
              onMouseLeave={() => setDigitalCtaHovered(false)}
              style={{ display: "block", width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 600, background: digitalCtaHovered ? "#B5712E" : "#C8813A", border: "1.5px solid #C8813A", color: "#FDFAF5", textAlign: "center", textDecoration: "none", boxSizing: "border-box", transition: "background .15s" }}
            >
              {t.landing.premium_cta}
            </Link>
          </div>

          {/* Print */}
          <div style={{ background: "#3D2B1F", borderRadius: 24, padding: "2rem 2rem", flex: 1, minWidth: 240, maxWidth: 300, textAlign: "left", border: "1.5px solid #3D2B1F", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#C8813A", color: "#FDFAF5", fontSize: ".68rem", fontWeight: 700, padding: ".3rem .85rem", borderRadius: 100, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
              {t.landing.print_badge}
            </div>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#E8A96A", marginBottom: ".75rem" }}>{t.landing.print_label}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem", color: "#F7F2EA" }}>
              {formatPrice(currency, "printAnnual")}
            </div>
            <div style={{ fontSize: ".8rem", color: "rgba(247,242,234,.6)", fontWeight: 300, marginBottom: "1.5rem" }}>
              {isFR ? "par an · livre relié inclus" : "per year · hardcover book included"}
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0, flex: 1 }}>
              {printFeatures.map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "flex-start", gap: ".5rem", fontWeight: 300, color: "rgba(247,242,234,.85)" }}>
                  <span style={{ color: "#C8813A", fontWeight: 600, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup?plan=print_annual" style={{ display: "block", width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 600, background: "#C8813A", border: "1.5px solid #C8813A", color: "#FDFAF5", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t.landing.print_cta}
            </Link>
          </div>

        </div>

      </section>

      {/* CTA */}
      <section style={{ padding: "7rem 2rem", background: "linear-gradient(135deg, #3D2B1F 0%, #5C3A1E 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(200,129,58,.2) 0%, transparent 70%)" }} />
        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", fontWeight: 600, color: "#F7F2EA", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            {t.landing.cta_title_1} <em style={{ color: "#E8A96A", fontStyle: "italic" }}>{t.landing.cta_title_em}</em><br />{t.landing.cta_title_2}
          </h2>
          <p style={{ fontSize: "1rem", color: "rgba(247,242,234,.65)", fontWeight: 300, marginBottom: "2.5rem" }}>
            {t.landing.cta_desc}
          </p>
          <Link href="/auth/signup" style={{
            display: "inline-block",
            background: "#C8813A", color: "#FDFAF5",
            padding: ".875rem 2.5rem", borderRadius: "100px",
            fontSize: "1rem", fontWeight: 500, textDecoration: "none",
            boxShadow: "0 4px 24px rgba(200,129,58,.4)",
          }}>
            {t.landing.cta_button}
          </Link>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/auth/login" style={{ fontSize: ".8rem", color: "rgba(247,242,234,.45)", textDecoration: "none" }}>
              {t.landing.hero_signin}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "6rem 2rem", background: "#F7F2EA" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
        <img src="/illustrations/bubble.svg" alt="" aria-hidden className="ep-deco" style={{ right: -8, top: -22, width: 54, transform: "rotate(4deg)" }} />
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 3vw, 2.25rem)", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>
            {t.faq.title}
          </h2>
        </div>

        {([
          [t.faq.q1, t.faq.a1],
          [t.faq.q2, t.faq.a2],
          [t.faq.q3, t.faq.a3],
          [t.faq.q4, t.faq.a4],
          [t.faq.q5, t.faq.a5],
          [t.faq.q6, t.faq.a6],
        ] as [string, string][]).map(([q, a], i) => (
          <div
            key={i}
            id={FAQ_IDS[i]}
            style={{ borderTop: i === 0 ? "1px solid rgba(61,43,31,.12)" : "none", borderBottom: "1px solid rgba(61,43,31,.12)" }}
          >
            <button
              onClick={() => handleFaqClick(i)}
              aria-expanded={openFaq === i}
              aria-controls={`faq-answer-${FAQ_IDS[i]}`}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "1.25rem 0", background: "none", border: "none", cursor: "pointer",
                textAlign: "left", gap: "1rem",
              }}
            >
              <span style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 500, color: "#3D2B1F", lineHeight: 1.4 }}>
                {q}
              </span>
              <span aria-hidden="true" style={{ fontSize: "1.1rem", color: "#C8813A", flexShrink: 0, transition: "transform .2s", transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)" }}>
                +
              </span>
            </button>
            <div
              id={`faq-answer-${FAQ_IDS[i]}`}
              role="region"
              aria-labelledby={FAQ_IDS[i]}
              style={{
                display: "grid",
                gridTemplateRows: openFaq === i ? "1fr" : "0fr",
                transition: "grid-template-rows .28s ease",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, paddingBottom: "1.25rem", margin: 0, fontWeight: 300 }}>
                  {a}
                </p>
              </div>
            </div>
          </div>
        ))}
        </div>
      </section>

      <PublicFooter variant="full" locale={locale} localeSwitch={localeSwitch} />
      <LangSuggestBanner pageLocale={locale} altHref={localeSwitch.href} />
    </>
  );
}

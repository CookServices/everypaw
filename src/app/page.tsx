"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

export default function Home() {
  const { t } = useLocale();

  const features = [
    ["📝", t.landing.f1_title, t.landing.f1_desc],
    ["✨", t.landing.f2_title, t.landing.f2_desc],
    ["📖", t.landing.f3_title, t.landing.f3_desc],
    ["🐾", t.landing.f4_title, t.landing.f4_desc],
    ["🕊️", t.landing.f5_title, t.landing.f5_desc],
    ["🎁", t.landing.f6_title, t.landing.f6_desc],
  ];

  const steps = [
    ["1", t.landing.s1_title, t.landing.s1_desc],
    ["2", t.landing.s2_title, t.landing.s2_desc],
    ["3", t.landing.s3_title, t.landing.s3_desc],
  ];

  const reviews = [
    [t.landing.r1_quote, t.landing.r1_author],
    [t.landing.r2_quote, t.landing.r2_author],
    [t.landing.r3_quote, t.landing.r3_author],
  ];

  const freeFeatures = [
    t.landing.free_f1,
    t.landing.free_f2,
    t.landing.free_f3,
    t.landing.free_f4,
  ];

  const premiumFeatures = [
    t.landing.premium_f1,
    t.landing.premium_f2,
    t.landing.premium_f3,
    t.landing.premium_f4,
    t.landing.premium_f5,
  ];

  return (
    <>
      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 3rem",
        background: "rgba(247,242,234,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(61,43,31,.08)",
      }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <Link href="/gift" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
            {t.nav.give_gift}
          </Link>
          <Link href="/auth/login" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
            {t.nav.sign_in}
          </Link>
          <Link href="/auth/signup" style={{
            background: "#3D2B1F", color: "#F7F2EA",
            padding: ".5rem 1.25rem", borderRadius: "100px",
            fontSize: ".875rem", fontWeight: 500, textDecoration: "none",
          }}>
            {t.nav.get_started}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "8rem 2rem 5rem", textAlign: "center",
        background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(200,129,58,.12) 0%, transparent 70%)",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: ".5rem",
          background: "rgba(200,129,58,.12)", border: "1px solid rgba(200,129,58,.25)",
          color: "#C8813A", fontSize: ".75rem", fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase",
          padding: ".35rem .9rem", borderRadius: "100px", marginBottom: "2rem",
        }}>{t.landing.early_access}</span>

        <h1 style={{
          fontFamily: "Georgia, serif", fontSize: "clamp(2.8rem, 6vw, 5rem)",
          fontWeight: 600, lineHeight: 1.08, color: "#3D2B1F", maxWidth: 820,
          margin: "0 0 1.75rem",
        }}>
          {t.landing.hero_title_1}<br />
          <em style={{ color: "#C8813A", fontStyle: "italic" }}>{t.landing.hero_title_em}</em> {t.landing.hero_title_2}
        </h1>

        <p style={{ fontSize: "1.125rem", fontWeight: 300, color: "#7A5C44", maxWidth: 480, lineHeight: 1.7, margin: "0 auto 2.5rem" }}>
          {t.landing.hero_desc}
        </p>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <Link href="/auth/signup" style={{
            background: "#C8813A", color: "#FDFAF5",
            padding: ".875rem 2.25rem", borderRadius: "100px",
            fontSize: "1rem", fontWeight: 500, textDecoration: "none",
            boxShadow: "0 4px 20px rgba(200,129,58,.35)",
          }}>
            {t.landing.hero_cta}
          </Link>
          <Link href="/auth/login" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none", opacity: .7 }}>
            {t.landing.hero_signin}
          </Link>
        </div>

        <p style={{ fontSize: ".75rem", color: "#7A5C44", opacity: .6, marginTop: "1.25rem" }}>
          {t.landing.hero_note}
        </p>

        {/* Book mock */}
        <div style={{ marginTop: "4rem", position: "relative", display: "inline-block" }}>
          <div style={{
            width: 260, height: 340,
            background: "linear-gradient(135deg, #5C3A1E 0%, #3D2B1F 100%)",
            borderRadius: "4px 16px 16px 4px",
            boxShadow: "-6px 0 0 rgba(0,0,0,.25), 8px 20px 60px rgba(61,43,31,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 16, background: "rgba(0,0,0,.3)" }} />
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: ".75rem" }}>🐾</div>
              <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "1.1rem", color: "#F7C27A", lineHeight: 1.3, marginBottom: ".5rem" }}>
                The Life of Luna<br />2022 – 2025
              </div>
              <div style={{ fontSize: ".7rem", color: "rgba(247,242,234,.5)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                {t.landing.book_label}
              </div>
            </div>
            <div style={{
              position: "absolute", top: -12, right: -12,
              width: 64, height: 64, borderRadius: "50%",
              background: "#C8813A", color: "#FDFAF5",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              fontSize: ".6rem", fontWeight: 500, textAlign: "center", lineHeight: 1.2,
              transform: "rotate(12deg)",
            }}>{t.landing.printed_hardcover}</div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ padding: "4rem 2rem", textAlign: "center", background: "#EDE5D4" }}>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1rem" }}>
          {[
            ["94M", t.landing.stats_pets],
            ["69%", t.landing.stats_millennials],
            ["12", t.landing.stats_memories],
          ].map(([num, lbl]) => (
            <div key={num} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", margin: "0 2rem" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: "3rem", fontWeight: 600, color: "#C8813A" }}>{num}</span>
              <span style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginTop: ".25rem" }}>{lbl}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "6rem 2rem", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.landing.features_tag}</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, lineHeight: 1.15, marginBottom: "3.5rem", maxWidth: 560 }}>
            {t.landing.features_title_1}<br />{t.landing.features_title_2}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {features.map(([icon, title, desc]) => (
              <div key={title as string} style={{ background: "#F7F2EA", borderRadius: 20, padding: "1.75rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", marginBottom: "1rem" }}>{icon}</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: ".5rem" }}>{title}</h3>
                <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "6rem 2rem", background: "#3D2B1F", color: "#F7F2EA" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
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
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 3.5vw, 2.75rem)", fontWeight: 600, marginBottom: "3rem", textAlign: "center" }}>
            {t.landing.reviews_title}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {reviews.map(([quote, author]) => (
              <div key={author as string} style={{ background: "#F7F2EA", borderRadius: 18, padding: "1.5rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <div style={{ color: "#C8813A", fontSize: "1rem", letterSpacing: ".1em" }}>★★★★★</div>
                <p style={{ fontSize: ".875rem", fontStyle: "italic", lineHeight: 1.65, color: "#3D2B1F", fontFamily: "Georgia, serif", flex: 1 }}>&ldquo;{quote}&rdquo;</p>
                <p style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 500 }}>{author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "6rem 2rem", background: "#F7F2EA", textAlign: "center" }}>
        <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#C8813A", marginBottom: "1rem" }}>{t.landing.pricing_tag}</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: ".75rem" }}>
          {t.landing.pricing_title}
        </h2>
        <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, marginBottom: "3rem" }}>{t.landing.pricing_desc}</p>
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", maxWidth: 720, margin: "0 auto" }}>

          {/* Free */}
          <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem 2.25rem", flex: 1, minWidth: 260, textAlign: "left", border: "1.5px solid rgba(61,43,31,.08)" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#C8813A", marginBottom: ".75rem" }}>{t.landing.free_label}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem" }}>{t.landing.free_price}</div>
            <div style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginBottom: "1.5rem" }}>{t.landing.free_period}</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0 }}>
              {freeFeatures.map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 300 }}>
                  <span style={{ color: "#C8813A", fontWeight: 600 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" style={{ display: "block", width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", border: "1.5px solid #3D2B1F", background: "transparent", color: "#3D2B1F", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t.landing.free_cta}
            </Link>
          </div>

          {/* Premium */}
          <div style={{ background: "#3D2B1F", borderRadius: 24, padding: "2rem 2.25rem", flex: 1, minWidth: 260, textAlign: "left", border: "1.5px solid #3D2B1F" }}>
            <div style={{ fontSize: ".7rem", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#E8A96A", marginBottom: ".75rem" }}>✦ Premium</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "2.5rem", fontWeight: 600, lineHeight: 1, marginBottom: ".25rem", color: "#F7F2EA" }}>{t.landing.premium_price}</div>
            <div style={{ fontSize: ".8rem", color: "rgba(247,242,234,.6)", fontWeight: 300, marginBottom: "1.5rem" }}>{t.landing.premium_period}</div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.75rem", padding: 0 }}>
              {premiumFeatures.map(f => (
                <li key={f} style={{ fontSize: ".875rem", display: "flex", alignItems: "center", gap: ".5rem", fontWeight: 300, color: "rgba(247,242,234,.85)" }}>
                  <span style={{ color: "#C8813A", fontWeight: 600 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup?plan=premium" style={{ display: "block", width: "100%", padding: ".75rem", borderRadius: "100px", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", background: "#C8813A", border: "1.5px solid #C8813A", color: "#FDFAF5", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
              {t.landing.premium_cta}
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

      {/* FOOTER */}
      <footer style={{ padding: "2rem 3rem", background: "#3D2B1F", borderTop: "1px solid rgba(247,242,234,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1rem", color: "rgba(247,242,234,.6)", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(247,242,234,.3)", display: "inline-block" }} />
          Everypaw
        </span>
        <p style={{ fontSize: ".75rem", color: "rgba(247,242,234,.3)" }}>{t.landing.footer_copy}</p>
      </footer>
    </>
  );
}

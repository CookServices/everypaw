"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

export default function UpgradePage() {
  const { t } = useLocale();

  const features = [
    t.landing.premium_f1,
    t.landing.premium_f2,
    t.landing.premium_f3,
    t.landing.premium_f4,
    t.landing.premium_f5,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/dashboard" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>{t.dashboard.back_pet}</Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F" }}>{t.dashboard.upgrade_title}</span>
      </nav>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>

        <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>✦</div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".75rem", lineHeight: 1.2 }}>
          {t.dashboard.upgrade_title}
        </h1>

        <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.7, marginBottom: "2.5rem" }}>
          {t.dashboard.upgrade_desc}
        </p>

        {/* Feature list */}
        <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.75rem", border: "1px solid rgba(61,43,31,.08)", marginBottom: "2rem", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem", marginBottom: "1.5rem" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "2.25rem", fontWeight: 600, color: "#3D2B1F" }}>{t.landing.premium_price}</span>
            <span style={{ fontSize: ".85rem", color: "#7A5C44", fontWeight: 300 }}>{t.landing.premium_period}</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {features.map(f => (
              <li key={f} style={{ fontSize: ".9rem", color: "#3D2B1F", display: "flex", alignItems: "center", gap: ".6rem", fontWeight: 300 }}>
                <span style={{ color: "#C8813A", fontWeight: 600, flexShrink: 0 }}>✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div style={{ background: "rgba(200,129,58,.06)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: ".75rem" }}>
          <p style={{ fontSize: ".85rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>
            {t.landing.pricing_desc}
          </p>
          <button disabled style={{ background: "#C8813A", color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".9rem", fontWeight: 500, border: "none", opacity: .5, cursor: "not-allowed", fontFamily: "inherit" }}>
            Bientôt disponible
          </button>
        </div>

      </main>
    </div>
  );
}

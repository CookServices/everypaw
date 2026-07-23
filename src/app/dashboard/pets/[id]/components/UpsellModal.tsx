"use client";

import Link from "next/link";
import { Translations } from "./types";

export default function UpsellModal({ t, petName, onClose }: { t: Translations; petName: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--ep-bg-card)", borderRadius: 24, padding: "2rem", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "var(--ep-text)", margin: "0 0 .75rem" }}>
          {t.dashboard.upsell_title}
        </h2>
        <p style={{ fontSize: ".875rem", color: "var(--ep-text-muted)", fontWeight: 300, lineHeight: 1.65, margin: "0 0 1.75rem" }}>
          {t.dashboard.upsell_desc.replace("{name}", petName)}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          <Link href="/dashboard/upgrade" style={{ display: "block", padding: ".75rem 1.5rem", borderRadius: 100, background: "var(--ep-brand)", color: "var(--ep-bg-card)", textDecoration: "none", fontSize: ".875rem", fontWeight: 500 }}>
            {t.dashboard.upsell_cta}
          </Link>
          <button onClick={onClose} style={{ padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "var(--ep-text-muted)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer" }}>
            {t.dashboard.upsell_later}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

export default function UpgradePage() {
  const { t } = useLocale();
  const [petName, setPetName] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pets")
      .select("name")
      .order("created_at", { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.name) setPetName(data.name);
      });
  }, []);

  const handleSubscribe = async () => {
    setLoadingCheckout(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoadingCheckout(false);
    }
  };

  const subtitle = petName
    ? t.upgrade.subtitle.replace("{name}", petName)
    : t.upgrade.subtitle_generic;

  const tableRows: { label: string; free: string; premium: string }[] = [
    { label: t.upgrade.feature_entries, free: t.upgrade.free_entries, premium: t.upgrade.premium_entries },
    { label: t.upgrade.feature_stories, free: t.upgrade.free_stories, premium: t.upgrade.premium_stories },
    { label: t.upgrade.feature_book, free: t.upgrade.free_book, premium: t.upgrade.premium_book },
    { label: t.upgrade.feature_profiles, free: t.upgrade.free_profiles, premium: t.upgrade.premium_profiles },
    { label: t.upgrade.feature_support, free: t.upgrade.free_support, premium: t.upgrade.premium_support },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <main style={{ maxWidth: 540, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".75rem", lineHeight: 1.2 }}>
            {t.upgrade.title}
          </h1>
          <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
            {subtitle}
          </p>
        </div>

        {/* Comparison table */}
        <div style={{ background: "#FDFAF5", borderRadius: 20, border: "1px solid rgba(61,43,31,.08)", overflow: "hidden", marginBottom: "1.75rem" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", borderBottom: "1px solid rgba(61,43,31,.08)" }}>
            <div style={{ padding: "1rem 1.25rem", fontSize: ".7rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em" }} />
            <div style={{ padding: "1rem .75rem", textAlign: "center", fontSize: ".8rem", fontWeight: 500, color: "#7A5C44", borderLeft: "1px solid rgba(61,43,31,.06)" }}>
              {t.upgrade.plan_free}
            </div>
            <div style={{ padding: "1rem .75rem", textAlign: "center", fontSize: ".8rem", fontWeight: 600, color: "#C8813A", background: "rgba(200,129,58,.04)", borderLeft: "1px solid rgba(61,43,31,.06)" }}>
              {t.upgrade.plan_premium} ✦
            </div>
          </div>

          {/* Rows */}
          {tableRows.map((row, i) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", borderBottom: i < tableRows.length - 1 ? "1px solid rgba(61,43,31,.05)" : "none" }}>
              <div style={{ padding: ".875rem 1.25rem", fontSize: ".875rem", color: "#3D2B1F", fontWeight: 400 }}>
                {row.label}
              </div>
              <div style={{ padding: ".875rem .75rem", textAlign: "center", fontSize: ".85rem", color: "#7A5C44", borderLeft: "1px solid rgba(61,43,31,.05)", fontWeight: 300 }}>
                {row.free}
              </div>
              <div style={{ padding: ".875rem .75rem", textAlign: "center", fontSize: ".85rem", color: "#C8813A", background: "rgba(200,129,58,.04)", borderLeft: "1px solid rgba(61,43,31,.05)", fontWeight: 500 }}>
                {row.premium}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
          <button
            onClick={handleSubscribe}
            disabled={loadingCheckout}
            style={{ width: "100%", padding: ".9rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".95rem", fontWeight: 600, cursor: loadingCheckout ? "not-allowed" : "pointer", opacity: loadingCheckout ? .7 : 1, transition: "opacity .15s" }}
          >
            {loadingCheckout ? t.upgrade.loading : t.upgrade.monthly_cta}
          </button>

          <div style={{ textAlign: "center", fontSize: ".8rem", color: "#7A5C44", fontWeight: 300 }}>
            {t.upgrade.or}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loadingCheckout}
            style={{ width: "100%", padding: ".875rem", borderRadius: 100, border: "1.5px solid rgba(200,129,58,.4)", background: "rgba(200,129,58,.06)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: loadingCheckout ? "not-allowed" : "pointer", opacity: loadingCheckout ? .7 : 1, transition: "opacity .15s" }}
          >
            {t.upgrade.annual_cta}
          </button>

          <p style={{ textAlign: "center", fontSize: ".78rem", color: "#7A5C44", fontWeight: 300, margin: ".25rem 0 0", opacity: .7 }}>
            {t.upgrade.cancel_anytime}
          </p>
        </div>

      </main>
    </div>
  );
}

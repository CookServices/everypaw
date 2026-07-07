"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice, type Currency } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function UpgradePage() {
  const { locale } = useLocale();
  const isFR = locale === "fr";

  const [loading, setLoading] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [userPlan, setUserPlan] = useState<string>("free");

  useEffect(() => {
    fetch("/api/currency").then(r => r.json()).then(d => setCurrency(d.currency as Currency)).catch(() => {});
    const supabase = createClient();
    supabase.from("profiles").select("plan").single().then(({ data }) => {
      if (data?.plan) setUserPlan(data.plan);
    });
  }, []);

  const handleSubscribe = async (plan: "digital" | "print_annual") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const handleBookOnce = async () => {
    setLoading("book");
    try {
      const res = await fetch("/api/stripe/book-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  };

  const t = {
    title:       isFR ? "Choisissez votre formule" : "Choose your plan",
    subtitle:    isFR ? "Commencez gratuitement, évoluez quand vous êtes prêt." : "Start free, upgrade when you're ready.",
    cta_loading: isFR ? "Redirection…" : "Redirecting…",
    cancel:      isFR ? "Sans engagement pour Digital · Engagement annuel pour Print" : "Cancel anytime for Digital · Annual commitment for Print",

    free: {
      name:  isFR ? "Gratuit" : "Free",
      price: "$0",
      sub:   isFR ? "/mois" : "/month",
      desc:  isFR ? "Pour découvrir Everypaw" : "Explore Everypaw",
      feats: isFR
        ? ["10 entrées de journal", "1 histoire IA", "1 profil animal"]
        : ["10 journal entries", "1 AI story", "1 pet profile"],
      cta: isFR ? "Plan actuel" : "Current plan",
    },

    digital: {
      name:  isFR ? "Premium Digital" : "Premium Digital",
      price: formatPrice(currency, "digital"),
      sub:   isFR ? "/mois" : "/month",
      desc:  isFR ? "Pour les passionnés" : "For dedicated pet parents",
      feats: isFR
        ? ["Entrées illimitées", "Histoires IA illimitées", "Profils animaux illimités", "Téléchargement PDF du livre"]
        : ["Unlimited entries", "Unlimited AI stories", "Unlimited pet profiles", "PDF book download"],
      cta: isFR ? "Commencer Digital" : "Get Digital",
    },

    print: {
      name:  isFR ? "Premium Print" : "Premium Print",
      price: formatPrice(currency, "printAnnual"),
      sub:   `${formatPrice(currency, "printAnnualMonthly")}/${isFR ? "mois" : "month"}`,
      desc:  isFR ? "Avec un beau livre relié chaque année" : "With a beautiful hardcover book each year",
      feats: isFR
        ? ["Tout le plan Digital", "1 livre hardcover / an inclus", "Impression & livraison incluses", "Support prioritaire"]
        : ["Everything in Digital", "1 hardcover book/year included", "Printing & shipping included", "Priority support"],
      cta:   isFR ? "Commencer Print" : "Get Print",
      badge: isFR ? "Meilleure valeur" : "Best value",
    },

    book: {
      name:  isFR ? "Livre à la carte" : "Book à la carte",
      price: isFR ? "dès 28 €" : "from $28",
      desc:  isFR ? "Prix selon le nombre de pages" : "Priced by page count",
      feats: isFR
        ? ["1 livre hardcover imprimé", "Livraison incluse", "Aucun abonnement requis"]
        : ["1 printed hardcover book", "Shipping included", "No subscription required"],
      cta: isFR ? "Commander un livre" : "Order a book",
    },
  };

  const planCard = (
    title: string,
    price: string,
    priceSub: string | null,
    desc: string,
    features: string[],
    cta: string,
    onCta: (() => void) | null,
    featured: boolean,
    badge?: string,
    disabled?: boolean,
  ) => (
    <div style={{
      background: featured ? "#3D2B1F" : "#FDFAF5",
      borderRadius: 20,
      padding: "1.75rem",
      border: featured ? "none" : "1px solid rgba(61,43,31,.1)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      {badge && (
        <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#C8813A", color: "#FDFAF5", fontSize: ".7rem", fontWeight: 600, padding: ".3rem .8rem", borderRadius: 100, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
          {badge}
        </div>
      )}

      <div>
        <p style={{ fontSize: ".75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: featured ? "rgba(247,242,234,.6)" : "#7A5C44", margin: "0 0 .4rem" }}>
          {title}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: ".35rem" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 700, color: featured ? "#F7C27A" : "#3D2B1F" }}>{price}</span>
          {priceSub && <span style={{ fontSize: ".8rem", color: featured ? "rgba(247,242,234,.5)" : "#7A5C44" }}>{priceSub}</span>}
        </div>
        <p style={{ fontSize: ".82rem", color: featured ? "rgba(247,242,234,.7)" : "#7A5C44", margin: ".4rem 0 0", lineHeight: 1.4 }}>{desc}</p>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".5rem" }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: ".85rem", color: featured ? "rgba(247,242,234,.85)" : "#3D2B1F", display: "flex", gap: ".5rem", alignItems: "flex-start" }}>
            <span style={{ color: featured ? "#F7C27A" : "#C8813A", flexShrink: 0, marginTop: "1px" }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onCta ?? undefined}
        disabled={!onCta || !!disabled}
        style={{
          marginTop: "auto",
          width: "100%",
          padding: ".8rem",
          borderRadius: 100,
          border: onCta ? "none" : `1.5px solid ${featured ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.15)"}`,
          background: onCta
            ? (featured ? "#C8813A" : "rgba(200,129,58,.12)")
            : "transparent",
          color: onCta
            ? (featured ? "#FDFAF5" : "#C8813A")
            : (featured ? "rgba(247,242,234,.4)" : "#7A5C44"),
          fontFamily: "inherit",
          fontSize: ".875rem",
          fontWeight: onCta ? 600 : 400,
          cursor: onCta && !disabled ? "pointer" : "default",
          opacity: disabled ? .5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cta}
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 600, color: "#3D2B1F", marginBottom: ".75rem" }}>
            {t.title}
          </h1>
          <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.7 }}>{t.subtitle}</p>
        </div>

        {/* Plan grid, 3 plans fixes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>

          {planCard(
            t.free.name,
            t.free.price,
            t.free.sub,
            t.free.desc,
            t.free.feats,
            t.free.cta,
            null,
            false,
            undefined,
            true,
          )}

          {planCard(
            t.digital.name,
            t.digital.price,
            t.digital.sub,
            t.digital.desc,
            t.digital.feats,
            loading === "digital" ? t.cta_loading : t.digital.cta,
            loading ? null : () => handleSubscribe("digital"),
            false,
          )}

          {planCard(
            t.print.name,
            t.print.price,
            t.print.sub,
            t.print.desc,
            t.print.feats,
            loading === "print_annual" ? t.cta_loading : t.print.cta,
            loading ? null : () => handleSubscribe("print_annual"),
            true,
            t.print.badge,
          )}

        </div>

        {/* Book à la carte, visible only for digital/print subscribers */}
        {(userPlan === "digital" || userPlan === "print") && (
          <div style={{ background: "#FDFAF5", borderRadius: 20, border: "1px solid rgba(61,43,31,.08)", padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: ".5rem", marginBottom: ".35rem" }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color: "#3D2B1F" }}>
                  {t.book.price}
                </span>
                <span style={{ fontSize: ".85rem", fontWeight: 600, color: "#3D2B1F" }}>{t.book.name}</span>
              </div>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.book.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: ".75rem 0 0", display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                {t.book.feats.map(f => (
                  <li key={f} style={{ fontSize: ".8rem", color: "#7A5C44", display: "flex", alignItems: "center", gap: ".35rem" }}>
                    <span style={{ color: "#C8813A" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleBookOnce}
              disabled={!!loading}
              style={{ padding: ".75rem 1.75rem", borderRadius: 100, border: "1.5px solid rgba(200,129,58,.4)", background: "rgba(200,129,58,.08)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: loading ? .7 : 1 }}
            >
              {loading === "book" ? t.cta_loading : t.book.cta}
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: ".78rem", color: "#7A5C44", fontWeight: 300, marginTop: "1.5rem", opacity: .7 }}>
          {t.cancel}
        </p>
        <p style={{ textAlign: "center", fontSize: ".72rem", color: "#9A8070", fontWeight: 300, marginTop: ".5rem", lineHeight: 1.5 }}>
          {isFR ? (
            <>En continuant, vous acceptez les <a href="/legal/cgv" target="_blank" style={{ color: "#9A8070", textDecoration: "underline" }}>Conditions générales de vente</a>.</>
          ) : (
            <>By continuing, you agree to our <a href="/legal/cgv" target="_blank" style={{ color: "#9A8070", textDecoration: "underline" }}>Terms of Service</a>.</>
          )}
        </p>

      </main>
    </div>
  );
}

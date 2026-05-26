"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { formatPrice, type Currency } from "@/lib/currency";

export default function GiftPage() {
  const { t, locale } = useLocale();
  const isFR = locale === "fr";

  const [selectedPlan, setSelectedPlan] = useState<"digital" | "print">("digital");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [form, setForm] = useState({
    recipientEmail: "",
    recipientName: "",
    senderName: "",
    message: "",
    scheduledDate: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState<Currency>("USD");

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/currency").then(r => r.json()).then(d => setCurrency(d.currency as Currency)).catch(() => {});
  }, []);

  // Step 1 : validate form then go to confirm screen
  const handleGoToConfirm = () => {
    if (!form.recipientEmail || !form.recipientName || !form.senderName) {
      alert(t.gift.required_fields);
      return;
    }
    if (form.scheduledDate && form.scheduledDate <= todayStr) {
      alert(t.gift.send_date_future_error);
      return;
    }
    setStatus("idle");
    setStep("confirm");
  };

  // Step 2 : actually call the API
  const handleConfirm = async () => {
    setStatus("loading");
    const res = await fetch("/api/gift/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, locale, plan: planApiKey }),
    });
    const data = await res.json();
    if (data.success) {
      setCode(data.code);
      setStatus("success");
    } else {
      setStatus("error");
    }
  };

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA",
    fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F",
    outline: "none", boxSizing: "border-box" as const,
  };

  const labelStyle = {
    fontSize: ".75rem", fontWeight: 500 as const, color: "#7A5C44",
    textTransform: "uppercase" as const, letterSpacing: ".06em",
    display: "block", marginBottom: ".4rem",
  };

  const scheduledDateFormatted = form.scheduledDate
    ? new Date(form.scheduledDate + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "";

  const isAnnual = billingCycle === "annual";
  const planLabel = selectedPlan === "digital" ? "Premium Digital" : "Premium Print";
  const planPriceKey = selectedPlan === "digital"
    ? (isAnnual ? "digitalAnnual" : "digital")
    : (isAnnual ? "printAnnual" : "print");
  const planPricePeriod = isAnnual ? (isFR ? "an" : "yr") : (isFR ? "mois" : "mo");
  const planPrice = `${formatPrice(currency, planPriceKey)}/${planPricePeriod}`;
  // Clé transmise au checkout
  const planApiKey = selectedPlan === "digital"
    ? (isAnnual ? "digital_annual" : "digital")
    : (isAnnual ? "print_annual" : "print");

  // ── Success screen ────────────────────────────────────────────────────────
  if (status === "success") return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </div>
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎁</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: "#3D2B1F", marginBottom: ".75rem" }}>{t.gift.success_title}</h2>
          <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {form.scheduledDate
              ? t.gift.success_desc_scheduled.replace("{email}", form.recipientEmail).replace("{date}", scheduledDateFormatted)
              : t.gift.success_desc.replace("{email}", form.recipientEmail)}
          </p>
          <div style={{ position: "relative", marginBottom: "1.5rem" }}>
            <div style={{ background: "#3D2B1F", color: "#F7C27A", fontFamily: "monospace", fontSize: "1.25rem", padding: "1rem 3rem 1rem 1rem", borderRadius: 12, textAlign: "center", letterSpacing: ".15em" }}>
              {code}
            </div>
            <button
              onClick={async () => {
                if (!code) return;
                try {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(code);
                  } else {
                    const el = document.createElement("textarea");
                    el.value = code;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand("copy");
                    document.body.removeChild(el);
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              title={isFR ? "Copier le code" : "Copy code"}
              style={{ position: "absolute", right: ".625rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: ".35rem .5rem", cursor: "pointer", color: copied ? "#6fcf97" : "#F7C27A", fontSize: ".85rem", lineHeight: 1, transition: "color .15s", fontFamily: "inherit" }}
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
          <Link href="/" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
            {t.gift.back}
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <Link href="/gift" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
            {t.nav.give_gift}
          </Link>
          <Link href="/auth/login" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
            {t.nav.sign_in}
          </Link>
          <Link href="/auth/signup" style={{ background: "#3D2B1F", color: "#F7F2EA", padding: ".5rem 1.25rem", borderRadius: "100px", fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
            {t.nav.get_started}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎁</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{t.gift.title}</h1>
          <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6 }}>{t.gift.subtitle}</p>
        </div>

        {/* 3-step explainer */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 600, color: "#C8813A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "1.125rem", textAlign: "center" }}>
            {t.gift.how_it_works}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {([
              { icon: t.gift.step1_icon, title: t.gift.step1_title, desc: t.gift.step1_desc },
              { icon: t.gift.step2_icon, title: t.gift.step2_title, desc: t.gift.step2_desc },
              { icon: t.gift.step3_icon, title: t.gift.step3_title, desc: t.gift.step3_desc },
            ] as { icon: string; title: string; desc: string }[]).map((s, i, arr) => (
              <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FDFAF5", border: "1.5px solid rgba(200,129,58,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 1.5, height: 28, background: "rgba(200,129,58,.2)", margin: ".25rem 0" }} />
                  )}
                </div>
                <div style={{ paddingTop: ".625rem", paddingBottom: i < arr.length - 1 ? "1rem" : 0 }}>
                  <div style={{ fontSize: ".9rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".2rem", lineHeight: 1.3 }}>{s.title}</div>
                  <div style={{ fontSize: ".82rem", color: "#7A5C44", lineHeight: 1.6, fontWeight: 300 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card : form OR confirm */}
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>

          {step === "confirm" ? (
            /* ── Confirmation screen ──────────────────────────────────── */
            <>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1.25rem" }}>
                {isFR ? "Récapitulatif" : "Summary"}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", marginBottom: "1.5rem" }}>
                {([
                  [isFR ? "Formule" : "Plan", `${planLabel} · ${planPrice}`],
                  [isFR ? "Destinataire" : "Recipient", form.recipientName],
                  ["Email", form.recipientEmail],
                  ...(form.message ? [[isFR ? "Message" : "Message", form.message]] : []),
                  [isFR ? "Envoi" : "Sending", scheduledDateFormatted || (isFR ? "Immédiat" : "Immediate")],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", padding: ".625rem 0", borderBottom: "1px solid rgba(61,43,31,.06)" }}>
                    <span style={{ fontSize: ".82rem", color: "#7A5C44", fontWeight: 400, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: ".82rem", color: "#3D2B1F", fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: ".75rem" }}>
                <button
                  onClick={() => setStep("form")}
                  style={{ flex: "0 0 auto", padding: ".75rem 1.25rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "#3D2B1F", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer" }}
                >
                  {isFR ? "← Modifier" : "← Edit"}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={status === "loading"}
                  style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1 }}
                >
                  {status === "loading" ? t.gift.sending : (isFR ? "Confirmer et payer →" : "Confirm & pay →")}
                </button>
              </div>

              {status === "error" && (
                <p style={{ fontSize: ".8rem", color: "#A32D2D", marginTop: ".75rem", textAlign: "center" }}>{t.gift.error}</p>
              )}
            </>
          ) : (
            /* ── Form ────────────────────────────────────────────────── */
            <>
              {/* Plan selection */}
              <p style={{ fontSize: ".75rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .75rem" }}>
                {isFR ? "Choisir la formule" : "Choose a plan"}
              </p>

              {/* Billing cycle toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", marginBottom: "1rem" }}>
                <button
                  onClick={() => setBillingCycle("monthly")}
                  style={{ padding: ".35rem .9rem", borderRadius: 100, border: "none", background: billingCycle === "monthly" ? "#3D2B1F" : "transparent", color: billingCycle === "monthly" ? "#FDFAF5" : "#7A5C44", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: "pointer", transition: "all .15s" }}
                >
                  {isFR ? "Mensuel" : "Monthly"}
                </button>
                <div style={{ background: "rgba(61,43,31,.1)", borderRadius: 100, padding: "3px" }}>
                  <button
                    onClick={() => setBillingCycle("annual")}
                    style={{ padding: ".35rem .9rem", borderRadius: 100, border: "none", background: billingCycle === "annual" ? "#3D2B1F" : "transparent", color: billingCycle === "annual" ? "#FDFAF5" : "#7A5C44", fontFamily: "inherit", fontSize: ".8rem", fontWeight: 500, cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center", gap: ".35rem" }}
                  >
                    {isFR ? "Annuel" : "Annual"}
                    <span style={{ background: "#9C6420", color: "#FDFAF5", fontSize: ".75rem", fontWeight: 700, borderRadius: 100, padding: "3px 8px", letterSpacing: ".02em", whiteSpace: "nowrap" }}>−34 %</span>
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".625rem", marginBottom: ".75rem" }}>

                {/* Digital */}
                <button
                  onClick={() => setSelectedPlan("digital")}
                  style={{ padding: "1rem", borderRadius: 14, border: `1.5px solid ${selectedPlan === "digital" ? "#C8813A" : "rgba(61,43,31,.15)"}`, background: selectedPlan === "digital" ? "rgba(200,129,58,.08)" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .12s" }}
                >
                  <p style={{ fontSize: ".75rem", fontWeight: 600, color: "#C8813A", margin: "0 0 .3rem", textTransform: "uppercase", letterSpacing: ".05em" }}>Digital</p>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .15rem" }}>
                    {formatPrice(currency, isAnnual ? "digitalAnnual" : "digital")}
                    <span style={{ fontSize: ".7rem", fontWeight: 400, color: "#7A5C44" }}>/{isFR ? (isAnnual ? "an" : "mois") : (isAnnual ? "yr" : "mo")}</span>
                  </p>
                  {isAnnual && (
                    <p style={{ fontSize: ".68rem", color: "#C8813A", fontWeight: 500, margin: "0 0 .4rem" }}>
                      {isFR ? "économisez 24 €" : "save $24"}
                    </p>
                  )}
                  <ul style={{ margin: 0, padding: "0 0 0 .9rem", display: "flex", flexDirection: "column", gap: ".2rem" }}>
                    {(isFR
                      ? ["Entrées illimitées", "Histoires générées par l'IA", "Export PDF"]
                      : ["Unlimited journal entries", "AI-generated stories", "PDF export"]
                    ).map(f => (
                      <li key={f} style={{ fontSize: ".72rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.4 }}>{f}</li>
                    ))}
                  </ul>
                </button>

                {/* Print */}
                <button
                  onClick={() => setSelectedPlan("print")}
                  style={{ padding: "1rem", borderRadius: 14, border: `1.5px solid ${selectedPlan === "print" ? "#C8813A" : "rgba(61,43,31,.15)"}`, background: selectedPlan === "print" ? "rgba(200,129,58,.08)" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .12s", position: "relative" }}
                >
                  <div style={{ position: "absolute", top: "-.5rem", right: ".75rem", background: "#C8813A", color: "#FDFAF5", fontSize: ".6rem", fontWeight: 600, borderRadius: 100, padding: ".15rem .5rem", letterSpacing: ".04em" }}>
                    {isFR ? "Meilleure valeur" : "Best value"}
                  </div>
                  <p style={{ fontSize: ".75rem", fontWeight: 600, color: "#C8813A", margin: "0 0 .3rem", textTransform: "uppercase", letterSpacing: ".05em" }}>Print</p>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .15rem" }}>
                    {formatPrice(currency, isAnnual ? "printAnnual" : "print")}
                    <span style={{ fontSize: ".7rem", fontWeight: 400, color: "#7A5C44" }}>/{isFR ? (isAnnual ? "an" : "mois") : (isAnnual ? "yr" : "mo")}</span>
                  </p>
                  {isAnnual && (
                    <p style={{ fontSize: ".68rem", color: "#C8813A", fontWeight: 500, margin: "0 0 .4rem" }}>
                      {isFR ? "économisez 40 €" : "save $40"}
                    </p>
                  )}
                  <ul style={{ margin: 0, padding: "0 0 0 .9rem", display: "flex", flexDirection: "column", gap: ".2rem" }}>
                    {(isFR
                      ? ["Tout le plan Digital", "Livre relié inclus chaque année", "Livraison offerte"]
                      : ["Everything in Digital", "Annual hardcover book included", "Free shipping"]
                    ).map(f => (
                      <li key={f} style={{ fontSize: ".72rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.4 }}>{f}</li>
                    ))}
                  </ul>
                </button>
              </div>

              {/* Dynamic price summary */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".625rem .875rem", background: "rgba(200,129,58,.06)", borderRadius: 10, marginBottom: "1.5rem" }}>
                <span style={{ fontSize: ".8rem", color: "#7A5C44" }}>
                  {isFR ? "Formule sélectionnée" : "Selected plan"}
                </span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: "#C8813A" }}>
                  {planPrice}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {([
                  { key: "recipientName", label: t.gift.recipient_name, placeholder: "Jane" },
                  { key: "recipientEmail", label: t.gift.recipient_email, placeholder: "jane@example.com", type: "email" },
                  { key: "senderName", label: t.gift.sender_name, placeholder: "John" },
                ] as { key: string; label: string; placeholder: string; type?: string }[]).map(field => (
                  <div key={field.key}>
                    <label style={labelStyle}>{field.label}</label>
                    <input
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}

                <div>
                  <label style={labelStyle}>{t.gift.message_label}</label>
                  <textarea
                    placeholder={t.gift.message_placeholder}
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                {/* Send date field */}
                <div>
                  <label style={labelStyle}>{t.gift.send_date_label}</label>
                  <input
                    type="date"
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    value={form.scheduledDate}
                    onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: ".75rem", color: "#7A5C44", marginTop: ".4rem", lineHeight: 1.5 }}>
                    {t.gift.send_date_hint}
                  </p>
                </div>
              </div>

              <button
                onClick={handleGoToConfirm}
                style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer" }}
              >
                {t.gift.send}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

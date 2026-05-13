"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

export default function OrderPage({ params }: { params: { id: string } }) {
  const { t } = useLocale();
  const { id } = params;
  const searchParams = useSearchParams();
  const isMemorial = searchParams.get("memorial") === "true";

  const [petName, setPetName] = useState<string>("");
  const [step, setStep] = useState<"address" | "confirm" | "success">("address");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
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
    supabase.from("pets").select("name").eq("id", id).single().then(({ data }) => {
      if (data) setPetName(data.name);
    });
  }, [id]);

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gelato/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: id, shippingAddress: address, memorial: isMemorial }),
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
    { key: "firstName", label: t.order.first_name, placeholder: "John" },
    { key: "lastName", label: t.order.last_name, placeholder: "Doe" },
    { key: "addressLine1", label: t.order.address, placeholder: "123 Main St" },
    { key: "addressLine2", label: t.order.apt, placeholder: "Apt 4B" },
    { key: "city", label: t.order.city, placeholder: "" },
    { key: "postCode", label: t.order.postal_code, placeholder: "" },
  ];

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.12)" : "rgba(61,43,31,.15)"}`,
    background: isMemorial ? "rgba(247,242,234,.05)" : "#F7F2EA",
    fontFamily: "inherit", fontSize: ".9rem",
    color: isMemorial ? "#F7F2EA" : "#3D2B1F",
    outline: "none", boxSizing: "border-box" as const,
  };

  const bg = isMemorial ? "#1C1410" : "#F7F2EA";
  const cardBg = isMemorial ? "rgba(247,242,234,.04)" : "#FDFAF5";
  const cardBorder = isMemorial ? "1px solid rgba(247,242,234,.08)" : "1px solid rgba(61,43,31,.08)";
  const textPrimary = isMemorial ? "#F7F2EA" : "#3D2B1F";
  const textMuted = isMemorial ? "rgba(247,242,234,.5)" : "#7A5C44";
  const labelColor = isMemorial ? "rgba(247,242,234,.4)" : "#7A5C44";
  const price = isMemorial ? t.memorial.order_price : t.order.product_price;
  const productName = isMemorial
    ? (petName ? t.memorial.order_tribute.replace("{name}", petName) : "…")
    : t.order.product_detail;
  const productSpecs = isMemorial ? t.memorial.order_specs : t.order.product_specs;
  const warningText = isMemorial ? t.memorial.order_note : t.order.warning;

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

        {/* Memorial hero */}
        {isMemorial && petName && step === "address" && (
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🕊️</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600, color: "#F7F2EA", marginBottom: ".5rem" }}>
              {t.memorial.order_tribute.replace("{name}", petName)}
            </h1>
            <p style={{ fontSize: ".9rem", color: "rgba(247,242,234,.5)", fontWeight: 300, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
              {t.memorial.order_subtitle}
            </p>
          </div>
        )}

        {step === "success" ? (
          <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{isMemorial ? "🕊️" : "📬"}</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: textPrimary, marginBottom: ".75rem" }}>{t.order.success_title}</h2>
            <p style={{ fontSize: ".9rem", color: textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: ".5rem" }}>
              {t.order.success_desc}
            </p>
            <p style={{ fontSize: ".8rem", color: textMuted, fontWeight: 300, marginBottom: "2rem" }}>
              {t.order.order_id} <code style={{ background: isMemorial ? "rgba(247,242,234,.08)" : "rgba(61,43,31,.06)", padding: "2px 6px", borderRadius: 4 }}>{orderId}</code>
            </p>
            <Link href="/dashboard" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
              {t.order.back_dashboard}
            </Link>
          </div>

        ) : step === "confirm" ? (
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

            <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem", fontSize: ".8rem", color: textMuted, lineHeight: 1.5, fontFamily: "sans-serif" }}>
              {warningText}
            </div>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={() => setStep("address")} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`, background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: textMuted, cursor: "pointer" }}>
                {t.order.edit_address}
              </button>
              <button onClick={handleOrder} disabled={loading} style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: isMemorial ? "#8B6B4A" : "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: loading ? .7 : 1 }}>
                {loading ? t.order.placing : t.order.place_order}
              </button>
            </div>
          </div>

        ) : (
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
                  <option value="FR">France</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="NL">Netherlands</option>
                  <option value="ES">Spain</option>
                  <option value="IT">Italy</option>
                </select>
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
              style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: isMemorial ? "#8B6B4A" : "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer" }}
            >
              {t.order.continue}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

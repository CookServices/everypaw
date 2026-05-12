"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export default function GiftPage() {
  const { t } = useLocale();
  const [form, setForm] = useState({
    recipientEmail: "",
    recipientName: "",
    senderName: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [code, setCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.recipientEmail || !form.recipientName || !form.senderName) {
      alert(t.gift.required_fields);
      return;
    }
    setStatus("loading");
    const res = await fetch("/api/gift/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

  if (status === "success") return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </div>
        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎁</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: "#3D2B1F", marginBottom: ".75rem" }}>{t.gift.success_title}</h2>
          <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {t.gift.success_desc.replace("{email}", form.recipientEmail)}
          </p>
          <div style={{ background: "#3D2B1F", color: "#F7C27A", fontFamily: "monospace", fontSize: "1.25rem", padding: "1rem", borderRadius: 12, textAlign: "center", letterSpacing: ".15em", marginBottom: "1.5rem" }}>
            {code}
          </div>
          <Link href="/" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
            {t.gift.back}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎁</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{t.gift.title}</h1>
          <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6 }}>{t.gift.subtitle}</p>
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
          <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: ".875rem", fontWeight: 500, color: "#3D2B1F", margin: "0 0 .2rem" }}>{t.gift.product_name}</p>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{t.gift.product_desc}</p>
            </div>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#C8813A" }}>{t.gift.product_price}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { key: "recipientName", label: t.gift.recipient_name, placeholder: "Jane" },
              { key: "recipientEmail", label: t.gift.recipient_email, placeholder: "jane@example.com", type: "email" },
              { key: "senderName", label: t.gift.sender_name, placeholder: "John" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{field.label}</label>
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
              <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{t.gift.message_label}</label>
              <textarea
                placeholder={t.gift.message_placeholder}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>

          {status === "error" && <p style={{ fontSize: ".8rem", color: "#A32D2D", marginTop: "1rem" }}>{t.gift.error}</p>}

          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1 }}
          >
            {status === "loading" ? t.gift.sending : t.gift.send}
          </button>
        </div>
      </main>
    </div>
  );
}

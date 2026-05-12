"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export default function RedeemPage() {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c);
  }, []);

  const handleRedeem = async () => {
    if (!code.trim()) { setError(t.redeem.error_empty); return; }
    setStatus("loading");
    setError("");
    const res = await fetch("/api/gift/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || t.redeem.error_invalid);
      setStatus("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
            Everypaw
          </Link>
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎁</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#3D2B1F", marginBottom: ".5rem" }}>{t.redeem.title}</h2>
          <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
            {t.redeem.subtitle}
          </p>

          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder={t.redeem.placeholder}
            style={{ width: "100%", padding: ".875rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "monospace", fontSize: "1.1rem", color: "#3D2B1F", outline: "none", textAlign: "center", letterSpacing: ".15em", marginBottom: "1rem", boxSizing: "border-box" }}
          />

          {error && <p style={{ fontSize: ".8rem", color: "#A32D2D", marginBottom: "1rem" }}>{error}</p>}

          <button
            onClick={handleRedeem}
            disabled={status === "loading"}
            style={{ width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: status === "loading" ? .7 : 1, marginBottom: "1rem" }}
          >
            {status === "loading" ? t.redeem.activating : t.redeem.activate}
          </button>

          <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300 }}>
            {t.redeem.no_account}{" "}
            <Link href="/auth/signup" style={{ color: "#C8813A", textDecoration: "none" }}>{t.redeem.create_one}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

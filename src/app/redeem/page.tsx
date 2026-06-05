"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import PublicFooter from "@/components/PublicFooter";

export default function RedeemPage() {
  const { t, locale } = useLocale();
  const isFR = locale === "fr";
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setAuthChecked(true);
    });
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

  const redeemRedirect = `/redeem${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  const loginUrl = `/auth/login?redirect=/redeem${code ? `&code=${encodeURIComponent(code)}` : ""}`;
  const signupUrl = `/auth/signup?redirect=/redeem${code ? `&code=${encodeURIComponent(code)}` : ""}`;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
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

          {/* Not logged in — show auth prompt */}
          {authChecked && !isLoggedIn ? (
            <div>
              <div style={{ background: "rgba(200,129,58,.07)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
                <p style={{ fontSize: ".875rem", color: "#3D2B1F", margin: 0, lineHeight: 1.6 }}>
                  {isFR
                    ? "Connectez-vous ou créez un compte pour activer votre cadeau 🎁"
                    : "Sign in or create an account to activate your gift 🎁"}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <Link
                  href={loginUrl}
                  style={{ display: "block", padding: ".75rem", borderRadius: 100, background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, textDecoration: "none" }}
                >
                  {isFR ? "Se connecter →" : "Sign in →"}
                </Link>
                <Link
                  href={signupUrl}
                  style={{ display: "block", padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "#3D2B1F", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, textDecoration: "none" }}
                >
                  {isFR ? "Créer un compte →" : "Create an account →"}
                </Link>
              </div>
            </div>
          ) : authChecked ? (
            /* Logged in — show redeem form */
            <>
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
            </>
          ) : (
            /* Auth check in progress */
            <div style={{ padding: "1rem 0", color: "#9A8070", fontSize: ".875rem" }}>…</div>
          )}
        </div>
      </div>
      </div>
      <PublicFooter />
    </div>
  );
}

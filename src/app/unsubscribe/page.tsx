"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
  }, []);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setStatus("loading");
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) setStatus("success");
    else setStatus("error");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 600, color: "#3D2B1F", marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </div>

        <div style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", border: "1px solid rgba(61,43,31,.08)" }}>
          {status === "success" ? (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✓</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#3D2B1F", marginBottom: ".75rem" }}>You've been unsubscribed</h2>
              <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
                You won't receive weekly reminder emails anymore. You can re-enable them anytime from your dashboard settings.
              </p>
              <Link href="/dashboard" style={{ background: "#C8813A", color: "#FDFAF5", padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
                Go to dashboard →
              </Link>
            </>
          ) : status === "error" ? (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✗</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#3D2B1F", marginBottom: ".75rem" }}>Something went wrong</h2>
              <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6 }}>Invalid or expired unsubscribe link. Please contact us at hello@everypaw.app</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🐾</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: "#3D2B1F", marginBottom: ".75rem" }}>Unsubscribe from weekly reminders</h2>
              <p style={{ fontSize: ".9rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem" }}>
                You'll no longer receive weekly reminder emails. Your account and all your pet stories remain intact.
              </p>
              <button
                onClick={handleUnsubscribe}
                disabled={status === "loading" || !token}
                style={{ background: "#3D2B1F", color: "#FDFAF5", padding: ".75rem 1.5rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", opacity: status === "loading" ? .7 : 1 }}
              >
                {status === "loading" ? "Processing…" : "Confirm unsubscribe"}
              </button>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", marginTop: "1rem" }}>
                Changed your mind? <Link href="/dashboard" style={{ color: "#C8813A" }}>Go back to dashboard</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

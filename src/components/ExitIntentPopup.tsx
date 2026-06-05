"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isFR?: boolean;
}

const STORAGE_KEY = "ep_exit_popup_shown";

export default function ExitIntentPopup({ isFR = false }: Props) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const triggeredRef = useRef(false);

  useEffect(() => {
    // Only trigger once per session
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (triggeredRef.current) return;
      // Only fire when cursor exits toward the top
      if (e.clientY > 20) return;
      triggeredRef.current = true;
      sessionStorage.setItem(STORAGE_KEY, "1");
      setVisible(true);
    };

    // Small delay so it doesn't fire on initial page load scroll
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const close = () => setVisible(false);

  const handleSubmit = async () => {
    setErrorMsg("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setErrorMsg(isFR ? "Adresse email invalide." : "Invalid email address.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? (isFR ? "Une erreur est survenue." : "Something went wrong."));
        setStatus("error");
      }
    } catch {
      setErrorMsg(isFR ? "Une erreur est survenue." : "Something went wrong.");
      setStatus("error");
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(61,43,31,.55)", backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-popup-title"
        style={{
          position: "fixed", zIndex: 9999,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, calc(100vw - 2rem))",
          background: "#FDFAF5",
          borderRadius: 24,
          padding: "2.5rem 2rem 2rem",
          boxShadow: "0 24px 80px rgba(61,43,31,.2)",
          border: "1px solid rgba(61,43,31,.08)",
          fontFamily: "inherit",
        }}
      >
        {/* Close */}
        <button
          onClick={close}
          aria-label="Fermer"
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "none", border: "none", cursor: "pointer",
            color: "#9A8070", fontSize: "1.2rem", lineHeight: 1, padding: "4px 8px",
          }}
        >
          ×
        </button>

        {status === "done" ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🐾</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", color: "#3D2B1F", margin: "0 0 .75rem" }}>
              {isFR ? "C'est noté !" : "You're on the list!"}
            </h2>
            <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, margin: 0 }}>
              {isFR
                ? "Vous recevrez bientôt un exemple de livre Everypaw dans votre boîte mail."
                : "Check your inbox — a sample Everypaw book is on its way."}
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>📖</div>
              <h2
                id="exit-popup-title"
                style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .625rem", lineHeight: 1.3 }}
              >
                {isFR
                  ? "Recevez un exemple de livre Everypaw"
                  : "Get a sample Everypaw book"}
              </h2>
              <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.6, margin: 0 }}>
                {isFR
                  ? "Avant de partir — voyez à quoi ressemble un livre imprimé à partir d'un journal IA."
                  : "Before you go — see what a printed book from an AI journal looks like."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <input
                type="email"
                autoFocus
                placeholder={isFR ? "Votre adresse email" : "Your email address"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{
                  padding: ".75rem 1rem", borderRadius: 12,
                  border: "1.5px solid rgba(61,43,31,.15)",
                  background: "#F7F2EA", fontFamily: "inherit",
                  fontSize: ".9rem", color: "#3D2B1F", outline: "none",
                }}
              />

              {errorMsg && (
                <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: 0 }}>{errorMsg}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                style={{
                  padding: ".75rem", borderRadius: 100, border: "none",
                  background: "#C8813A", color: "#FDFAF5",
                  fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500,
                  cursor: status === "loading" ? "default" : "pointer",
                  opacity: status === "loading" ? .7 : 1,
                }}
              >
                {status === "loading"
                  ? (isFR ? "Envoi…" : "Sending…")
                  : (isFR ? "Recevoir l'exemple gratuit" : "Send me the free sample")}
              </button>

              <button
                onClick={close}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: ".78rem", color: "#9A8070", fontFamily: "inherit",
                  padding: 0, textAlign: "center",
                }}
              >
                {isFR ? "Non merci" : "No thanks"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

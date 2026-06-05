"use client";

import { useState, useEffect } from "react";

interface Props {
  /** Unique key stored in localStorage — set once, never shown again */
  id: string;
  title: string;
  body: string;
  cta?: string;
  ctaHref?: string;
  /** Delay in ms before appearing (default 1200) */
  delay?: number;
}

export default function CoachMark({ id, title, body, cta, ctaHref, delay = 1200 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(`ep_cm_${id}`)) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [id, delay]);

  const dismiss = () => {
    localStorage.setItem(`ep_cm_${id}`, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 8000,
        width: "min(320px, calc(100vw - 2rem))",
        background: "#FDFAF5",
        border: "1px solid rgba(61,43,31,.12)",
        borderRadius: 16,
        padding: "1.125rem 1.25rem",
        boxShadow: "0 8px 40px rgba(61,43,31,.14)",
        fontFamily: "inherit",
        animation: "ep-cm-in .25s ease",
      }}
    >
      <style>{`
        @keyframes ep-cm-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Close */}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        style={{
          position: "absolute", top: ".625rem", right: ".75rem",
          background: "none", border: "none", cursor: "pointer",
          color: "#9A8070", fontSize: "1rem", lineHeight: 1, padding: "2px 6px",
        }}
      >
        ×
      </button>

      {/* Content */}
      <p style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: "#3D2B1F", margin: "0 1.5rem 0 0", lineHeight: 1.3 }}>
        {title}
      </p>
      <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: ".5rem 0 0", lineHeight: 1.5 }}>
        {body}
      </p>

      {cta && ctaHref && (
        <a
          href={ctaHref}
          onClick={dismiss}
          style={{
            display: "inline-block", marginTop: ".875rem",
            padding: ".45rem 1rem", borderRadius: 100,
            background: "#C8813A", color: "#FDFAF5",
            fontSize: ".78rem", fontWeight: 500, textDecoration: "none",
          }}
        >
          {cta}
        </a>
      )}

      {/* Dismiss link */}
      <button
        onClick={dismiss}
        style={{
          display: "block", marginTop: cta ? ".5rem" : ".875rem",
          background: "none", border: "none", cursor: "pointer",
          fontSize: ".72rem", color: "#9A8070", fontFamily: "inherit", padding: 0,
        }}
      >
        OK, compris
      </button>
    </div>
  );
}

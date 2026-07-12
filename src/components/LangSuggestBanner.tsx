"use client";

import { useState, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

const DISMISS_KEY = "ep_lang_suggest_dismissed";

interface Props {
  /** Locale of the page this banner is mounted on */
  pageLocale: Locale;
  /** URL of the same page in the other language (real crawlable link) */
  altHref: string;
}

/**
 * Suggests the visitor's preferred language via a real <a href> — never redirects,
 * never changes the rendered content. Reading navigator.language is its only job.
 * Renders nothing until mounted (avoids hydration mismatch + layout shift).
 */
export default function LangSuggestBanner({ pageLocale, altHref }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const prefersFR = navigator.language.toLowerCase().startsWith("fr");
    const mismatch = (pageLocale === "en" && prefersFR) || (pageLocale === "fr" && !prefersFR);
    if (mismatch) setShow(true);
  }, [pageLocale]);

  if (!show) return null;

  // Message written in the SUGGESTED language so the target reader understands it.
  const suggestFR = pageLocale === "en";
  const text = suggestFR ? "Ce site est aussi disponible en français." : "This site is also available in English.";
  const linkLabel = suggestFR ? "Voir en français →" : "View in English →";

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label={suggestFR ? "Suggestion de langue" : "Language suggestion"}
      style={{
        position: "fixed",
        left: "50%",
        bottom: "1rem",
        transform: "translateX(-50%)",
        zIndex: 90,
        maxWidth: "calc(100vw - 2rem)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        background: "#3D2B1F",
        color: "#F7F2EA",
        padding: ".75rem 1rem .75rem 1.25rem",
        borderRadius: 100,
        boxShadow: "0 10px 30px rgba(61,43,31,.35)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: ".82rem",
      }}
    >
      <span style={{ fontWeight: 300, color: "rgba(247,242,234,.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {text}
      </span>
      <a
        href={altHref}
        style={{ color: "#E8A96A", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
      >
        {linkLabel}
      </a>
      <button
        onClick={dismiss}
        aria-label={suggestFR ? "Fermer" : "Dismiss"}
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "none",
          background: "rgba(247,242,234,.1)",
          color: "#F7F2EA",
          fontSize: "1rem",
          lineHeight: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}

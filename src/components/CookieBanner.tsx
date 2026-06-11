"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [isFR, setIsFR] = useState(false);

  useEffect(() => {
    setIsFR(navigator.language.toLowerCase().startsWith("fr"));
    if (localStorage.getItem(CONSENT_KEY) !== "accepted") setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={isFR ? "Consentement aux cookies" : "Cookie consent"}
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 9999,
        background: "#3D2B1F",
        borderTop: "1px solid rgba(247,194,122,0.2)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#FDFAF5", lineHeight: 1.5, flex: 1, minWidth: 200 }}>
        {isFR
          ? <>Cookies fonctionnels uniquement, aucun tracking.{" "}<Link href="/legal/confidentialite" style={{ color: "#F7C27A", textDecoration: "underline", whiteSpace: "nowrap" }}>Politique de confidentialité</Link></>
          : <>Essential cookies only, no tracking.{" "}<Link href="/legal/confidentialite" style={{ color: "#F7C27A", textDecoration: "underline", whiteSpace: "nowrap" }}>Privacy policy</Link></>
        }
      </p>
      <button
        onClick={accept}
        style={{
          background: "#C8813A", color: "#FDFAF5", border: "none",
          borderRadius: 100, padding: "8px 20px",
          fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        {isFR ? "Accepter" : "Accept"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) !== "accepted") {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#3D2B1F",
        borderTop: "1px solid rgba(247,194,122,0.2)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#FDFAF5", lineHeight: 1.55, flex: 1, minWidth: 240 }}>
        Ce site utilise uniquement des cookies fonctionnels essentiels à son bon fonctionnement
        (mémorisation de votre langue). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.{" "}
        <Link
          href="/legal/confidentialite"
          style={{ color: "#F7C27A", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          Politique de confidentialité
        </Link>
      </p>

      <button
        onClick={accept}
        style={{
          background: "#C8813A",
          color: "#FDFAF5",
          border: "none",
          borderRadius: 100,
          padding: "10px 24px",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Accepter
      </button>
    </div>
  );
}

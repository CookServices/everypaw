"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_EVENT, readConsent, writeConsent, type ConsentValue } from "@/lib/consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [isFR, setIsFR] = useState(false);

  useEffect(() => {
    setIsFR(navigator.language.toLowerCase().startsWith("fr"));
    const sync = () => setVisible(readConsent() === null);
    sync();
    // Lets the footer link reopen the banner by clearing the decision.
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  const decide = (value: ConsentValue) => {
    writeConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  const buttonBase = {
    borderRadius: 100,
    padding: "8px 20px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    fontFamily: "inherit",
  };

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
          ? <>Nous utilisons des cookies de mesure d&apos;audience et de publicité. Ils ne sont déposés que si vous les acceptez.{" "}<Link href="/legal/confidentialite" style={{ color: "#F7C27A", textDecoration: "underline", whiteSpace: "nowrap" }}>Politique de confidentialité</Link></>
          : <>We use analytics and advertising cookies. They are only set if you accept them.{" "}<Link href="/legal/privacy" style={{ color: "#F7C27A", textDecoration: "underline", whiteSpace: "nowrap" }}>Privacy policy</Link></>
        }
      </p>
      {/* Equal weight on both choices: refusing must be as easy as accepting. */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => decide("refused")}
          style={{
            ...buttonBase,
            background: "transparent",
            color: "#FDFAF5",
            border: "1.5px solid rgba(253,250,245,0.5)",
          }}
        >
          {isFR ? "Refuser" : "Decline"}
        </button>
        <button
          onClick={() => decide("accepted")}
          style={{
            ...buttonBase,
            background: "#C8813A",
            color: "#FDFAF5",
            border: "1.5px solid #C8813A",
          }}
        >
          {isFR ? "Accepter" : "Accept"}
        </button>
      </div>
    </div>
  );
}

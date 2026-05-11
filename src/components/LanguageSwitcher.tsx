"use client";

import { useState } from "react";

export default function LanguageSwitcher() {
  const [loading, setLoading] = useState(false);

  const switchLocale = async (locale: string) => {
    setLoading(true);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    window.location.reload();
    setLoading(false);
  };

  const currentLocale = typeof window !== "undefined"
    ? document.cookie.split(";").find(c => c.trim().startsWith("locale="))?.split("=")?.[1] || "en"
    : "en";

  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      <button
        onClick={() => switchLocale("en")}
        disabled={loading}
        style={{
          padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: ".75rem", fontWeight: 500,
          background: currentLocale === "en" ? "#3D2B1F" : "transparent",
          color: currentLocale === "en" ? "#FDFAF5" : "#7A5C44",
          transition: "all .15s",
        }}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("fr")}
        disabled={loading}
        style={{
          padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: ".75rem", fontWeight: 500,
          background: currentLocale === "fr" ? "#3D2B1F" : "transparent",
          color: currentLocale === "fr" ? "#FDFAF5" : "#7A5C44",
          transition: "all .15s",
        }}
      >
        FR
      </button>
    </div>
  );
}

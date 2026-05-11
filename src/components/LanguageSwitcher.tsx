"use client";

import { useLocale } from "@/hooks/useLocale";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {(["en", "fr"] as const).map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          style={{
            padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
            fontFamily: "inherit", fontSize: ".75rem", fontWeight: 500,
            background: locale === l ? "#3D2B1F" : "transparent",
            color: locale === l ? "#FDFAF5" : "#7A5C44",
            transition: "all .15s",
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

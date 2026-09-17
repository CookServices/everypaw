"use client";

import { useEffect, useState } from "react";
import { getTranslations, type Locale } from "@/lib/i18n";

/**
 * Le bandeau « conservez ce lien » n'apparaît que pour le créateur de la page,
 * reconnu au jeton que son navigateur a rangé à la création. Les autres
 * visiteurs ne voient que le partage et l'encart de réclamation.
 *
 * localStorage peut lever (navigation privée, stockage bloqué) : tout accès
 * est enveloppé, et la page reste correcte sans lui.
 */
export default function PublicPageActions({
  slug,
  url,
  petName,
  locale,
}: {
  slug: string;
  url: string;
  petName: string;
  locale: Locale;
}) {
  const t = getTranslations(locale).public_page;
  const [isCreator, setIsCreator] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setIsCreator(Boolean(window.localStorage.getItem(`ep_claim_${slug}`)));
    } catch {
      setIsCreator(false);
    }
  }, [slug]);

  // Déclenché sans await : une promesse attendue avant share() ferait perdre
  // l'activation utilisateur, et l'appel échouerait en silence sur mobile.
  const share = () => {
    if (navigator.share) {
      navigator.share({ title: petName, url }).catch(() => {});
      return;
    }
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: ".625rem 1.5rem",
    borderRadius: 100,
    fontSize: ".85rem",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    background: "rgba(200,129,58,.15)",
    border: "1px solid rgba(200,129,58,.3)",
    color: "#C8813A",
  } as const;

  return (
    <>
      {isCreator && (
        <div
          style={{
            background: "rgba(200,129,58,.08)",
            border: "1px solid rgba(200,129,58,.2)",
            borderRadius: 14,
            padding: "1rem 1.25rem",
            marginBottom: "2.5rem",
            fontSize: ".85rem",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            color: "rgba(247,242,234,.7)",
            textAlign: "center",
          }}
        >
          {t.creator_banner}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: ".75rem", marginBottom: "3rem" }}>
        <button type="button" onClick={share} style={pill}>
          {copied ? t.copied : t.share}
        </button>
      </div>
    </>
  );
}

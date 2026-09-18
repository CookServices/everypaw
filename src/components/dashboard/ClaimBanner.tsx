"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { parseClaimStorage } from "@/lib/public-page";

interface ClaimEntry {
  slug: string;
  token: string;
  name: string;
}

/**
 * Rattrapage pour un visiteur qui a créé une page publique avant de se
 * connecter, puis s'est inscrit ou connecté sans passer par le bouton de
 * réclamation de cette page. `localStorage` porte encore la preuve, sous la
 * clé `ep_claim_<slug>` : ce bandeau la retrouve et propose de finir le geste
 * depuis le tableau de bord.
 *
 * localStorage peut lever (navigation privée, stockage bloqué) : tout accès
 * est enveloppé, et l'absence de clé se traduit simplement par rien à
 * afficher.
 */
export default function ClaimBanner() {
  const { t } = useLocale();
  const pt = t.public_page;
  const router = useRouter();

  const [entries, setEntries] = useState<ClaimEntry[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const found: ClaimEntry[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith("ep_claim_")) continue;
        const stored = parseClaimStorage(window.localStorage.getItem(key));
        if (!stored) continue;
        found.push({ slug: key.slice("ep_claim_".length), token: stored.token, name: stored.name });
      }
    } catch {
      // Navigation privée ou stockage bloqué : rien à retrouver.
    }
    setEntries(found);
  }, []);

  if (entries.length === 0) return null;

  const current = entries[0];

  const handleClaim = async () => {
    setClaiming(true);
    setError("");
    try {
      const res = await fetch("/api/public-pages/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: current.slug, claimToken: current.token }),
      });

      if (res.ok) {
        const data = (await res.json()) as { petId?: unknown };
        try {
          window.localStorage.removeItem(`ep_claim_${current.slug}`);
        } catch {
          // Rien de plus à faire si le stockage refuse.
        }
        if (typeof data.petId === "string" && data.petId) {
          router.push(`/dashboard/pets/${data.petId}`);
        } else {
          setClaiming(false);
          setEntries((prev) => prev.filter((e) => e.slug !== current.slug));
        }
        return;
      }

      if (res.status === 409) {
        // Déjà réclamée par quelqu'un d'autre : la clé ne prouve plus rien,
        // on l'efface sans le dire et on passe à la suivante s'il y en a une.
        try {
          window.localStorage.removeItem(`ep_claim_${current.slug}`);
        } catch {
          // Rien de plus à faire si le stockage refuse.
        }
        setClaiming(false);
        setEntries((prev) => prev.filter((e) => e.slug !== current.slug));
        return;
      }

      // Autre échec (401, 403, 400, 500, réseau) : la clé reste, l'utilisateur
      // peut réessayer.
      setClaiming(false);
      if (res.status === 403) return setError(pt.claim_error_token);
      setError(pt.claim_error);
    } catch {
      setClaiming(false);
      setError(pt.claim_error);
    }
  };

  return (
    <div
      style={{
        background: "#FDFAF5",
        border: "1px solid rgba(61,43,31,.08)",
        borderRadius: 16,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: ".95rem",
          fontWeight: 600,
          color: "#3D2B1F",
          margin: 0,
        }}
      >
        {pt.claim_banner_title.replace("{name}", current.name)}
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".4rem" }}>
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          style={{
            flexShrink: 0,
            padding: ".5rem 1rem",
            borderRadius: 100,
            border: "none",
            background: "#C8813A",
            color: "#FDFAF5",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: ".8rem",
            fontWeight: 500,
            cursor: claiming ? "not-allowed" : "pointer",
            opacity: claiming ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { if (!claiming) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { if (!claiming) (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          {claiming ? pt.claiming : pt.claim_banner_cta}
        </button>
        {error && (
          <p style={{ fontSize: ".75rem", color: "#A32D2D", margin: 0, textAlign: "right", maxWidth: 260 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

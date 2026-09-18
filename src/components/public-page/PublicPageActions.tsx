"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/i18n";
import { parseClaimStorage } from "@/lib/public-page";

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
  dark,
}: {
  slug: string;
  url: string;
  petName: string;
  locale: Locale;
  dark: boolean;
}) {
  const t = getTranslations(locale).public_page;
  const router = useRouter();
  const [isCreator, setIsCreator] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const signupHref = `/auth/signup?next=${encodeURIComponent(`/p/${slug}?claim=1`)}`;

  const doClaim = async (token: string) => {
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/public-pages/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, claimToken: token }),
      });

      if (res.status === 401) {
        // La session manque : l'inscription revient ici avec `?claim=1` pour
        // relancer la réclamation sans que le visiteur ait à recliquer.
        window.location.href = signupHref;
        return;
      }

      if (!res.ok) {
        setClaiming(false);
        if (res.status === 403) return setClaimError(t.claim_error_token);
        if (res.status === 409) return setClaimError(t.claim_error_taken);
        return setClaimError(t.claim_error);
      }

      const data = (await res.json()) as { petId: string };
      router.push(`/dashboard/pets/${data.petId}`);
    } catch {
      setClaiming(false);
      setClaimError(t.claim_error);
    }
  };

  useEffect(() => {
    let stored: { token: string; name: string } | null = null;
    try {
      stored = parseClaimStorage(window.localStorage.getItem(`ep_claim_${slug}`));
    } catch {
      stored = null;
    }
    setIsCreator(Boolean(stored));
    if (stored) {
      setClaimToken(stored.token);
      // Retour d'inscription : `?claim=1` déclenche la réclamation sans clic.
      const params = new URLSearchParams(window.location.search);
      if (params.get("claim") === "1") doClaim(stored.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const soft = dark ? "rgba(247,242,234,.55)" : "#7A5C44";
  const faint = dark ? "rgba(247,242,234,.3)" : "#9A8070";
  const rule = dark ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.08)";

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

      {/* L'invitation vit en pied de page, jamais en en-tête : une pastille
          commerciale en tête d'une page de deuil se lit comme une bannière. */}
      <div style={{ textAlign: "center", borderTop: `1px solid ${rule}`, paddingTop: "3rem" }}>
        <p style={{ fontSize: "1rem", fontStyle: "italic", color: soft, marginBottom: ".75rem" }}>
          {t.claim_title}
        </p>
        <p
          style={{
            fontSize: ".85rem",
            color: faint,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            lineHeight: 1.7,
            maxWidth: 420,
            margin: "0 auto 1.5rem",
          }}
        >
          {t.claim_body}
        </p>

        {claimToken ? (
          <button
            type="button"
            onClick={() => doClaim(claimToken)}
            disabled={claiming}
            style={{ ...pill, opacity: claiming ? 0.6 : 1, border: "1px solid rgba(200,129,58,.3)" }}
          >
            {claiming ? t.claiming : t.claim_cta}
          </button>
        ) : (
          <Link href={signupHref} style={{ ...pill, textDecoration: "none" }}>
            {t.claim_cta}
          </Link>
        )}

        {claimError && (
          <div
            role="alert"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: ".85rem",
              fontFamily: "'DM Sans', sans-serif",
              maxWidth: 420,
              margin: "1rem auto 0",
            }}
          >
            {claimError}
          </div>
        )}

        <div style={{ marginTop: "2.5rem" }}>
          <Link
            href={`/contact?subject=${encodeURIComponent(`Signalement /p/${slug}`)}`}
            style={{ fontSize: ".75rem", color: faint, fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}
          >
            {t.report}
          </Link>
        </div>
      </div>
    </>
  );
}

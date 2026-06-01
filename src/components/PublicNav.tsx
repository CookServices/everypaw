"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

interface PublicNavProps {
  /** "full" shows logo + auth links; "simple" shows logo only */
  variant?: "full" | "simple";
  /** Fixed position (floating over content) — used on the landing page */
  fixed?: boolean;
}

export default function PublicNav({ variant = "simple", fixed = false }: PublicNavProps) {
  const { t } = useLocale();

  const navStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: fixed ? "1.25rem 3rem" : "1rem 2rem",
    background: "rgba(247,242,234,0.9)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(61,43,31,.08)",
    ...(fixed
      ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(247,242,234,0.88)" }
      : {}),
  };

  const logoStyle: React.CSSProperties = {
    fontFamily: "Georgia, serif",
    fontSize: fixed ? "1.25rem" : "1.1rem",
    fontWeight: 600,
    color: "#3D2B1F",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: ".4rem",
  };

  const dotSize = fixed ? 8 : 7;

  return (
    <nav style={navStyle}>
      <Link href="/" style={logoStyle}>
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: "#C8813A",
            display: "inline-block",
          }}
        />
        Everypaw
      </Link>

      {variant === "full" && (
        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <Link href="/gift" className="ep-nav-secondary" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400, padding: ".4rem .5rem" }}>
            {t.nav.give_gift}
          </Link>
          <Link href="/auth/login" className="ep-nav-secondary" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400, padding: ".4rem .75rem" }}>
            {t.nav.sign_in}
          </Link>
          <Link
            href="/auth/signup"
            style={{
              background: "#3D2B1F",
              color: "#F7F2EA",
              padding: ".5rem 1.25rem",
              borderRadius: "100px",
              fontSize: ".875rem",
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {t.nav.get_started}
          </Link>
        </div>
      )}
    </nav>
  );
}

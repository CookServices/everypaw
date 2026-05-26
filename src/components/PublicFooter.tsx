"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

interface PublicFooterProps {
  /**
   * "full"    — logo + copyright text + legal links (landing)
   * "minimal" — just "© 2025 Everypaw" (legal, contact, gift…)
   */
  variant?: "full" | "minimal";
}

export default function PublicFooter({ variant = "minimal" }: PublicFooterProps) {
  const { t } = useLocale();

  if (variant === "minimal") {
    return (
      <footer
        style={{
          padding: "1.5rem 2rem",
          background: "#3D2B1F",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: ".75rem", color: "rgba(247,242,234,.3)", margin: 0 }}>
          © {new Date().getFullYear()} Everypaw
        </p>
      </footer>
    );
  }

  // "full" variant
  const links = [
    { label: t.landing.legal_cgv,      href: "/legal/cgv" },
    { label: t.landing.legal_privacy,  href: "/legal/confidentialite" },
    { label: t.landing.legal_mentions, href: "/legal/mentions" },
    { label: t.landing.legal_contact,  href: "/contact" },
  ];

  return (
    <footer
      style={{
        padding: "2rem 3rem",
        background: "#3D2B1F",
        borderTop: "1px solid rgba(247,242,234,.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "1rem",
            color: "rgba(247,242,234,.6)",
            display: "flex",
            alignItems: "center",
            gap: ".4rem",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "rgba(247,242,234,.3)",
              display: "inline-block",
            }}
          />
          Everypaw
        </span>
        <p style={{ fontSize: ".75rem", color: "rgba(247,242,234,.3)", margin: 0 }}>
          {t.landing.footer_copy}
        </p>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(247,242,234,.06)",
          paddingTop: "1.25rem",
          display: "flex",
          flexWrap: "wrap",
          gap: ".375rem .1rem",
        }}
      >
        {links.map(({ label, href }, i) => (
          <span key={href} style={{ display: "flex", alignItems: "center", gap: ".1rem" }}>
            <Link
              href={href}
              style={{
                fontSize: ".72rem",
                color: "rgba(247,242,234,.28)",
                textDecoration: "none",
                fontWeight: 300,
                whiteSpace: "nowrap",
                padding: "0 .5rem",
              }}
            >
              {label}
            </Link>
            {i < links.length - 1 && (
              <span style={{ fontSize: ".72rem", color: "rgba(247,242,234,.12)", userSelect: "none" }}>
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </footer>
  );
}

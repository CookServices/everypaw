"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ── SVG icons (20×20, stroke-based, Tabler-style) ──────────────────────────

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h5" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.91 7.27L12 2.5 3.09 7.27M20.91 7.27L12 12.04M20.91 7.27v9.45l-8.91 4.78M3.09 7.27L12 12.04M3.09 7.27v9.45L12 21.5M12 12.04V21.5" />
      <path d="M7.5 4.89L16.41 9.66" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DashboardNav() {
  const pathname = usePathname();
  const params = useParams();
  const { locale } = useLocale();
  const petId = params?.id as string | undefined;

  const isPetPage = pathname.includes("/dashboard/pets/") && !pathname.includes("/order") && !pathname.includes("/new");
  const isOrderPage = pathname.includes("/order");
  const isSettingsPage = pathname.startsWith("/dashboard/settings");
  const isDashboard = !isPetPage && !isOrderPage && !isSettingsPage;

  const petLink = petId ? `/dashboard/pets/${petId}` : "/dashboard";
  const orderLink = petId ? `/dashboard/pets/${petId}/order` : "/dashboard";

  const isFR = locale === "fr";

  const items = [
    {
      href: "/dashboard",
      label: isFR ? "Accueil" : "Home",
      shortLabel: isFR ? "Accueil" : "Home",
      icon: <IconHome />,
      active: isDashboard,
    },
    {
      href: petLink,
      label: "Journal",
      shortLabel: "Journal",
      icon: <IconBook />,
      active: isPetPage,
    },
    {
      href: petLink,
      label: isFR ? "Histoires" : "Stories",
      shortLabel: isFR ? "Histoires" : "Stories",
      icon: <IconSparkles />,
      active: false, // visually distinct — same destination as Journal
    },
    {
      href: orderLink,
      label: isFR ? "Commander" : "Order",
      shortLabel: isFR ? "Livre" : "Book",
      icon: <IconPackage />,
      active: isOrderPage,
    },
    {
      href: "/dashboard/settings",
      label: isFR ? "Paramètres" : "Settings",
      shortLabel: isFR ? "Params" : "Settings",
      icon: <IconSettings />,
      active: isSettingsPage,
    },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // ── Sidebar (desktop ≥768px) ─────────────────────────────────────────────

  const Sidebar = (
    <aside className="ep-sidebar" style={{
      width: 220, minHeight: "100vh", position: "fixed", left: 0, top: 0, bottom: 0,
      background: "#FDFAF5", borderRight: "1px solid rgba(61,43,31,.08)",
      display: "flex", flexDirection: "column", zIndex: 40, padding: "0",
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: "1.5rem 1.25rem 1.25rem", textDecoration: "none", borderBottom: "1px solid rgba(61,43,31,.06)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "#3D2B1F" }}>Everypaw</span>
      </Link>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "1rem .75rem", display: "flex", flexDirection: "column", gap: ".25rem" }}>
        {items.map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: ".75rem",
              padding: ".625rem .75rem", borderRadius: 10, textDecoration: "none",
              background: item.active ? "rgba(200,129,58,.1)" : "transparent",
              color: item.active ? "#C8813A" : "#7A5C44",
              fontWeight: item.active ? 500 : 400,
              fontSize: ".875rem", transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => {
              if (!item.active) {
                (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)";
                (e.currentTarget as HTMLElement).style.color = "#3D2B1F";
              }
            }}
            onMouseLeave={e => {
              if (!item.active) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#7A5C44";
              }
            }}
          >
            <span style={{ flexShrink: 0, opacity: item.active ? 1 : 0.7 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom: language + logout */}
      <div style={{ padding: "1rem 1.25rem 1.5rem", borderTop: "1px solid rgba(61,43,31,.06)", display: "flex", flexDirection: "column", gap: ".75rem" }}>
        <LanguageSwitcher />
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: ".5rem",
            background: "none", border: "none", cursor: "pointer",
            fontSize: ".8rem", color: "#7A5C44", padding: ".35rem 0",
            fontFamily: "inherit", textAlign: "left",
          }}
        >
          <IconLogout />
          {isFR ? "Déconnexion" : "Sign out"}
        </button>
      </div>
    </aside>
  );

  // ── Bottom nav (mobile <768px) ───────────────────────────────────────────

  const BottomNav = (
    <nav className="ep-bottom-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
      background: "#F7F2EA", borderTop: "0.5px solid rgba(61,43,31,.12)",
      zIndex: 40, display: "flex", alignItems: "stretch",
    }}>
      {items.map(item => (
        <Link
          key={item.label}
          href={item.href}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "2px",
            textDecoration: "none", minHeight: 44,
            color: item.active ? "#C8813A" : "#7A5C44",
          }}
        >
          <span style={{ opacity: item.active ? 1 : 0.6, lineHeight: 1 }}>{item.icon}</span>
          <span style={{
            fontSize: ".6rem", fontWeight: item.active ? 600 : 400,
            letterSpacing: ".01em", lineHeight: 1,
          }}>
            {item.shortLabel}
          </span>
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {Sidebar}
      {BottomNav}
    </>
  );
}

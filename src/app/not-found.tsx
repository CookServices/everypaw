import Link from "next/link";

export const metadata = { title: "Page introuvable — Everypaw" };

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.25rem 3rem",
        background: "rgba(247,242,234,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(61,43,31,.08)",
      }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <Link href="/gift" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
            Offrir un cadeau
          </Link>
          <Link href="/auth/login" style={{ fontSize: ".875rem", color: "#7A5C44", textDecoration: "none", fontWeight: 400 }}>
            Se connecter
          </Link>
          <Link href="/auth/signup" style={{
            background: "#3D2B1F", color: "#F7F2EA",
            padding: ".5rem 1.25rem", borderRadius: "100px",
            fontSize: ".875rem", fontWeight: 500, textDecoration: "none",
          }}>
            Commencer gratuitement
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🐾</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.25rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1rem" }}>
            Page introuvable
          </h1>
          <p style={{ fontSize: "1rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300, margin: "0 0 2rem" }}>
            La page que vous cherchez n&apos;existe pas ou a été déplacée.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "#C8813A", color: "#FDFAF5",
              padding: ".75rem 2rem", borderRadius: "100px",
              fontSize: ".9rem", fontWeight: 500, textDecoration: "none",
            }}
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: "1.5rem 2rem", background: "#3D2B1F", textAlign: "center" }}>
        <p style={{ fontSize: ".75rem", color: "rgba(247,242,234,.3)", margin: 0 }}>© 2025 Everypaw</p>
      </footer>

    </div>
  );
}

import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = { title: "Page introuvable, Everypaw" };

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>

      <PublicNav variant="full" />

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
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>

      <PublicFooter variant="minimal" />

    </div>
  );
}

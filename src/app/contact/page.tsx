import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = { title: "Contact — Everypaw" };

export default function Contact() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" />

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Retour</Link>

        <div style={{ textAlign: "center", margin: "3rem 0 3.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🐾</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .75rem" }}>
            Contactez-nous
          </h1>
          <p style={{ fontSize: "1rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
            Une question, un problème ou une idée ? On vous répond en général sous 24h.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {[
            { icon: "✉️", label: "Email général", value: "hello@everypaw.app", href: "mailto:hello@everypaw.app" },
            { icon: "🛒", label: "Commandes & livraison", value: "orders@everypaw.app", href: "mailto:orders@everypaw.app" },
            { icon: "🔒", label: "Protection des données (DPO)", value: "privacy@everypaw.app", href: "mailto:privacy@everypaw.app" },
          ].map(({ icon, label, value, href }) => (
            <a key={href} href={href} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", background: "#FDFAF5", borderRadius: 16, padding: "1.25rem 1.5rem", border: "1px solid rgba(61,43,31,.08)", textDecoration: "none", transition: "border-color .15s" }}>
              <span style={{ fontSize: "1.25rem", flexShrink: 0, marginTop: 2 }}>{icon}</span>
              <div>
                <div style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, marginBottom: ".25rem" }}>{label}</div>
                <div style={{ fontSize: ".95rem", color: "#C8813A", fontWeight: 500 }}>{value}</div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ marginTop: "2.5rem" }}>
          <ContactForm />
        </div>

        <div style={{ marginTop: "2rem", background: "rgba(200,129,58,.06)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 16, padding: "1.25rem 1.5rem" }}>
          <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
            Pour toute demande relative à vos données personnelles (accès, rectification, suppression), contactez-nous à <strong style={{ color: "#3D2B1F", fontWeight: 500 }}>privacy@everypaw.app</strong> en mentionnant "Demande RGPD" en objet.
          </p>
        </div>
      </main>

      <PublicFooter variant="minimal" />
    </div>
  );
}

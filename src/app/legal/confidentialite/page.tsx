import Link from "next/link";

export const metadata = { title: "Politique de confidentialité — Everypaw" };

export default function Confidentialite() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem" }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", textDecoration: "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block" }} />
          Everypaw
        </Link>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Retour</Link>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "2rem 0 .75rem" }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Dernière mise à jour : janvier 2025</p>

        {[
          ["1. Responsable du traitement", "Everypaw est responsable du traitement de vos données personnelles. Contact : hello@everypaw.fr."],
          ["2. Données collectées", "Nous collectons : votre adresse email et mot de passe (authentification), le nom et les informations de votre animal, les entrées de journal et photos que vous publiez, les données de paiement traitées par Stripe (nous n'y avons pas accès directement), et les données d'utilisation anonymisées à des fins d'amélioration du service."],
          ["3. Finalités", "Vos données sont utilisées pour : vous fournir le service Everypaw, générer les histoires IA et les livres imprimés, vous envoyer des notifications de service (rappels hebdomadaires si activés), et prévenir la fraude."],
          ["4. Base légale", "Le traitement repose sur l'exécution du contrat (fourniture du service), votre consentement (communications marketing optionnelles), et nos intérêts légitimes (sécurité, amélioration du service)."],
          ["5. Sous-traitants", "Nous utilisons : Supabase (hébergement et base de données, UE), Stripe (paiement, certifié PCI DSS), OpenAI (génération IA, données pseudonymisées), Gelato (impression et expédition du livre)."],
          ["6. Conservation", "Vos données sont conservées pendant toute la durée de votre compte, puis supprimées dans les 30 jours suivant la fermeture, sauf obligation légale contraire."],
          ["7. Vos droits", "Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité et d'opposition. Exercez-les à hello@everypaw.fr. Vous pouvez également contacter la CNIL (www.cnil.fr)."],
          ["8. Cookies", "Nous utilisons un cookie de session pour l'authentification et un cookie de préférence de langue. Aucun cookie publicitaire ou de tracking tiers n'est utilisé."],
        ].map(([title, body]) => (
          <section key={title as string} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{title}</h2>
            <p style={{ fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300 }}>{body}</p>
          </section>
        ))}
      </main>

      <footer style={{ padding: "1.5rem 2rem", background: "#3D2B1F", textAlign: "center" }}>
        <p style={{ fontSize: ".75rem", color: "rgba(247,242,234,.3)", margin: 0 }}>© 2025 Everypaw</p>
      </footer>
    </div>
  );
}

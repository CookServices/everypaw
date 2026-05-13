import Link from "next/link";

export const metadata = { title: "Conditions générales de vente — Everypaw" };

export default function CGV() {
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
          Conditions générales de vente
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Dernière mise à jour : janvier 2025</p>

        {[
          ["1. Objet", "Les présentes conditions générales de vente régissent les relations contractuelles entre Everypaw et ses clients dans le cadre de la souscription à l'abonnement Premium et de la commande de livres imprimés."],
          ["2. Prix", "Les prix sont indiqués en euros TTC. L'abonnement Premium est facturé 4,99 € par mois ou 49 € par an. Le livre imprimé est disponible à 35 € pour les utilisateurs du plan gratuit et inclus gratuitement dans l'abonnement Premium annuel."],
          ["3. Paiement", "Le paiement est sécurisé par Stripe. Everypaw n'a accès à aucune donnée bancaire. En souscrivant à un abonnement, vous autorisez le prélèvement automatique à la date anniversaire."],
          ["4. Résiliation", "Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte. La résiliation prend effet à la fin de la période en cours. Aucun remboursement au prorata n'est effectué."],
          ["5. Droit de rétractation", "Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours pour exercer votre droit de rétractation à compter de la souscription, sauf si vous avez expressément renoncé à ce droit en accédant au service."],
          ["6. Contact", "Pour toute question relative à une commande ou à votre abonnement, contactez-nous à hello@everypaw.fr."],
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

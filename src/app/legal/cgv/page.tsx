import Link from "next/link";
import { LEGAL_LAST_UPDATE } from "@/lib/legal";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = { title: "Conditions générales de vente, Everypaw" };

const bodyStyle: React.CSSProperties = {
  fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300,
};

const sections: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. Objet",
    body: "Les présentes conditions générales de vente régissent les relations contractuelles entre Everypaw et ses clients dans le cadre de la souscription à l'abonnement Premium et de la commande de livres imprimés.",
  },
  {
    title: "2. Prix",
    body: (
      <>
        <p style={{ ...bodyStyle, margin: "0 0 .75rem" }}>
          Les prix de référence sont indiqués en euros TTC. Ils peuvent être affichés dans une autre devise lors du paiement selon votre localisation, le montant en euros faisant foi. Deux formules Premium sont disponibles :
        </p>
        <ul style={{ margin: "0 0 .75rem", paddingLeft: "1.25rem" }}>
          <li style={{ ...bodyStyle, marginBottom: ".4rem" }}>
            <strong>Premium Digital</strong> : 4,99 € par mois.
          </li>
          <li style={bodyStyle}>
            <strong>Premium Print</strong> : 79 € par an.
          </li>
        </ul>
        <p style={{ ...bodyStyle, margin: 0 }}>
          Le livre imprimé est inclus dans l&apos;abonnement Premium Print annuel. Pour les autres plans, il peut être commandé à l&apos;unité ; son prix est calculé en fonction du nombre de pages et affiché avant paiement.
        </p>
      </>
    ),
  },
  {
    title: "3. Paiement",
    body: "Le paiement est sécurisé par Stripe. Everypaw n'a accès à aucune donnée bancaire. En souscrivant à un abonnement, vous autorisez le prélèvement automatique à la date anniversaire.",
  },
  {
    title: "4. Résiliation",
    body: "Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte. La résiliation prend effet à la fin de la période en cours. Aucun remboursement au prorata n'est effectué.",
  },
  {
    title: "5. Droit de rétractation",
    body: "Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours pour exercer votre droit de rétractation à compter de la souscription, sauf si vous avez expressément renoncé à ce droit en accédant au service.",
  },
  {
    title: "6. Contact",
    body: "Pour toute question relative à une commande ou à votre abonnement, contactez-nous à orders@everypaw.app.",
  },
];

export default function CGV() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>Retour</Link>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "2rem 0 .75rem" }}>
          Conditions générales de vente
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Dernière mise à jour : {LEGAL_LAST_UPDATE}</p>

        {sections.map(({ title, body }) => (
          <section key={title} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{title}</h2>
            {typeof body === "string" ? (
              <p style={bodyStyle}>{body}</p>
            ) : (
              <div>{body}</div>
            )}
          </section>
        ))}
      </main>

      <PublicFooter variant="minimal" />
    </div>
  );
}

import Link from "next/link";
import { LEGAL_LAST_UPDATE } from "@/lib/legal";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = { title: "Mentions légales , Everypaw" };

export default function Mentions() {
  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>
      <PublicNav variant="simple" />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 2rem 6rem" }}>
        <Link href="/" style={{ fontSize: ".85rem", color: "#7A5C44", textDecoration: "none" }}>← Retour</Link>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 600, color: "#3D2B1F", margin: "2rem 0 .75rem" }}>
          Mentions légales
        </h1>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: ".5rem" }}>Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique.</p>
        <p style={{ fontSize: ".85rem", color: "#7A5C44", marginBottom: "3rem" }}>Dernière mise à jour : {LEGAL_LAST_UPDATE}</p>

        {[
          ["Éditeur du site", "Everypaw\nEmail : hello@everypaw.app\nSite web : www.everypaw.app"],
          ["Hébergement", "Le site est hébergé par Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis.\nLes données sont stockées via Supabase, dont les serveurs sont localisés en Union Européenne (région eu-west-1)."],
          ["Propriété intellectuelle", "L'ensemble du contenu de ce site (textes, graphismes, logotypes, icônes, images) est la propriété exclusive d'Everypaw et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, est interdite sans autorisation préalable écrite."],
          ["Contenu utilisateur", "Les entrées de journal, photos et histoires créées par les utilisateurs restent leur propriété. En les publiant sur Everypaw, vous accordez à Everypaw une licence limitée pour les stocker et les utiliser uniquement afin de vous fournir le service (génération d'histoires IA, impression du livre)."],
          ["Limitation de responsabilité", "Everypaw met tout en œuvre pour assurer la disponibilité et la sécurité du service, mais ne saurait être tenu responsable d'une interruption de service, d'une perte de données ou d'un dommage indirect résultant de l'utilisation du site."],
          ["Droit applicable", "Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents."],
        ].map(([title, body]) => (
          <section key={title as string} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", marginBottom: ".5rem" }}>{title}</h2>
            <p style={{ fontSize: ".95rem", color: "#7A5C44", lineHeight: 1.75, fontWeight: 300, whiteSpace: "pre-line" }}>{body}</p>
          </section>
        ))}
      </main>

      <PublicFooter variant="minimal" />
    </div>
  );
}

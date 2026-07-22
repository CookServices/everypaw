import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("livre-souvenir-premiere-annee-chiot")!;

export const metadata: Metadata = {
  title: `${post.title} | Everypaw`,
  description: post.description,
  alternates: {
    canonical: `/fr/blog/${post.slug}`,
    languages: { en: `/blog/${post.slugEn}`, fr: `/fr/blog/${post.slug}`, "x-default": `/blog/${post.slugEn}` },
  },
  robots: post.published ? undefined : { index: false, follow: false },
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  datePublished: post.datePublished,
  author: { "@type": "Organization", name: "Everypaw", url: "https://everypaw.app" },
  publisher: {
    "@type": "Organization",
    name: "Everypaw",
    logo: { "@type": "ImageObject", url: "https://everypaw.app/og-image.png" },
  },
};

export default function Page() {
  return (
    <>
      {post.published && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSONLD) }} />
      )}
      <ArticleLayout post={post} locale="fr">
        <p>
          La première année d&rsquo;un chiot, ce sont douze mois de premières fois si serrées les unes contre les
          autres qu&rsquo;on ne voit pas les changements pendant qu&rsquo;ils se produisent. Les pattes arrêtent
          d&rsquo;être trop grandes. Les nuits deviennent plus calmes. Le mâchouillage s&rsquo;arrête. Finalement. Et
          parce que vous êtes là chaque jour, votre mémoire lisse tout ça. C&rsquo;est pour ça que tant de
          propriétaires regardent des photos du deuxième mois un an plus tard et pensent : j&rsquo;avais déjà oublié
          qu&rsquo;il ait pu être aussi petit.
        </p>
        <p>
          Un livre souvenir de première année, c&rsquo;est comment garder les versions de lui qui n&rsquo;ont existé
          que quelques semaines à la fois. Voici un guide mois par mois de ce qui vaut la peine d&rsquo;être capturé,
          quoi écrire, et comment en faire un vrai livre à la fin.
        </p>

        <h2>Avant même son arrivée</h2>
        <p>
          Ce guide se concentre sur les chiots, mais si vous venez de ramener un chaton, la même approche mois par
          mois s&rsquo;applique. Le <a href="/fr/blog/livre-souvenir-chat">guide du livre souvenir pour chat</a>
          couvre ce qui est différent pour capturer la première année d&rsquo;un chat, et le{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chaton">guide de la première année du chaton</a> détaille la
          même structure mois par mois, pensée spécifiquement pour les chats.
        </p>
        <p>Le livre commence avant l&rsquo;arrivée du chiot. Capturez, tant que c&rsquo;est encore frais :</p>
        <ul>
          <li>Le jour où vous avez décidé. Qu&rsquo;est-ce qui a fait pencher la balance : la conversation, la photo, la visite ?</li>
          <li>Comment vous l&rsquo;avez trouvé : la portée, l&rsquo;annonce du refuge, l&rsquo;ami d&rsquo;un ami.</li>
          <li>La photo qui a scellé la décision.</li>
          <li>Le trajet du retour : qui le tenait, s&rsquo;il a pleuré ou dormi, de quoi vous avez parlé.</li>
          <li>La liste des noms perdants, et pourquoi.</li>
        </ul>

        <h2>Mois 1-2 : l&rsquo;atterrissage</h2>
        <p>
          Tout est une première fois en ce moment, ce qui rend paradoxalement cette période la plus facile à
          sous-documenter : vous êtes trop occupé à la vivre.
        </p>
        <ul>
          <li>Racontez la première nuit honnêtement, insomnies incluses. Ces passages deviennent les meilleures pages plus tard.</li>
          <li>La première visite chez le vétérinaire, et le poids. Notez le chiffre ; vous voudrez la comparaison au douzième mois.</li>
          <li>L&rsquo;histoire du nom : ce que vous avez failli l&rsquo;appeler, et qui a mis son veto.</li>
          <li>Où il dort par rapport à où il est &laquo;&nbsp;censé&nbsp;&raquo; dormir, et combien de temps la politique officielle a tenu.</li>
        </ul>

        <h2>Mois 3-4 : le monde s&rsquo;ouvre</h2>
        <ul>
          <li>Les premières promenades en laisse. (Spoiler : ce ne sont pas encore des promenades. Décrivez ce que c&rsquo;était vraiment.)</li>
          <li>Premières rencontres : autres chiens, enfants, escaliers, pluie, aspirateur.</li>
          <li>
            Les pertes de la période de dentition : gardez une liste des victimes (chaussures, pieds de chaise, un
            coin très précis d&rsquo;un tapis) et photographiez les preuves. C&rsquo;est drôle plus tard, promis.
          </li>
          <li>Le premier ordre qui a fonctionné, et la friandise exacte qui a fait le déclic.</li>
        </ul>

        <h2>Mois 5-6 : à moitié grand, entièrement chaotique</h2>
        <ul>
          <li>
            La croissance est visible presque semaine après semaine maintenant ; c&rsquo;est la fenêtre idéale pour
            les photos de comparaison de taille décrites plus bas.
          </li>
          <li>
            L&rsquo;adolescence frappe : l&rsquo;ouïe sélective commence. Notez exactement ce qu&rsquo;il a
            &laquo;&nbsp;oublié&nbsp;&raquo; et quand.
          </li>
          <li>Le jour où le lit ou la caisse est officiellement devenu trop petit.</li>
          <li>Nouveaux sons : le jour où le petit bruit de chiot est devenu un vrai aboiement.</li>
        </ul>

        <h2>Mois 7-9 : la personnalité se fixe</h2>
        <ul>
          <li>
            Les manies qui apparaissent maintenant sont en grande partie celles de votre chien adulte. Notez-les
            pendant qu&rsquo;elles se forment : la position sur le canapé, le rituel d&rsquo;accueil, l&rsquo;opinion
            sur le courrier.
          </li>
          <li>Les routines qu&rsquo;il a inventées, pas vous.</li>
          <li>Les victoires d&rsquo;éducation, et les négociations encore ouvertes.</li>
          <li>Son premier changement de saison : première neige, première canicule, premier tas de feuilles.</li>
        </ul>

        <h2>Mois 10-12 : presque adulte</h2>
        <ul>
          <li>Les moments calmes commencent à apparaître. Notez la première fois qu&rsquo;il reste allongé contre vous pendant tout un film.</li>
          <li>Avant-après : recréez deux ou trois photos des premières semaines, même endroit, même angle.</li>
          <li>Le premier anniversaire : comment vous l&rsquo;avez marqué, ce qu&rsquo;il a reçu, qui est venu.</li>
          <li>Une courte lettre pour ses un an. Vous en écrirez une autre à deux ans, et serez content d&rsquo;avoir commencé.</li>
        </ul>

        <h2>Idées de photos qui traversent le temps</h2>
        <ul>
          <li>
            Le même endroit, chaque mois. Choisissez un endroit de votre maison, même angle, douze photos. Cette
            série à elle seule justifie tout le projet.
          </li>
          <li>
            Une référence de taille fixe. Photographiez-le chaque mois à côté du même jouet ou objet. Voir le jouet
            &laquo;&nbsp;rétrécir&nbsp;&raquo; est la preuve la plus claire de sa croissance.
          </li>
          <li>Sa patte dans votre main, au premier mois et au douzième.</li>
          <li>Les archives du sommeil. Les positions évoluent énormément sur une première année. Documentez généreusement.</li>
          <li>Gardez les photos imparfaites. Le flou signifie le mouvement, et le mouvement signifie chiot.</li>
        </ul>

        <h2>Que noter quand &laquo;&nbsp;il ne s&rsquo;est rien passé&nbsp;&raquo;</h2>
        <p>
          La plupart des jours d&rsquo;une première année ne sont pas des étapes marquantes, mais &laquo;&nbsp;une
          journée ordinaire à cinq mois&nbsp;&raquo; est exactement la page que vous ne pourrez jamais recréer plus
          tard. Une phrase suffit : ce qu&rsquo;il a fait pendant que vous cuisiniez, le son qu&rsquo;il a fait à la
          fenêtre, comment il a demandé à jouer. Si vous êtes bloqué, gardez une liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> à portée de main, et empruntez
          des structures de page à ces{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a>.
        </p>

        <h2>Transformer douze mois en un vrai livre</h2>
        <p>
          Voici l&rsquo;échec classique : des centaines de photos, zéro note, et un projet d&rsquo;assemblage
          &laquo;&nbsp;un jour&nbsp;&raquo; qui n&rsquo;arrive jamais. La solution est de construire le livre au fil
          de l&rsquo;eau, une phrase ou deux par moment, écrite quand il se produit, pour qu&rsquo;au premier
          anniversaire l&rsquo;histoire existe déjà et n&rsquo;ait plus qu&rsquo;à être imprimée. Pour les principes
          généraux d&rsquo;un journal régulier, le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> couvre comment écrire des
          entrées qui traversent le temps, au-delà de la première année.
        </p>
        <p>
          C&rsquo;est exactement pour ça qu&rsquo;Everypaw existe : vous notez les petits moments, l&rsquo;IA les
          transforme en chapitres d&rsquo;histoire mensuels, et la première année devient un livre relié imprimé que
          vous pouvez vraiment poser sur une étagère. Livre ou pas, écrivez l&rsquo;entrée de ce soir. La petite
          version de lui est déjà en train de partir.
        </p>
      </ArticleLayout>
    </>
  );
}

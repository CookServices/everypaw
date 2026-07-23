import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("application-journal-vs-livre-photo")!;

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
          Vous voulez garder les souvenirs de votre animal. Vous avez deux options évidentes : télécharger une
          application de journal et commencer à écrire, ou charger vos photos sur un service de livre photo et
          commander une impression. Les deux prétendent préserver ce qui compte. Mais ils préservent des choses très
          différentes, et choisir le mauvais pour votre intention signifie finir avec un produit qui semble
          incomplet.
        </p>
        <p>
          Voici un comparatif de ce que chaque approche capture, ce qu&rsquo;elle manque, et où les deux se
          recoupent.
        </p>

        <h2>Ce que vous offre un service de livre photo</h2>
        <p>
          Des services comme Shutterfly, Mixbook, ou Chatbooks vous permettent de charger des photos, de les
          organiser sur des modèles, d&rsquo;ajouter des légendes, et de commander un livre imprimé. Le résultat est
          beau et tangible. Vous obtenez un objet physique sur votre étagère.
        </p>
        <p>
          La force, c&rsquo;est l&rsquo;impact visuel. Un livre photo bien fait capture à quoi ressemblait votre
          animal à chaque étape : le duvet de chiot, la première neige, le jardin à la lumière dorée. Si votre
          objectif est un registre visuel, les livres photo tiennent leur promesse.
        </p>
        <p>
          La faiblesse, c&rsquo;est le contexte. Une photo de votre chien sur le canapé est une photo de votre chien
          sur le canapé. Sans légende, le vous du futur ne saura pas que c&rsquo;était le premier jour où elle a
          réclamé cette place, ou que c&rsquo;était juste après un orage, ou qu&rsquo;elle venait de voler une
          chaussette et faisait semblant d&rsquo;être innocente. Et en pratique, la plupart des gens sautent les
          légendes. Le projet d&rsquo;assemblage est déjà assez exigeant sans avoir à écrire des phrases pour chacune
          des soixante photos sélectionnées.
        </p>
        <p>
          L&rsquo;autre faiblesse, c&rsquo;est l&rsquo;assemblage lui-même. Les services de livre photo demandent une
          session dédiée : sélectionner les photos, les charger, choisir une mise en page, écrire des légendes,
          relire, commander. La plupart des gens ont l&rsquo;intention de le faire. Le taux de complétion raconte une
          autre histoire. Les photos restent dans la pellicule, le projet &laquo;&nbsp;un jour&nbsp;&raquo; reste sur
          la liste, et le livre ne voit jamais le jour.
        </p>

        <h2>Ce que vous offre une application de journal animalier</h2>
        <p>
          Une application de journal (qu&rsquo;il s&rsquo;agisse d&rsquo;une application animalière dédiée comme
          Everypaw, ou d&rsquo;une application de notes générale) capture des mots : ce qui s&rsquo;est passé,
          pourquoi ça comptait, ce que ça faisait ressentir. La force, c&rsquo;est l&rsquo;histoire. Une entrée de
          journal d&rsquo;un mardi ordinaire, écrite en trente secondes, préserve exactement le genre
          d&rsquo;information que les photos ne peuvent pas : le son qu&rsquo;il faisait, la routine qu&rsquo;il avait
          inventée, la façon dont il réclamait son dîner.
        </p>
        <p>
          La barrière à l&rsquo;entrée est aussi plus basse. Une phrase est une entrée de journal complète. Vous
          pouvez l&rsquo;écrire sur votre téléphone pendant que votre chien prend son petit-déjeuner. Pas
          d&rsquo;étape de chargement, pas de décision de mise en page, pas de processus de commande.
        </p>
        <p>
          La faiblesse, c&rsquo;est le visuel. Un journal sans photos, c&rsquo;est du texte. Il préserve le sens mais
          pas l&rsquo;apparence. Si vous voulez voir à quoi ressemblaient les pattes de votre chaton à huit semaines,
          les mots seuls n&rsquo;y suffisent pas.
        </p>
        <p>
          L&rsquo;autre différence, c&rsquo;est le format de sortie. La plupart des applications de journal
          produisent un registre numérique : une liste d&rsquo;entrées que vous pouvez faire défiler. Certaines,
          comme Everypaw, vont plus loin : l&rsquo;IA transforme vos entrées en chapitres d&rsquo;histoire mensuels,
          et ces chapitres deviennent un livre relié imprimé en fin d&rsquo;année, ce qui comble l&rsquo;écart entre
          journal et produit physique.
        </p>

        <h2>Ce que chacun manque</h2>
        <p>
          Un livre photo sans mots capture l&rsquo;apparence sans le sens. Dans cinq ans, vous regarderez les photos
          et ressentirez quelque chose, mais vous ne vous souviendrez pas des détails. Le contexte a disparu.
        </p>
        <p>
          Un journal sans photos capture le sens sans l&rsquo;apparence. Vous vous souviendrez qu&rsquo;elle avait
          peur de l&rsquo;aspirateur jusqu&rsquo;en mars, mais vous ne verrez pas la tête qu&rsquo;elle faisait.
        </p>
        <p>
          Aucune des deux approches, seule, ne capture l&rsquo;histoire complète. La version complète a les deux :
          l&rsquo;image et la phrase qui l&rsquo;explique.
        </p>

        <h2>La vraie comparaison</h2>
        <p>La question n&rsquo;est pas quel format est meilleur. C&rsquo;est quelle habitude vous allez vraiment tenir.</p>
        <p>
          <strong>Choisissez un service de livre photo si :</strong> vous prenez déjà beaucoup de photos, vous aimez
          le travail de mise en page et de design, et vous êtes prêt à bloquer une demi-journée pour assembler le
          livre. Si vous êtes le genre de personne qui termine ses projets de scrapbooking, un service de livre
          photo produira quelque chose de superbe. Ajoutez des légendes. Datez tout. Le vous du futur vous
          remerciera.
        </p>
        <p>
          <strong>Choisissez une application de journal si :</strong> vous voulez la friction la plus basse
          possible, vous êtes plus enclin à écrire une phrase qu&rsquo;à organiser un album, et vous accordez plus de
          valeur à l&rsquo;histoire derrière la photo qu&rsquo;à la photo elle-même. Si vous ne savez pas quoi
          écrire, la liste des{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> vous fait passer la page
          blanche immédiatement.
        </p>
        <p>
          <strong>Choisissez les deux si :</strong> vous voulez le tableau complet. Utilisez une application de
          journal pour les moments et les mots du quotidien, et un service de livre photo pour les étapes visuelles.
          Ils se complètent bien parce qu&rsquo;ils capturent des choses différentes.
        </p>

        <h2>Où Everypaw se situe</h2>
        <p>
          Everypaw se situe à l&rsquo;intersection des deux : vous notez les mots au quotidien (une phrase suffit),
          l&rsquo;IA les transforme en chapitres d&rsquo;histoire mensuels, et ces chapitres deviennent un livre
          relié imprimé. C&rsquo;est un journal avec le résultat d&rsquo;un service de livre, sans le projet
          d&rsquo;assemblage.
        </p>
        <p>
          Il ne remplace pas un livre photo si votre objectif principal est un album visuel. Mais si votre objectif
          est un registre écrit de la vie de votre animal qui se transforme en livre physique sans exiger une
          session d&rsquo;assemblage dédiée, il comble l&rsquo;écart entre les deux catégories.
        </p>
        <p>
          Pour en savoir plus sur la construction d&rsquo;une habitude de journal, le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal souvenir animalier</a> couvre la
          fréquence et le format. Pour des idées de pages et de chapitres précis quel que soit l&rsquo;outil
          utilisé, les{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a> et le{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chaton">guide de la première année du chaton</a> proposent
          des structures qui fonctionnent dans n&rsquo;importe quel support.
        </p>

        <h2>Le seul mauvais choix</h2>
        <p>
          Le seul mauvais choix, c&rsquo;est celui que vous n&rsquo;utilisez pas. Un magnifique service de livre
          photo jamais assemblé ne préserve rien. Une application de journal ouverte une fois puis oubliée ne
          préserve rien. Choisissez l&rsquo;approche qui correspond à vos habitudes réelles, pas à vos aspirations,
          et commencez aujourd&rsquo;hui. Les souvenirs s&rsquo;estompent déjà.
        </p>
      </ArticleLayout>
    </>
  );
}

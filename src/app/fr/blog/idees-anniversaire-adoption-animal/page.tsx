import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("idees-anniversaire-adoption-animal")!;

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
          Le jour de l&rsquo;adoption, parfois appelé &laquo;&nbsp;Gotcha Day&nbsp;&raquo;, est l&rsquo;anniversaire
          du jour où votre animal est arrivé chez vous. Pour les animaux adoptés ou sauvés, c&rsquo;est souvent le
          seul &laquo;&nbsp;anniversaire&nbsp;&raquo; que vous ayez, la date de naissance réelle étant inconnue ou
          approximative. Mais même si vous connaissez sa date de naissance, ce jour-là marque autre chose&nbsp;: le
          jour où vous vous êtes choisis l&rsquo;un l&rsquo;autre.
        </p>
        <p>
          Voici dix façons de le célébrer, du geste simple au plus sentimental, plus l&rsquo;habitude qui transforme
          une célébration en quelque chose que vous garderez pour toujours.
        </p>

        <h2>1. Recréez la première photo</h2>
        <p>
          Retrouvez la plus ancienne photo que vous avez de lui et recréez-la&nbsp;: même endroit, même angle, même
          pose s&rsquo;il veut bien coopérer. Mettez les deux photos côte à côte. Le contraste est toujours plus
          frappant qu&rsquo;on ne l&rsquo;imagine, surtout après la première année. Si vous faites ça chaque année,
          vous avez déjà une série qui mérite d&rsquo;être encadrée.
        </p>

        <h2>2. Retournez là où vous vous êtes rencontrés</h2>
        <p>
          Retournez au refuge, chez l&rsquo;éleveur, sur le parking où l&rsquo;échange a eu lieu, ou chez l&rsquo;ami
          où vous l&rsquo;avez vu pour la première fois. Si vous le pouvez, emmenez-le. Si l&rsquo;endroit est trop
          loin ou n&rsquo;existe plus, regardez-le sur une carte ensemble (il s&rsquo;en fichera, mais pas vous) et
          notez ce dont vous vous souvenez de ce jour pendant que le retour rend tout plus vif.
        </p>

        <h2>3. La sortie de l&rsquo;anniversaire d&rsquo;adoption</h2>
        <p>
          Emmenez-le quelque part de spécial&nbsp;: son sentier préféré, une plage qu&rsquo;il adore, un parc où il
          n&rsquo;est jamais allé. Laissez-le mener la balade. Le but n&rsquo;est pas la destination&nbsp;; c&rsquo;est
          de lui offrir une journée organisée autour de ce qu&rsquo;il aime, pas de ce que vous devez faire.
        </p>

        <h2>4. Une nouvelle version de son premier jouet</h2>
        <p>
          Si vous vous souvenez de son premier jouet (ou du premier qu&rsquo;il a choisi), retrouvez le même ou ce qui
          s&rsquo;en rapproche le plus. Le voir réagir à un jouet à la fois nouveau et familier, c&rsquo;est un petit
          voyage dans le temps.
        </p>

        <h2>5. Le portrait de l&rsquo;anniversaire</h2>
        <p>
          Une photo réfléchie, prise le même jour chaque année. Pas forcément un selfie (même si ça marche aussi)&nbsp;:
          une photo qui montre qui il est en ce moment précis. Encadrez-la ou ajoutez-la à une collection. Après
          trois ou quatre ans, la série devient l&rsquo;une des choses les plus précieuses que vous possédiez.
        </p>

        <h2>6. La lettre annuelle</h2>
        <p>
          Écrivez-lui une courte lettre&nbsp;: ce qui s&rsquo;est passé cette année, ce qui a changé, ce qui est resté
          pareil, une chose pour laquelle vous êtes reconnaissant. Vous n&rsquo;avez besoin de la montrer à personne.
          Datez-la et gardez-la quelque part où vous ne la perdrez pas. Ces lettres deviennent, sans qu&rsquo;on
          s&rsquo;en rende compte, un journal de votre propre vie, racontée à travers la sienne.
        </p>

        <h2>7. Un repas spécial</h2>
        <p>
          Laissez-le avoir la chose qu&rsquo;il veut toujours et qu&rsquo;il n&rsquo;obtient presque jamais. Les
          bonnes friandises, le morceau de table longtemps interdit, la pâtée de luxe qu&rsquo;il a eue une fois chez
          le vétérinaire et qu&rsquo;il n&rsquo;a jamais oubliée. Un jour par an, les règles se plient. Il s&rsquo;en
          souviendra (et vous aussi).
        </p>

        <h2>8. Un don en son nom</h2>
        <p>
          Faites un don au refuge ou à l&rsquo;association d&rsquo;où il vient, ou à toute organisation animalière qui
          vous tient à cœur. Pas besoin que ce soit une grosse somme. Si possible, gardez le même montant chaque
          année, lié à cet anniversaire. Le don devient alors une part de la tradition.
        </p>

        <h2>9. Racontez l&rsquo;histoire</h2>
        <p>
          Publiez-la, racontez-la à table, envoyez-la par message à l&rsquo;ami qui était là. L&rsquo;histoire de la
          façon dont vous avez trouvé votre animal est l&rsquo;une des meilleures histoires que vous ayez, et cet
          anniversaire est le moment naturel pour la raconter. Incluez les parties que vous sautez d&rsquo;habitude&nbsp;:
          le doute, la logistique, le moment où ça a cessé d&rsquo;être une décision pour devenir une évidence.
        </p>

        <h2>10. Invitez ses proches</h2>
        <p>
          Si votre animal a un meilleur ami (humain ou animal), incluez-le. Une petite fête pour l&rsquo;occasion peut
          être aussi simple qu&rsquo;une promenade avec le chien du voisin avec qui il joue depuis la première
          semaine, ou une visite de la personne qui l&rsquo;a accueilli en famille d&rsquo;accueil. Les relations
          comptent autant que les étapes marquantes.
        </p>

        <h2>L&rsquo;habitude qui fait durer tout ça</h2>
        <p>
          Toutes ces idées créent des moments. Mais les moments s&rsquo;effacent si on ne les écrit pas. La tradition
          qui tient le mieux dans le temps est la plus simple&nbsp;: après la sortie, la friandise, ou la photo,
          asseyez-vous et écrivez quelques phrases sur la façon dont la journée s&rsquo;est passée et sur ce qui a
          changé chez votre animal depuis un an.
        </p>
        <p>
          Si vous tenez un journal animalier, ces entrées annuelles en deviennent la colonne vertébrale. La liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> contient des questions conçues
          exactement pour ces moments de réflexion (essayez le prompt 30&nbsp;: &laquo;&nbsp;Comment avez-vous célébré
          son dernier anniversaire ou son adoption&nbsp;?&nbsp;&raquo;). Et si vous construisez un{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">livre souvenir pour chien</a> ou un{" "}
          <a href="/fr/blog/livre-souvenir-chat">livre souvenir pour chat</a>, la photo et la lettre annuelles de
          cet anniversaire comptent parmi les pages les plus fortes que vous puissiez inclure.
        </p>
        <p>
          Everypaw repère automatiquement ces anniversaires et vous envoie un rappel, pour que la tradition ne dépende
          pas de votre mémoire. Mais quelle que soit votre méthode, la clé, c&rsquo;est la régularité. Une photo, un
          paragraphe, une fois par an. Au bout de cinq ans, vous aurez quelque chose qu&rsquo;aucun défilement de
          pellicule photo ne pourrait reproduire.
        </p>
      </ArticleLayout>
    </>
  );
}

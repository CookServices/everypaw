import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("livre-souvenir-chien-senior")!;

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
          Il existe une version de votre chien qui n&rsquo;existe qu&rsquo;en ce moment précis&nbsp;: le museau
          grisonnant, les escaliers plus lents, les soupirs plus profonds, ce regard qu&rsquo;il vous lance depuis
          l&rsquo;autre bout de la pièce et qu&rsquo;il ne vous donnait jamais quand il était jeune, parce
          qu&rsquo;il était trop occupé à être jeune. Cette version est plus silencieuse, et c&rsquo;est celle qui
          vous manquera de façons que vous ne pouvez pas encore imaginer.
        </p>
        <p>
          Un livre souvenir pour chien senior, ce n&rsquo;est pas se préparer à la fin. C&rsquo;est faire attention à
          qui il est maintenant, pendant que ce moment existe encore. Voici quoi capturer, comment le capturer, et
          pourquoi les jours ordinaires comptent davantage dans ce chapitre que dans tous les autres.
        </p>

        <h2>Pourquoi les années seniors sont les plus difficiles à documenter</h2>
        <p>
          Quand votre chien était chiot, tout était une première fois. Les étapes étaient évidentes, les changements
          visibles semaine après semaine, et vous preniez sans doute dix photos par jour. Les années seniors,
          c&rsquo;est l&rsquo;inverse&nbsp;: les changements sont lents, les jours se ressemblent, et l&rsquo;appareil
          photo reste dans la poche parce qu&rsquo;il ne semble rien se passer.
        </p>
        <p>
          Mais quelque chose se passe. Le coin sieste s&rsquo;est rapproché de vous. La promenade a raccourci
          d&rsquo;un pâté de maisons. L&rsquo;accueil à la porte garde le même enthousiasme, avec moins de sauts. Ces
          glissements racontent l&rsquo;histoire d&rsquo;un chien qui s&rsquo;installe dans la version la plus
          profonde de lui-même, et ce sont exactement les choses qui disparaissent en premier de la mémoire.
        </p>

        <h2>Quoi écrire</h2>

        <h3>La routine telle qu&rsquo;elle est aujourd&rsquo;hui</h3>
        <p>
          Cartographiez une journée type, heure par heure. Où il dort le matin. Combien de temps avant qu&rsquo;il
          demande à sortir. Le rythme de la promenade. Ce qu&rsquo;il fait l&rsquo;après-midi. À quelle heure il
          s&rsquo;installe pour la nuit. Faites cet exercice une fois, puis à nouveau six mois plus tard. La
          comparaison vous surprendra, et les deux versions compteront.
        </p>

        <h3>Ce qui n&rsquo;a pas changé</h3>
        <p>
          La chose qu&rsquo;il fait encore exactement comme à deux ans&nbsp;: le coup de queue au sac de friandises,
          l&rsquo;aboiement précis au passage du facteur, sa façon de se positionner sur le canapé. Ces habitudes qui
          traversent le temps sont le fil entre le chiot et le senior, et les écrire, c&rsquo;est garder ce fil
          visible.
        </p>

        <h3>La nouvelle tendresse</h3>
        <p>
          Les chiens seniors développent une forme de douceur que les jeunes chiens n&rsquo;ont pas. L&rsquo;appui
          plus lent contre votre jambe. La façon dont il vous regarde quitter une pièce. Le contact visuel plus long.
          Ce n&rsquo;est pas un déclin&nbsp;; c&rsquo;est de la profondeur. Écrivez-en pour ce que c&rsquo;est
          vraiment.
        </p>

        <h3>Les aménagements</h3>
        <p>
          La rampe que vous avez construite pour le lit. Les promenades raccourcies. La nourriture plus douce. La
          façon dont vous le portez maintenant dans les escaliers que vous couriez ensemble autrefois. Ces adaptations
          sont des actes d&rsquo;amour, et elles méritent leur place dans le livre autant que n&rsquo;importe quelle
          étape marquante.
        </p>

        <h3>Les chapitres vétérinaires</h3>
        <p>
          Écrivez sur les visites chez le vétérinaire. Pas les détails médicaux (ça, c&rsquo;est pour le dossier),
          mais comment il a réagi, comment vous avez réagi, ce que le vétérinaire a dit et que vous voulez retenir, et
          le trajet du retour. Ces entrées sont difficiles à écrire. Ce sont parmi les plus précieuses que vous aurez.
        </p>

        <h2>Des photos qui capturent ce chapitre</h2>
        <ul>
          <li>
            <strong>Les portraits en train de dormir.</strong> Les chiens seniors dorment plus, et plus paisiblement.
            Photographiez-les au repos. Ces photos semblent banales aujourd&rsquo;hui et deviendront irremplaçables
            plus tard.
          </li>
          <li>
            <strong>Le gris.</strong> Le museau, les sourcils, les pattes. Photographiez le gris intentionnellement,
            avec une bonne lumière. C&rsquo;est beau, et vous voudrez le revoir.
          </li>
          <li>
            <strong>La promenade, à son rythme.</strong> Demandez à quelqu&rsquo;un de vous photographier en train de
            marcher ensemble, de dos. Le rythme, la proximité, le mou de la laisse&nbsp;: ça raconte toute
            l&rsquo;histoire.
          </li>
          <li>
            <strong>Avant et maintenant.</strong> Si vous avez des photos prises au même endroit il y a plusieurs
            années, recréez-les. Même angle, même lieu. La paire dit ce que les mots ne peuvent pas.
          </li>
          <li>
            <strong>Le coin.</strong> Quel que soit son coin principal aujourd&rsquo;hui (le lit, le tapis, l&rsquo;angle
            du canapé), photographiez-le avec lui dedans, et sans lui. Les deux versions comptent.
          </li>
        </ul>

        <h2>Comment structurer le livre</h2>
        <p>
          Un livre souvenir pour chien senior n&rsquo;a pas besoin d&rsquo;une structure chronologique. Les années
          dorées fonctionnent mieux organisées par thème&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Un chapitre sur les routines.</strong> Le rythme quotidien actuel, documenté avec amour.
          </li>
          <li>
            <strong>Un chapitre sur son histoire.</strong> Le résumé de sa vie jusqu&rsquo;ici&nbsp;: d&rsquo;où il
            vient, les foyers qu&rsquo;il a connus, les personnes qu&rsquo;il a aimées. Si vous avez besoin
            d&rsquo;aide pour rassembler tout ça, le guide pour{" "}
            <a href="/fr/blog/ecrire-histoire-de-vie-animal">écrire l&rsquo;histoire de vie d&rsquo;un animal</a>{" "}
            propose une structure qui fonctionne bien pour ce type d&rsquo;écriture rétrospective.
          </li>
          <li>
            <strong>Un chapitre sur sa personnalité.</strong> Qui il est, pleinement formé. La liste de{" "}
            <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> (en particulier les prompts
            11 à 20, sur la personnalité et les manies) est utile ici.
          </li>
          <li>
            <strong>Un chapitre sur votre lien.</strong> Ce qu&rsquo;il représente pour vous, ce qu&rsquo;il a changé
            en vous, ce que vous lui dites quand personne n&rsquo;est là. Les prompts sur &laquo;&nbsp;votre
            lien&nbsp;&raquo; (31 à 40) couvrent ce territoire.
          </li>
          <li>
            <strong>Des lettres.</strong> Une par an, ou une par saison. Selon la fréquence que vous pouvez tenir.
          </li>
        </ul>
        <p>
          Pour d&rsquo;autres idées de pages, l&rsquo;article{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a> propose des structures
          (la chronologie des surnoms, la carte de son territoire, le chapitre des bêtises) qui fonctionnent à tout
          âge.
        </p>

        <h2>Commencez par aujourd&rsquo;hui, pas par le passé</h2>
        <p>
          La tentation est de commencer par reconstituer tout ce qui a précédé. Résistez. Commencez par
          aujourd&rsquo;hui. Écrivez sur qui il est en ce moment. Photographiez-le cet après-midi. Notez la promenade
          de ce soir.
        </p>
        <p>
          Vous pourrez compléter les chapitres précédents plus tard, à partir de vos souvenirs, de vieilles photos, ou
          des personnes qui l&rsquo;ont connu. Mais la version senior, celle qui est devant vous en ce moment, ne peut
          être capturée qu&rsquo;en temps réel.
        </p>
        <p>
          Si vous ne tenez pas encore de journal, le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal souvenir animalier</a> a tout ce
          qu&rsquo;il faut pour démarrer une habitude durable&nbsp;: à quelle fréquence, combien, sous quelle forme.
          Everypaw s&rsquo;occupe du reste&nbsp;: vous écrivez les entrées, l&rsquo;IA les transforme en chapitres
          d&rsquo;histoire mensuels, et ces chapitres deviennent un livre relié imprimé. Mais le livre est secondaire.
          C&rsquo;est l&rsquo;écriture qui compte. Une phrase sur la promenade d&rsquo;aujourd&rsquo;hui, pendant que
          vous avez encore la promenade d&rsquo;aujourd&rsquo;hui.
        </p>
        <p>
          Et quand le moment viendra, si ça peut aider, l&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a> sera
          là. Mais ça, c&rsquo;est pour plus tard. Aujourd&rsquo;hui, c&rsquo;est pour le museau gris, les escaliers
          lents, et le soupir profond à côté de vous sur le canapé. Écrivez ça.
        </p>
      </ArticleLayout>
    </>
  );
}

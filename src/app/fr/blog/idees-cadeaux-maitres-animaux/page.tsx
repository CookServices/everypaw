import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("idees-cadeaux-maitres-animaux")!;

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
          Le maître d&rsquo;animal dans votre vie a déjà la laisse, le panier, le bandana assorti, et trois versions
          de la même pochette à friandises. Il n&rsquo;a pas besoin de plus d&rsquo;objets. Ce qu&rsquo;il n&rsquo;a
          presque certainement pas, c&rsquo;est un moyen de garder les souvenirs de son animal organisés, écrits, et
          à l&rsquo;abri de l&rsquo;effacement lent du temps.
        </p>
        <p>
          C&rsquo;est le vide que cette liste comble. Onze idées de cadeaux qui ne sont ni un jouet ni un accessoire
          de plus, organisées en trois catégories : ce qui capture l&rsquo;histoire de son animal, ce qui honore le
          lien, et quelques expériences qui créent de nouveaux souvenirs à noter.
        </p>

        <h2>Des cadeaux qui capturent l&rsquo;histoire</h2>

        <h3>1. Un journal souvenir pour animal</h3>
        <p>
          Un journal dédié à l&rsquo;écriture sur son animal, avec des prompts ou des pages vierges. Ça fonctionne
          particulièrement bien pour les personnes qui prennent déjà des centaines de photos mais n&rsquo;écrivent
          jamais le contexte. Le journal transforme &laquo;&nbsp;jolie photo&nbsp;&raquo; en &laquo;&nbsp;jolie
          photo, plus l&rsquo;histoire de pourquoi elle comptait&nbsp;&raquo;. Si vous voulez inclure un point de
          départ, imprimez quelques{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> et glissez-les à
          l&rsquo;intérieur de la couverture.
        </p>

        <h3>2. Un kit pour livre souvenir</h3>
        <p>
          Offrez-lui de quoi construire un <a href="/fr/blog/idees-livre-souvenir-chien">livre souvenir pour chien</a>{" "}
          ou <a href="/fr/blog/livre-souvenir-chat">livre souvenir pour chat</a> : une bonne imprimante photo, un jeu
          de stylos de qualité archive, et un album vierge à couverture rigide. L&rsquo;astuce est de
          l&rsquo;accompagner d&rsquo;un mot qui dit &laquo;&nbsp;pour les histoires derrière les photos, pas juste
          les photos&nbsp;&raquo;. Sans cette impulsion, ça devient un autre album vide.
        </p>

        <h3>3. Un abonnement à un journal animalier</h3>
        <p>
          Un abonnement à une application de journal animalier qui transforme des notes quotidiennes en quelque
          chose de durable. Everypaw, par exemple, prend des entrées d&rsquo;une phrase et les transforme en
          chapitres d&rsquo;histoire mensuels générés par IA, puis en un livre relié imprimé en fin d&rsquo;année.
          C&rsquo;est un cadeau qui se construit sur douze mois plutôt que de rester sur une étagère après un seul
          usage. Vous pouvez{" "}
          <a href="/fr/gift">offrir une année d&rsquo;Everypaw</a> directement : la personne reçoit un code, et
          commande son livre imprimé quand son journal contient une année qui mérite d&rsquo;être gardée.
        </p>

        <h3>4. Un livre photo personnalisé à partir de sa pellicule</h3>
        <p>
          Proposez de l&rsquo;aider à en assembler un. La raison pour laquelle la plupart des livres photo
          animaliers ne voient jamais le jour n&rsquo;est pas le manque de photos : c&rsquo;est le projet
          d&rsquo;assemblage. Offrez un après-midi pour vous asseoir avec lui, choisir les cinquante meilleures
          photos, ajouter des légendes, et commander une impression. Le travail, c&rsquo;est le cadeau.
        </p>

        <h3>5. Un livre souvenir de la &laquo;&nbsp;première année&nbsp;&raquo; ou des &laquo;&nbsp;années
        seniors&nbsp;&raquo;</h3>
        <p>
          S&rsquo;il a un chiot ou un chaton, un livre souvenir de la première année (structuré{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chiot">mois par mois pour les chiots</a> ou{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chaton">les chatons</a>) est un cadeau avec une chronologie
          intégrée. Pour les animaux plus âgés, la même structure fonctionne à l&rsquo;inverse : capturer les
          promenades plus lentes, le museau plus gris, les routines qui se sont approfondies avec les années.
        </p>

        <h2>Des cadeaux qui honorent le lien</h2>

        <h3>6. Un portrait à partir d&rsquo;une photo qu&rsquo;il aime</h3>
        <p>
          Commandez à un artiste (local ou en ligne) de transformer sa photo préférée en peinture, dessin, ou
          illustration numérique. Le point important : demandez quelle photo est sa préférée, ou trouvez-le
          discrètement auprès de quelqu&rsquo;un qui le saurait. Un portrait générique en &laquo;&nbsp;pose
          mignonne&nbsp;&raquo; est sympa. Son moment préféré précis, rendu dans un nouveau médium, est un objet
          précieux.
        </p>

        <h3>7. Un don au refuge ou à l&rsquo;association de sauvetage de son animal</h3>
        <p>
          Si vous savez d&rsquo;où vient son animal, faites un don en son nom. Si vous ne connaissez pas
          l&rsquo;origine, un refuge local ou une association spécialisée fonctionne. Ajoutez un mot : &laquo;&nbsp;Un
          don à [organisation] en l&rsquo;honneur de [nom de l&rsquo;animal]&nbsp;&raquo;. Le montant n&rsquo;a pas
          d&rsquo;importance. La précision, si.
        </p>

        <h3>8. Un souvenir mémorial (pour quelqu&rsquo;un qui a perdu un animal)</h3>
        <p>
          Celui-ci demande de la sensibilité et du bon timing. Si quelqu&rsquo;un dans votre vie a récemment perdu un
          animal, un <a href="/fr/blog/cadeaux-deuil-animalier">cadeau de deuil animalier</a> réfléchi peut compter
          plus que tout le reste de cette liste. Une photo encadrée que vous avez prise vous-même, une lettre avec un
          vrai souvenir, ou une <a href="/fr/memorial">page mémorial</a> qu&rsquo;il pourra remplir quand il sera
          prêt. L&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a>{" "}
          propose d&rsquo;autres options, dont certaines gratuites.
        </p>

        <h2>Des cadeaux qui créent de nouveaux souvenirs</h2>

        <h3>9. Une expérience partagée avec son animal</h3>
        <p>
          Une excursion d&rsquo;une journée sur une plage acceptant les chiens, une randonnée jamais tentée, une
          réservation dans un restaurant pet-friendly. Les expériences créent des histoires, et les histoires
          remplissent le journal. Pour aller plus loin, photographiez la journée pour lui, afin qu&rsquo;il ait des
          photos sous un angle qu&rsquo;il ne voit jamais : lui-même avec son animal.
        </p>

        <h3>10. Une séance photo professionnelle</h3>
        <p>
          Pas le genre posé en studio (sauf si c&rsquo;est son style). Réservez un photographe qui fait des séances
          sur le vif dans un parc, sur une plage, ou à la maison. Les photos qui en résultent, datées et
          contextualisées, deviennent la matière première d&rsquo;un livre souvenir qu&rsquo;il chérira vraiment.
        </p>

        <h3>11. Une lettre de vous à propos de son animal</h3>
        <p>
          Écrivez-lui une lettre sur son animal, de votre point de vue. Ce que vous avez remarqué dans la relation,
          le jour où son chien vous a accueilli d&rsquo;une façon qui vous a fait comprendre pourquoi les gens
          pleurent pour leurs animaux, la façon dont son chat ignore tout le monde sauf lui. Ça ne coûte rien et
          c&rsquo;est presque impossible à jeter.
        </p>

        <h2>Le principe derrière tout ça</h2>
        <p>
          Le meilleur cadeau pour un maître d&rsquo;animal n&rsquo;est pas quelque chose pour l&rsquo;animal.
          C&rsquo;est quelque chose qui aide le maître à garder l&rsquo;histoire : le contexte derrière les photos,
          la personnalité derrière les routines, les moments qui ne semblent ordinaires que jusqu&rsquo;à ce
          qu&rsquo;ils disparaissent.
        </p>
        <p>
          Quel que soit votre choix, ajoutez un mot manuscrit. Dites le nom de l&rsquo;animal. Mentionnez un souvenir
          précis. Cette phrase vaut plus que le cadeau lui-même.
        </p>
      </ArticleLayout>
    </>
  );
}

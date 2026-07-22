import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("livre-souvenir-premiere-annee-chaton")!;

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
          Les chatons grandissent plus vite que les chiots, et ils le font plus discrètement. Pas de cours
          d&rsquo;éducation, pas de promenades dans le quartier, pas d&rsquo;introduction progressive à la laisse. Un
          chaton arrive, s&rsquo;approprie un coin de l&rsquo;appartement, et en trois mois a une personnalité
          pleinement opérationnelle qu&rsquo;il passera les quinze prochaines années à affiner.
        </p>
        <p>
          Cette vitesse est exactement pourquoi un livre souvenir de première année compte. La version miniature de
          votre chat, celle qui tenait dans votre main, attaquait vos lacets et dormait dans des endroits qui
          n&rsquo;avaient aucun sens structurel, n&rsquo;existe que quelques mois. Voici quoi capturer, mois par mois,
          avant que tout ne se mélange.
        </p>

        <h2>Avant son arrivée</h2>
        <p>L&rsquo;histoire commence avant le chaton. Notez, tant que c&rsquo;est encore frais :</p>
        <ul>
          <li>Comment vous avez décidé d&rsquo;avoir un chat (et pas, disons, une plante raisonnable).</li>
          <li>
            Comment vous avez trouvé ce chaton en particulier : la visite au refuge, la photo de la portée, l&rsquo;ami
            dont le chat a eu des chatons.
          </li>
          <li>L&rsquo;histoire du nom. Ce qui a fait la liste courte, ce qui a été rejeté, et comment le gagnant a émergé.</li>
          <li>Ce que vous avez acheté ou préparé avant son arrivée, et à quel point une bonne partie s&rsquo;est révélée inutile.</li>
        </ul>

        <h2>Mois 1-2 : l&rsquo;arrivée</h2>
        <p>Tout se passe en même temps, et vous êtes simultanément épuisé et enchanté.</p>
        <ul>
          <li>
            Écrivez la première nuit. Où il a dormi (pas où vous aviez prévu qu&rsquo;il dorme). Si l&rsquo;un de vous
            deux a vraiment dormi.
          </li>
          <li>
            La première cachette. Les chatons choisissent une base d&rsquo;opérations en quelques heures.
            Documentez-la ; ils l&rsquo;abandonneront en quelques semaines et vous oublierez quelle étagère
            c&rsquo;était.
          </li>
          <li>Son premier poids chez le vétérinaire. Notez le chiffre. Le contraste au douzième mois est remarquable.</li>
          <li>Ses premières préférences alimentaires : ce qu&rsquo;il adorait, ce qu&rsquo;il rejetait, ce qu&rsquo;il essayait de voler.</li>
          <li>Le premier jouet auquel il s&rsquo;est attaché, et combien de temps il a survécu.</li>
        </ul>

        <h2>Mois 3-4 : la phase d&rsquo;exploration</h2>
        <p>Le chaton a décidé que l&rsquo;appartement lui appartenait. Maintenant, il l&rsquo;audite.</p>
        <ul>
          <li>
            Nouvelles pièces, nouvelles hauteurs, nouvelles surfaces interdites. Gardez une liste des endroits
            qu&rsquo;il a découverts et revendiqués. Les photos d&rsquo;un chaton en haut du réfrigérateur pour la
            première fois n&rsquo;ont pas de prix.
          </li>
          <li>
            La première rencontre avec ce qui vit déjà dans le foyer : un autre chat, un chien, une plante
            d&rsquo;intérieur qu&rsquo;il a immédiatement essayé de manger.
          </li>
          <li>
            Le début de l&rsquo;ère des zoomies. Notez le moment de la journée, le circuit habituel, et la tête
            qu&rsquo;il fait à pleine vitesse.
          </li>
          <li>Sa relation avec les fenêtres. Les chats et les fenêtres, c&rsquo;est une histoire de toute une vie, et ça commence ici.</li>
        </ul>

        <h2>Mois 5-6 : la personnalité prend forme</h2>
        <p>
          Le chaton devient un chat, et les manies qui se forment maintenant sont celles que vous décrirez aux gens
          pendant la prochaine décennie.
        </p>
        <ul>
          <li>
            La première vraie &laquo;&nbsp;conversation&nbsp;&raquo; : le miaulement qu&rsquo;il réserve pour vous,
            différent de celui destiné à la porte ou à la gamelle.
          </li>
          <li>Les positions de sommeil. Elles deviennent plus étranges à mesure que le chaton grandit. Documentez généreusement.</li>
          <li>L&rsquo;instinct de chasse en pleine forme : ce qu&rsquo;il traque, ce qu&rsquo;il attrape, ce qu&rsquo;il vous apporte en cadeau.</li>
          <li>La première fois qu&rsquo;il est resté sur vos genoux plus de trente secondes et que vous n&rsquo;avez pas osé bouger.</li>
        </ul>

        <h2>Mois 7-9 : l&rsquo;installation</h2>
        <p>Le chaos se calme, un peu. Les routines se solidifient.</p>
        <ul>
          <li>
            Son emploi du temps quotidien, cartographié. Où il est à 8h, midi, 18h, minuit. Les chats sont des
            créatures de routine extrême, et la première année est celle où l&rsquo;emploi du temps se fixe.
          </li>
          <li>L&rsquo;endroit. Chaque chat finit par s&rsquo;engager envers un lieu de sieste principal. Quand ça arrive, notez-le.</li>
          <li>Dynamiques relationnelles : qui dans le foyer il suit, qui il ignore, qui a droit au clignement lent.</li>
          <li>
            Habitudes de toilettage : comment il se lave, où il laisse ses poils, la surface précise qu&rsquo;il a
            choisi de griffer malgré toutes les alternatives que vous lui avez offertes.
          </li>
        </ul>

        <h2>Mois 10-12 : presque adulte</h2>
        <ul>
          <li>Le premier anniversaire ou anniversaire d&rsquo;adoption. Comment vous l&rsquo;avez marqué, et si ça l&rsquo;a intéressé.</li>
          <li>
            Avant-après : recréez une photo des premières semaines, même endroit, même angle. La différence de taille
            raconte toute l&rsquo;histoire.
          </li>
          <li>
            Une lettre pour ses un an. Ce que vous savez de lui maintenant que vous ne saviez pas au deuxième mois. Ce
            qui vous a surpris. Ce que vous espérez voir rester pareil.
          </li>
          <li>
            La chose de chaton qu&rsquo;il fait encore : le seul comportement qui n&rsquo;a pas changé, le rappel
            qu&rsquo;il était autrefois assez petit pour tenir dans une chaussure.
          </li>
        </ul>

        <h2>Idées de photos pour chats</h2>
        <ul>
          <li>Le même endroit, chaque mois. Choisissez son perchoir préféré, même angle, douze photos. Ça seul justifie le projet.</li>
          <li>À l&rsquo;intérieur de sa cachette. Les chats ont des espaces privés. Photographiez-les depuis leur point de vue, en train de regarder dehors.</li>
          <li>
            Les archives du sommeil. Les chats dorment seize heures par jour dans des positions de plus en plus
            improbables. C&rsquo;est la série de photos la plus facile que vous entretiendrez jamais.
          </li>
          <li>Pattes et échelle. Sa patte sur votre main, au premier mois et au douzième.</li>
          <li>Gardez les photos floues. Le flou veut dire zoomies, et zoomies veut dire chaton.</li>
        </ul>

        <h2>Que noter quand il &laquo;&nbsp;dort, c&rsquo;est tout&nbsp;&raquo;</h2>
        <p>
          Les chats passent la majeure partie de leur vie à faire des choses qui ressemblent à rien. Mais
          &laquo;&nbsp;rien&nbsp;&raquo; est la matière. Où il dort, comment il est recroquevillé, s&rsquo;il a
          tressailli à un son avant de se rendormir. Une phrase sur un après-midi banal est exactement la page que
          vous ne pourrez jamais recréer plus tard.
        </p>
        <p>
          Si vous avez besoin d&rsquo;un point de départ, la liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> a des questions qui
          fonctionnent pour les chats, et le{" "}
          <a href="/fr/blog/livre-souvenir-chat">guide du livre souvenir pour chat</a> propose des idées de structure
          pour organiser tout ça en pages thématiques. Pour une vue plus large sur comment construire une habitude de
          journal qui tient, le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> couvre la fréquence, le
          format, et comment la rendre durable.
        </p>

        <h2>Transformer la première année en un vrai livre</h2>
        <p>
          Le schéma est le même que pour les chiots (et le{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chiot">guide de la première année du chiot</a> en dit plus
          sur ce point) : les projets qui aboutissent sont ceux construits au fil de l&rsquo;eau, pas assemblés de
          mémoire des mois plus tard. Une phrase par jour, ou même par semaine, finit par constituer une riche
          histoire de première année le moment venu de l&rsquo;anniversaire.
        </p>
        <p>
          Everypaw gère ça automatiquement : vous notez les moments, l&rsquo;IA les transforme en chapitres
          d&rsquo;histoire mensuels, et la première année devient un livre relié imprimé. Mais quel que soit le
          système que vous utilisez, commencez ce soir. Le chaton qui dort sur votre clavier en ce moment sera un
          chat adulte étonnamment vite.
        </p>
      </ArticleLayout>
    </>
  );
}

import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("livre-souvenir-chat")!;

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
          Les gens qui ont des chiens ont la vie facile pour tenir un journal. Les chiens ont des promenades, des
          accueils, des émotions visibles, et une vie sociale. Les chats n&rsquo;ont rien de tout ça, ou plutôt, ils
          ont tout ça à leur façon, à 3h du matin, d&rsquo;une manière qui ressemble à rien tant qu&rsquo;on n&rsquo;y
          prête pas attention de près.
        </p>
        <p>
          C&rsquo;est pour ça que la plupart des contenus sur la mémoire animale penchent vers les chiens, et pourquoi
          les propriétaires de chats ont souvent l&rsquo;impression que les conseils ne s&rsquo;appliquent pas. Ils
          s&rsquo;appliquent. Il faut juste savoir quoi observer. Un livre souvenir pour chat ne se construit pas sur
          de grands moments. Il se construit sur des habitudes, des préférences, et l&rsquo;accumulation lente
          d&rsquo;une personnalité qui ne se révèle qu&rsquo;à ceux qui vivent avec.
        </p>

        <h2>Pourquoi les souvenirs de chat s&rsquo;effacent différemment</h2>
        <p>
          Les souvenirs de chien sont souvent liés à des événements : la promenade où il a rencontré le caniche, le
          jour où elle a appris à donner la patte. Les souvenirs de chat sont atmosphériques : l&rsquo;hiver
          qu&rsquo;elle a passé entièrement sur le radiateur, l&rsquo;année où il a décidé que la baignoire était son
          bureau, la période où elle vous apportait une chaussette chaque matin à 6h puis a arrêté sans explication.
        </p>
        <p>
          Ces souvenirs atmosphériques sont plus difficiles à cerner, ce qui signifie qu&rsquo;ils s&rsquo;effacent en
          premier. Vous n&rsquo;oublierez pas votre chat. Mais vous oublierez quelle étagère, quelle chaussette, quel
          hiver. Un livre souvenir, c&rsquo;est comment garder les détails.
        </p>

        <h2>Que capturer chez un chat</h2>

        <h3>Les endroits choisis</h3>
        <p>
          Les chats organisent leur environnement avec le sérieux d&rsquo;un conservateur de musée. Notez où ils
          s&rsquo;assoient, dorment, se cachent et observent, saison après saison. L&rsquo;historique des endroits
          d&rsquo;un chat est une biographie en miniature : la fenêtre ensoleillée en été, le tas de linge en hiver,
          le carton arrivé en mars et devenu meuble permanent.
        </p>

        <h3>La routine, décodée</h3>
        <p>
          Chaque chat a un emploi du temps qui paraît aléatoire vu de l&rsquo;extérieur et qui est en fait
          rigoureusement précis. Cartographiez-le : quand il mange, quand il patrouille, quand il réclame de
          l&rsquo;attention, quand il disparaît, quand il réapparaît en faisant comme si de rien n&rsquo;était.
          Notez-le une fois, puis à nouveau six mois plus tard, et comparez.
        </p>

        <h3>Les sons</h3>
        <p>
          Les chats ont un registre vocal qu&rsquo;ils déploient avec sélectivité. Le petit gazouillis face aux
          oiseaux. Le long miaulement interrogateur quand vous êtes dans une pièce qu&rsquo;ils ne peuvent pas voir.
          Le &laquo;&nbsp;miaou&nbsp;&raquo; silencieux, bouche ouverte, peut-être le son le plus expressif de tous.
          Décrivez-les. Les enregistrements aident, mais les mots capturent ce que le son signifie pour vous.
        </p>

        <h3>Le clignement lent et autres signaux</h3>
        <p>
          Le clignement lent, le coup de tête, l&rsquo;offrande du ventre (piège ou invitation, et comment vous avez
          appris à faire la différence), les positions de queue. C&rsquo;est le vocabulaire émotionnel d&rsquo;un
          chat, et il est propre au vôtre. Ce qui compte comme de l&rsquo;affection chez vous vaut la peine
          d&rsquo;être noté, parce que personne d&rsquo;autre ne le comprendra de la même façon.
        </p>

        <h3>Le chapitre de 3h du matin</h3>
        <p>
          Tout propriétaire de chat a des histoires qui n&rsquo;arrivent que la nuit. Donnez-leur leur propre section.
          Votre futur vous appréciera la précision : &laquo;&nbsp;3h17, sprint complet de la chambre à la cuisine,
          verre d&rsquo;eau renversé, s&rsquo;est assis à côté avec un air offensé&nbsp;&raquo;.
        </p>

        <h3>La relation avec le foyer</h3>
        <p>
          Comment il interagit différemment avec chaque membre de la famille. La personne qu&rsquo;il suit, celle
          qu&rsquo;il ignore, l&rsquo;invité qui a gagné sa confiance instantanément, l&rsquo;autre animal dont il
          fait semblant d&rsquo;ignorer l&rsquo;existence. Les chats ont des opinions sur tout le monde, et ces
          opinions font la moitié de l&rsquo;histoire.
        </p>

        <h2>Des prompts qui fonctionnent pour les chats</h2>
        <p>
          Les prompts de journal animalier génériques penchent vers les chiens (&laquo;&nbsp;décrivez la promenade
          d&rsquo;aujourd&rsquo;hui&nbsp;&raquo; ne s&rsquo;applique pas à un chat qui n&rsquo;a pas quitté
          l&rsquo;appartement depuis quatre ans). Voici quelques prompts adaptés à l&rsquo;expérience féline :
        </p>
        <ul>
          <li>Où a-t-il passé la majeure partie de sa journée, et est-ce que ça a changé récemment ?</li>
          <li>
            Qu&rsquo;a-t-il fait quand vous êtes rentré ? Soyez précis : est-il venu à la porte, ou l&rsquo;avez-vous
            trouvé en train de faire semblant de ne pas avoir remarqué ?
          </li>
          <li>Décrivez la dernière fois qu&rsquo;il vous a apporté quelque chose (un jouet, une feuille, pire).</li>
          <li>Quelle est son opinion actuelle sur la fenêtre la plus proche ?</li>
          <li>Comment réclame-t-il la nourriture par rapport à l&rsquo;attention ? Quelle est la différence ?</li>
          <li>Décrivez la position la plus étrange dans laquelle il a dormi cette semaine.</li>
        </ul>
        <p>
          Pour une liste plus longue qui couvre chiens et chats, l&rsquo;article{" "}
          <a href="/fr/blog/prompts-journal-animalier">50 prompts de journal animalier</a> a des sections sur la
          personnalité, les étapes importantes, et les chapitres plus difficiles, qui s&rsquo;appliquent tout aussi
          bien aux chats.
        </p>

        <h2>Créer un livre qui ressemble à un chat</h2>
        <p>
          Un livre souvenir pour chien peut suivre une structure chronologique, portée par les événements. Un livre
          souvenir pour chat fonctionne mieux organisé par thème : son territoire, ses routines, ses relations, ses
          manies. La chronologie compte toujours (datez tout), mais les chapitres devraient refléter la façon dont un
          chat vit, en habitudes plutôt qu&rsquo;en rebondissements.
        </p>
        <p>Quelques idées de structure :</p>
        <ul>
          <li>
            Une page par &laquo;&nbsp;ère&nbsp;&raquo; définie par l&rsquo;endroit où il dormait (l&rsquo;ère du
            radiateur, l&rsquo;ère du carton, l&rsquo;ère de la commode interdite).
          </li>
          <li>Une section pour ce qu&rsquo;il a détruit, avec preuves photographiques et dates approximatives.</li>
          <li>
            Une page de citations directes : les choses que vous dites à voix haute à votre chat, en sachant qu&rsquo;il
            s&rsquo;en fiche, présentées sans commentaire.
          </li>
          <li>Une paire de photos avant-après si vous avez des photos de lui chaton, même angle, même endroit.</li>
        </ul>
        <p>
          Pour plus d&rsquo;idées de pages qui fonctionnent quelle que soit l&rsquo;espèce, l&rsquo;article{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a> propose des structures
          (chapitre des origines, chronologie des surnoms, lettres) qui s&rsquo;adaptent bien aux chats avec de
          légers ajustements.
        </p>

        <h2>Tenir un journal pour un chat âgé ou un chat que vous avez perdu</h2>
        <p>
          Les chats âgés changent assez lentement pour qu&rsquo;on ne le remarque qu&rsquo;en regardant en arrière.
          Les siestes s&rsquo;allongent. Les sauts se raccourcissent. La routine se resserre. Ces changements valent
          la peine d&rsquo;être documentés avec tendresse, parce qu&rsquo;ils font aussi partie de l&rsquo;histoire.
        </p>
        <p>
          Si vous tenez un journal après avoir perdu un chat, ou si vous cherchez des façons de garder sa mémoire
          tangible, l&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a>
          couvre plusieurs approches, et la <a href="/fr/memorial">page mémorial Everypaw</a> a été conçue exactement
          pour ce genre de souvenir.
        </p>
        <p>
          Si votre chat est encore dans sa première année, le{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chaton">guide de la première année du chaton</a> propose une
          structure mois par mois pensée pour cette phase la plus rapide.
        </p>

        <h2>Commencez par ce qui est devant vous</h2>
        <p>
          En ce moment, votre chat fait probablement quelque chose de parfaitement banal : dormir dans un coin
          qu&rsquo;il a revendiqué la semaine dernière, ignorer un jouet, fixer un mur avec conviction. Notez-le. Une
          phrase. C&rsquo;est comme ça que commence un livre souvenir pour chat, pas avec une étape marquante, mais
          avec un mardi après-midi que vous seul auriez pensé à remarquer.
        </p>
        <p>
          Everypaw fonctionne de la même façon pour les chats que pour les chiens : vous notez les petits moments,
          l&rsquo;IA les transforme en chapitres d&rsquo;histoire mensuels, et ces chapitres deviennent un livre
          relié imprimé. Si vous voulez un guide plus large pour démarrer, le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> couvre la méthode, la
          fréquence, et comment faire tenir l&rsquo;habitude.
        </p>
      </ArticleLayout>
    </>
  );
}

import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("comment-tenir-journal-animalier")!;

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
          Vous prenez des photos. Vous postez des stories. Vous racontez à vos amis ce que votre chien a fait de drôle
          ce matin. Et en quelques semaines, les détails s&rsquo;estompent : c&rsquo;était mardi ou jeudi ? La balle
          rouge ou la corde ? Elle a aboyé sur l&rsquo;écureuil ou elle s&rsquo;est juste figée ?
        </p>
        <p>
          Un journal animalier, c&rsquo;est comment on arrête ce flou. Pas un carnet médical, pas un suivi
          d&rsquo;éducation, pas un journal intime soigné. Juste un endroit où vous notez les moments petits,
          spécifiques, oubliables, avant qu&rsquo;ils ne deviennent introuvables. Voici comment en commencer un,
          comment continuer, et pourquoi les entrées ordinaires finissent par compter plus que les étapes marquantes.
        </p>

        <h2>Ce qu&rsquo;est vraiment un journal animalier</h2>
        <p>
          Ce n&rsquo;est pas ce que la plupart des gens imaginent. Vous n&rsquo;avez pas besoin d&rsquo;un carnet en
          cuir. Vous n&rsquo;avez pas besoin d&rsquo;écrire tous les jours. Vous n&rsquo;avez pas besoin de
          paragraphes.
        </p>
        <p>
          Un journal animalier, c&rsquo;est n&rsquo;importe quelle habitude régulière de noter des moments sur votre
          animal, en mots. Une phrase compte. Une légende de photo compte. Trois mots après une visite vétérinaire
          comptent. La seule chose qui ne compte pas, c&rsquo;est &laquo;&nbsp;je m&rsquo;en souviendrai&nbsp;&raquo;,
          parce que non.
        </p>
        <p>
          Ce qui distingue un journal souvenir d&rsquo;un carnet de suivi, c&rsquo;est l&rsquo;intention. Un carnet de
          suivi note ce qui s&rsquo;est passé (vaccins, poids, traitements). Un journal souvenir capture ce que
          ça faisait ressentir : la façon dont il penchait la tête, le son qu&rsquo;il faisait quand vous ouvriez le
          sac de friandises, l&rsquo;après-midi où il a refusé de quitter le parc. Les données de suivi ont une
          utilité. Les données souvenirs ont un sens.
        </p>

        <h2>Sur quoi écrire</h2>
        <p>
          L&rsquo;instinct, c&rsquo;est d&rsquo;attendre quelque chose de grand : une étape, un voyage, une première
          fois. Mais les entrées que vous relirez le plus sont les ordinaires, celles qui capturent une version de
          votre animal qui n&rsquo;a existé que quelques semaines.
        </p>
        <p>Quelques catégories qui fonctionnent bien :</p>
        <ul>
          <li>
            <strong>Instantanés du quotidien.</strong> Ce qu&rsquo;il a fait aujourd&rsquo;hui, en une phrase.
            &laquo;&nbsp;A dormi sous le bureau toute la matinée, puis a volé une chaussette à 16h&nbsp;&raquo;.
          </li>
          <li>
            <strong>Notes de personnalité.</strong> Manies, préférences, peurs, routines. Elles évoluent avec le
            temps, et vous ne le remarquerez qu&rsquo;en relisant.
          </li>
          <li>
            <strong>Moments relationnels.</strong> Comment il a accueilli quelqu&rsquo;un, comment il a réagi à un
            nouveau chien, comment il s&rsquo;est blotti contre vous pendant un orage.
          </li>
          <li>
            <strong>Les moments difficiles.</strong> Visites vétérinaires, vieillissement, maladie. Ce sont les
            entrées dont les gens sont le plus reconnaissants de les avoir écrites.
          </li>
        </ul>
        <p>
          Si vous êtes bloqué sur quoi écrire, une liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">50 prompts de journal animalier</a> vous fait passer la page
          blanche en quelques secondes.
        </p>

        <h2>À quelle fréquence écrire</h2>
        <p>La réponse honnête : aussi souvent que vous le ferez vraiment, pas aussi souvent que vous pensez devoir le faire.</p>
        <p>
          Trois entrées par semaine, c&rsquo;est largement suffisant. Une entrée par semaine construit déjà un
          registre riche sur une année. Le piège, c&rsquo;est de se fixer un objectif quotidien, de rater trois
          jours, de se sentir coupable, et d&rsquo;abandonner. Un journal animalier qui reçoit cinq entrées par mois
          pendant deux ans vaut mieux qu&rsquo;un qui en reçoit trente en janvier et plus rien après.
        </p>
        <p>
          L&rsquo;approche durable consiste à rattacher le journal à quelque chose que vous faites déjà : après la
          promenade du soir, pendant qu&rsquo;il dîne, juste avant de dormir. Le déclencheur compte plus que le
          calendrier.
        </p>

        <h2>Comment écrire des entrées qui traversent le temps</h2>
        <p>Quelques principes qui distinguent les entrées que vous chérirez de celles que vous survolerez :</p>
        <ul>
          <li>
            <strong>Soyez précis, pas poétique.</strong> &laquo;&nbsp;Il est resté assis sur le tapis à fixer le
            lave-vaisselle pendant dix minutes&nbsp;&raquo; vaut mieux que &laquo;&nbsp;Encore une journée drôle avec
            mon garçon&nbsp;&raquo;. La précision, c&rsquo;est ce dont votre futur vous a besoin.
          </li>
          <li>
            <strong>Nommez la date.</strong> &laquo;&nbsp;Mars 2027&nbsp;&raquo; est utile. &laquo;&nbsp;Aujourd&rsquo;hui&nbsp;&raquo;
            ne l&rsquo;est plus, une fois que vous le relisez un an plus tard. Même juste le mois et l&rsquo;année
            transforment une note en capsule temporelle.
          </li>
          <li>
            <strong>Incluez le contexte que votre futur vous n&rsquo;aura plus.</strong> Votre appartement actuel, le
            chien du voisin avec qui il joue, la marque de nourriture dont il est obsédé ce mois-ci. Ces détails
            disparaissent sans laisser de trace.
          </li>
          <li>
            <strong>Restez court.</strong> Une à trois phrases, c&rsquo;est l&rsquo;idéal. Si écrire plus vous vient
            naturellement, faites-le. Mais ne laissez jamais la longueur devenir la barre à atteindre, sinon vous
            arrêterez d&rsquo;écrire.
          </li>
        </ul>

        <h2>Chiens, chats, et tous les autres animaux</h2>
        <p>
          La plupart des conseils sur le journal animalier penchent fortement vers les chiens, parce que les chiens
          ont des routines visibles, des promenades, et une vie sociale qui produit une matière évidente. Mais les
          chats se prêtent tout autant au journal : il faut juste un œil différent. Les moments calmes, l&rsquo;endroit
          qu&rsquo;il a choisi cette semaine, les zoomies de 3h du matin, le clignement lent depuis l&rsquo;autre bout
          de la pièce. Si vous avez un chat, le{" "}
          <a href="/fr/blog/livre-souvenir-chat">guide du livre souvenir pour chat</a> couvre ce qui vaut la peine
          d&rsquo;être capturé et comment le remarquer.
        </p>
        <p>
          Les mêmes principes s&rsquo;appliquent aux lapins, aux oiseaux, aux chevaux, ou à n&rsquo;importe quel
          animal avec qui vous partagez votre vie. S&rsquo;il vous manquerait, son histoire vaut la peine
          d&rsquo;être écrite.
        </p>

        <h2>Chapitres spéciaux : la première année et la dernière</h2>
        <p>
          Deux périodes de la vie d&rsquo;un animal produisent la matière la plus dense : le début et la fin.
        </p>
        <p>
          La première année d&rsquo;un chiot ou d&rsquo;un chaton change si vite que des entrées mensuelles
          ressemblent à un film accéléré. Si vous êtes dans cette fenêtre en ce moment, un{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chiot">guide mois par mois de la première année</a> peut
          vous aider à structurer le chaos avant qu&rsquo;il ne soit derrière vous.
        </p>
        <p>
          Le chapitre le plus difficile, c&rsquo;est le vieillissement, la maladie et la perte. Ce sont les entrées
          les plus douloureuses à écrire et les plus précieuses à avoir. Elles n&rsquo;ont pas besoin d&rsquo;être
          longues. &laquo;&nbsp;Plus lent dans les escaliers aujourd&rsquo;hui, mais a quand même remué la queue pour
          le facteur&nbsp;&raquo; suffit. Et si vous tenez un journal après une perte, ou si vous cherchez des façons
          d&rsquo;honorer un animal qui n&rsquo;est plus là, il existe des{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs</a> et une{" "}
          <a href="/fr/memorial">page mémorial</a> conçues exactement pour ça.
        </p>

        <h2>Du journal au livre</h2>
        <p>La question que les gens finissent par se poser, c&rsquo;est : qu&rsquo;est-ce que je fais de tout ça ?</p>
        <p>
          Une option, c&rsquo;est rien. Un journal a de la valeur en lui-même, même si personne d&rsquo;autre que
          vous ne le lit jamais. Mais si vous voulez le transformer en quelque chose de tangible, le chemin le plus
          simple est celui où le livre se construit tout seul au fil de l&rsquo;eau, plutôt que d&rsquo;exiger un
          projet d&rsquo;assemblage séparé, des mois plus tard.
        </p>
        <p>
          C&rsquo;est l&rsquo;idée centrale derrière Everypaw : vous écrivez les petits moments, l&rsquo;IA les
          transforme en chapitres d&rsquo;histoire mensuels, et en fin d&rsquo;année ces chapitres deviennent un
          livre relié imprimé. Si vous voulez voir à quoi ressemble une version terminée, ces{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a> montrent le genre de
          pages qui émergent d&rsquo;un journal régulier.
        </p>

        <h2>Commencez ce soir</h2>
        <p>
          Le meilleur journal animalier, c&rsquo;est celui qui existe. Ouvrez votre appli de notes, ou un carnet, ou
          Everypaw, et écrivez une phrase sur votre animal maintenant. Pas demain. Pas quand quelque chose
          d&rsquo;intéressant se produira. Maintenant, tant que le moment ordinaire devant vous est encore assez
          ordinaire pour être oublié.
        </p>
      </ArticleLayout>
    </>
  );
}

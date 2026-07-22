import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("ecrire-histoire-de-vie-animal")!;

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
          Vous n&rsquo;avez pas besoin d&rsquo;être écrivain pour écrire l&rsquo;histoire de vie de votre animal. Vous
          devez avoir vécu avec lui, avoir prêté attention, et tenir suffisamment à lui pour vous asseoir devant une
          page blanche. C&rsquo;est tout. L&rsquo;histoire est déjà là. La seule question, c&rsquo;est comment la
          faire sortir de votre tête pour en faire quelque chose que vous pourrez relire dans dix ans.
        </p>
        <p>Voici comment faire, étape par étape, sans aucune ambition littéraire requise.</p>

        <h2>Oubliez la chronologie (au début)</h2>
        <p>
          L&rsquo;instinct, c&rsquo;est de commencer par le début : &laquo;&nbsp;On l&rsquo;a eu un mardi de
          mars&nbsp;&raquo;. C&rsquo;est correct pour une première phrase, mais ce n&rsquo;est pas la bonne façon de
          commencer à écrire. L&rsquo;ordre chronologique, c&rsquo;est comment vous organiserez l&rsquo;histoire plus
          tard. Pour l&rsquo;instant, commencez par le souvenir le plus fort.
        </p>
        <p>
          C&rsquo;est peut-être la façon dont elle vous a accueilli après votre premier voyage d&rsquo;une semaine.
          C&rsquo;est peut-être la visite d&rsquo;urgence chez le vétérinaire qui n&rsquo;était finalement rien.
          C&rsquo;est peut-être les soirées du mardi sur le canapé. Écrivez cette scène en premier, avec autant de
          détails que possible, et ne vous inquiétez pas de savoir où elle s&rsquo;inscrit.
        </p>
        <p>Une fois que vous avez cinq ou six de ces fragments, la structure commencera à se dessiner d&rsquo;elle-même.</p>

        <h2>Les cinq chapitres que toute histoire d&rsquo;animal contient</h2>
        <p>
          Vous n&rsquo;êtes pas obligé d&rsquo;utiliser ces divisions exactes, mais presque toute histoire de vie
          d&rsquo;animal se répartit naturellement en cinq chapitres :
        </p>

        <h3>Comment vous vous êtes trouvés</h3>
        <p>
          La décision, la recherche, la première rencontre, le trajet du retour. Incluez les détails qui semblent
          trop petits : qui conduisait, ce qu&rsquo;ils ont fait dans la voiture, où il a dormi la première nuit. Ce
          sont les détails qui disparaissent en premier.
        </p>

        <h3>Qui il est devenu</h3>
        <p>
          Sa personnalité, pleinement formée : les manies, les peurs, les routines, les choses qu&rsquo;il faisait
          qu&rsquo;aucun autre animal ne fait exactement de la même façon. Ce chapitre est généralement le plus long
          et le plus amusant à écrire. Si vous avez besoin d&rsquo;aide pour trouver des détails précis, la liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> est faite exactement pour ça.
        </p>

        <h3>La vie que vous avez construite ensemble</h3>
        <p>
          L&rsquo;appartement qu&rsquo;il connaissait, les promenades qu&rsquo;il avait mémorisées, les gens
          qu&rsquo;il aimait, les autres animaux du foyer. C&rsquo;est le chapitre du contexte : le monde dans lequel
          votre animal a vécu, qui est aussi le monde qu&rsquo;il a façonné.
        </p>

        <h3>Les étapes importantes</h3>
        <p>
          Première neige, premier anniversaire, première fois qu&rsquo;il a fait confiance à un inconnu, le jour où
          il a arrêté d&rsquo;avoir peur de l&rsquo;aspirateur. Pas seulement les premières fois : aussi les dernières
          fois que vous n&rsquo;avez su être des dernières fois qu&rsquo;après coup.
        </p>

        <h3>La partie la plus difficile</h3>
        <p>
          Le vieillissement, la maladie, les derniers jours. Ce chapitre est optionnel dans son timing (vous pouvez
          l&rsquo;écrire quand vous êtes prêt, ou pas du tout), mais les gens qui l&rsquo;écrivent sont presque
          toujours contents de l&rsquo;avoir fait. L&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a> en
          dit plus sur comment aborder ce chapitre avec soin.
        </p>

        <h2>Comment écrire des scènes, pas des résumés</h2>
        <p>
          La différence entre une histoire d&rsquo;animal que vous relirez et une que vous ne relirez pas, c&rsquo;est
          la précision. Comparez ces deux entrées :
        </p>
        <p>
          &laquo;&nbsp;Max adorait aller au parc.&nbsp;&raquo; C&rsquo;est un résumé. Ça ne vous apprend rien que vous
          ne saviez déjà.
        </p>
        <p>
          &laquo;&nbsp;Max se mettait à gémir dès que je prenais mes clés, tournait trois fois complètement sur
          lui-même devant la porte, puis s&rsquo;asseyait parfaitement immobile comme pour prouver qu&rsquo;il
          méritait de sortir. Au parc, il allait toujours vérifier sous le même banc en premier, pour des raisons
          qu&rsquo;il était seul à connaître.&nbsp;&raquo; C&rsquo;est une scène. Il y a du mouvement, du détail, et
          de la personnalité. On voit le chien.
        </p>
        <p>
          Vous n&rsquo;avez pas besoin que chaque entrée soit aussi détaillée. Mais quand un souvenir est assez fort
          pour être écrit comme une scène, écrivez-le comme une scène.
        </p>

        <h2>Utilisez votre propre voix</h2>
        <p>
          La plus grande erreur, c&rsquo;est d&rsquo;essayer de sonner littéraire. L&rsquo;histoire de votre animal
          devrait sonner comme vous en train de raconter votre animal à un ami : chaleureuse, précise, parfois drôle,
          parfois non. Si vous parlez à votre animal avec une voix ridicule à la maison, laissez cette voix
          apparaître. Si vous jurez en racontant l&rsquo;histoire de l&rsquo;incident du canapé, gardez les jurons.
          L&rsquo;authenticité, c&rsquo;est ce qui fait qu&rsquo;une histoire d&rsquo;animal ressemble à un souvenir
          plutôt qu&rsquo;à une carte de vœux.
        </p>

        <h2>Et si vous n&rsquo;avez pas tenu de journal ?</h2>
        <p>La plupart des gens n&rsquo;en ont pas tenu, et il n&rsquo;est pas trop tard. Voici comment reconstituer :</p>
        <ul>
          <li>
            Parcourez votre pellicule photo par ordre chronologique. Les photos sont des déclencheurs de mémoire, et
            leurs dates vous donnent une chronologie que vous ne pourriez pas reconstituer de mémoire seule.
          </li>
          <li>
            Demandez aux gens qui connaissaient votre animal. Partenaires, colocataires, famille, habitués du parc à
            chiens. Ils se souviennent de choses que vous avez oubliées, et leur version de votre animal fait aussi
            partie de l&rsquo;histoire.
          </li>
          <li>
            Vérifiez vos anciens messages et publications sur les réseaux sociaux. Vous avez probablement mentionné
            votre animal plus souvent que vous ne le pensez. Ces fragments, datés et informels, sont de la matière
            brute.
          </li>
          <li>
            Utilisez le cadre du{" "}
            <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> même si vous écrivez à
            rebours. Les catégories (instantanés du quotidien, personnalité, relations, étapes importantes)
            fonctionnent aussi bien pour reconstituer une vie que pour en enregistrer une en temps réel.
          </li>
        </ul>

        <h2>Ne corrigez pas en écrivant</h2>
        <p>
          Sortez d&rsquo;abord les souvenirs. Tous, dans l&rsquo;ordre où ils viennent, aussi bruts soient-ils.
          Corriger et écrire sont deux métiers différents, et faire les deux en même temps est le moyen le plus
          rapide de ne rien produire. Écrivez le brouillon désordonné. Laissez-le reposer quelques jours. Puis
          revenez et donnez-lui forme.
        </p>

        <h2>Transformer l&rsquo;histoire en quelque chose que vous pouvez tenir</h2>
        <p>
          Une histoire de vie d&rsquo;animal terminée peut vivre dans un carnet, un document Google, ou votre appli
          de notes. Mais si vous voulez quelque chose de physique, il y a deux chemins :
        </p>
        <p>
          Le chemin manuel : mettre en forme le texte, choisir des photos, concevoir une mise en page, et commander
          un livre imprimé via n&rsquo;importe quel service de livre photo. Ça fonctionne, mais ça demande une
          après-midi (ou un week-end) entier d&rsquo;assemblage, ce qui est là où la plupart des projets s&rsquo;arrêtent.
        </p>
        <p>
          Le chemin automatique : notez les moments au fil de l&rsquo;eau, et laissez l&rsquo;assemblage se faire pour
          vous. C&rsquo;est ce que fait Everypaw. Vous écrivez les entrées, l&rsquo;IA les transforme en chapitres
          d&rsquo;histoire mensuels, et ces chapitres deviennent un livre relié. L&rsquo;histoire de vie se construit
          elle-même, une entrée à la fois.
        </p>
        <p>
          Pour des idées de pages précises et de l&rsquo;inspiration structurelle, l&rsquo;article{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a> propose douze concepts
          de page qui fonctionnent bien dans l&rsquo;histoire de n&rsquo;importe quel animal. Et si votre animal est
          un chat, le <a href="/fr/blog/livre-souvenir-chat">guide du livre souvenir pour chat</a> couvre comment
          capturer un récit plus discret.
        </p>

        <h2>Commencez par une seule scène</h2>
        <p>
          Ne vous engagez pas à écrire toute l&rsquo;histoire ce soir. Écrivez juste une scène : la plus drôle, la
          plus vive, celle que vous racontez lors des dîners. Notez-la en deux ou trois paragraphes. Enregistrez-la
          quelque part où vous ne la perdrez pas.
        </p>
        <p>
          Demain, écrivez-en une autre. L&rsquo;histoire de vie n&rsquo;est qu&rsquo;une collection de scènes, et vous
          les connaissez déjà toutes.
        </p>
      </ArticleLayout>
    </>
  );
}

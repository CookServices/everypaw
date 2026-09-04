import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("idees-souvenirs-deuil-animal")!;

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
          Quand un animal meurt, le chagrin est immédiat. La question du souvenir vient plus tard, parfois des
          semaines plus tard, parfois des mois : comment le garder près de vous d&rsquo;une façon qui lui ressemble,
          pas comme un produit ?
        </p>
        <p>
          Il n&rsquo;y a pas de bonne réponse. Certains veulent quelque chose à tenir dans les mains. D&rsquo;autres
          veulent quelque chose à lire. D&rsquo;autres encore veulent un endroit calme en ligne où le souvenir vit à
          sa manière. Voici neuf idées, à peu près classées du plus tangible au plus personnel, chacune une façon
          différente de dire : il était là, et ça comptait.
        </p>

        <h2>1. Un livre souvenir construit à partir de vos propres mots</h2>
        <p>
          Si vous avez tenu un journal, pris des notes, ou même écrit des légendes de photos du vivant de votre
          animal, ces fragments sont la matière première d&rsquo;un livre souvenir qui sonne comme votre vie
          ensemble, pas comme un modèle. Même une poignée d&rsquo;entrées datées, réorganisées par chapitre (sa
          personnalité, les routines, les étapes importantes, les jours difficiles), peut devenir quelque chose que
          vous voudrez garder.
        </p>
        <p>
          Si vous partez de zéro après une perte, il n&rsquo;est pas trop tard. Asseyez-vous avec un ami qui
          connaissait votre animal et écrivez ce dont vous vous souvenez, tant que les détails sont encore nets. La
          liste de <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> a une section sur
          &laquo;&nbsp;les chapitres plus difficiles&nbsp;&raquo; qui peut vous aider à trouver les bons points de
          départ.
        </p>

        <h2>2. Un livre photo imprimé avec du contexte</h2>
        <p>
          Les livres photo sont courants. Ce qui transforme un livre photo en souvenir plutôt qu&rsquo;en décoration
          d&rsquo;étagère, c&rsquo;est le contexte : une date et une phrase sous chaque photo expliquant ce qui se
          passait et pourquoi ça comptait. &laquo;&nbsp;Juillet 2025, le jour où elle a enfin fait confiance aux
          escaliers&nbsp;&raquo; transforme une photo floue en histoire. Sans cette ligne, c&rsquo;est juste une photo
          floue.
        </p>
        <p>
          Si vous avez un chien, l&rsquo;article{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">idées de livre souvenir pour chien</a> propose des structures
          de page (le chapitre des origines, la chronologie des surnoms, le chapitre des bêtises) qui fonctionnent
          particulièrement bien pour les livres mémoriaux. Pour les chats, le{" "}
          <a href="/fr/blog/livre-souvenir-chat">guide du livre souvenir pour chat</a> couvre comment capturer un
          compagnon plus discret.
        </p>

        <h2>3. Une page mémorial</h2>
        <p>
          Une page en ligne dédiée à votre animal, visible par toute personne à qui vous partagez le lien, où sa
          photo, son histoire, et les messages de ceux qui l&rsquo;aimaient vivent en un seul endroit. C&rsquo;est
          moins éphémère qu&rsquo;une publication sur les réseaux sociaux, et plus facile à partager qu&rsquo;un livre
          physique.
        </p>
        <p>
          Everypaw propose une <a href="/fr/memorial">fonctionnalité de page mémorial</a> conçue pour ça : un espace
          calme et permanent avec sa photo, votre message, ses histoires générées par IA, et un endroit pour les
          hommages des autres. Elle peut aussi{" "}
          <a href="/fr/gift">s&rsquo;offrir en abonnement</a>, ce qui épargne la mise en place à la personne en deuil.
        </p>

        <h2>4. Une lettre que vous n&rsquo;envoyez pas</h2>
        <p>
          Écrivez-lui une lettre. Dites les choses que vous disiez à voix haute quand personne n&rsquo;écoutait, et
          celles que vous n&rsquo;avez jamais pu dire du tout. Datez-la. Vous n&rsquo;avez pas à la partager, la
          publier, ou même la relire. L&rsquo;acte de l&rsquo;écrire est le souvenir en soi.
        </p>
        <p>Certains écrivent une seule lettre. D&rsquo;autres en écrivent une chaque année à l&rsquo;anniversaire. Les deux sont valables.</p>

        <h2>5. Un don en son nom</h2>
        <p>
          Choisissez un refuge, une association de sauvetage, ou un fonds vétérinaire qui correspond à qui il était :
          l&rsquo;association de race qui l&rsquo;a sauvé, le refuge où vous vous êtes rencontrés, l&rsquo;école
          vétérinaire qui l&rsquo;a soigné. Un petit don récurrent transforme son nom en quelque chose qui continue à
          aider des animaux comme lui.
        </p>

        <h2>6. Une routine que vous gardez</h2>
        <p>
          Celle-ci est invisible et gratuite. Gardez une de ses routines : la promenade du soir à la même heure,
          l&rsquo;endroit sur le canapé que vous laissez vide un moment, le pot de friandises qui reste sur le
          comptoir. Les routines, c&rsquo;est comment les animaux structuraient votre journée, et en garder une est
          un acte de mémoire quotidien et discret.
        </p>

        <h2>7. Un marqueur de jardin ou un arbre planté</h2>
        <p>
          Quelque chose de vivant, dans un endroit que vous verrez régulièrement. Un arbre planté à
          l&rsquo;anniversaire, une pierre dans le jardin, un pot sur le balcon. Le but n&rsquo;est pas l&rsquo;objet ;
          c&rsquo;est l&rsquo;endroit. Un point fixe où le souvenir a une place physique.
        </p>

        <h2>8. Son collier ou sa médaille, gardés intentionnellement</h2>
        <p>
          La plupart des gens gardent le collier. La différence entre un souvenir et un objet de tiroir, c&rsquo;est
          l&rsquo;intention. Encadrez-le, accrochez-le, attachez-le à quelque chose que vous utilisez, ou placez-le
          quelque part où vous le verrez. Ne le laissez pas disparaître dans une boîte. Les objets qui comptent ont
          besoin d&rsquo;une place.
        </p>

        <h2>9. Son histoire, écrite</h2>
        <p>
          C&rsquo;est le plus simple et le plus difficile. Asseyez-vous et écrivez l&rsquo;histoire de votre vie
          ensemble, du jour de votre rencontre au jour de son départ. Elle n&rsquo;a pas besoin d&rsquo;être longue.
          Elle n&rsquo;a pas besoin d&rsquo;être bonne. Elle doit juste être honnête : les moments drôles, les moments
          durs, les après-midis ordinaires qui se sont révélés être tout l&rsquo;essentiel.
        </p>
        <p>
          Si vous avez tenu un journal de son vivant, vous avez déjà la matière. Sinon, écrivez de mémoire
          maintenant. Le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> donne des conseils pour
          écrire des entrées qui traversent le temps, et la même approche fonctionne tout aussi bien à rebours, pour
          capturer ce dont vous vous souvenez avant que les détails ne s&rsquo;effacent davantage.
        </p>

        <h2>Il n&rsquo;y a pas de date limite</h2>
        <p>
          Le deuil ne suit pas un calendrier, et un souvenir non plus. Si vous n&rsquo;êtes pas prêt à créer quelque
          chose, ne le faites pas. Les souvenirs ne vont nulle part. Et quand vous serez prêt, commencez par ce qui
          vous semble gérable : une photo avec une légende, un paragraphe, une phrase. Le reste peut venir plus tard,
          ou jamais. Le but n&rsquo;a jamais été l&rsquo;objet. Le but, c&rsquo;était lui.
        </p>
        <p>
          Si vous cherchez un cadeau pour quelqu&rsquo;un d&rsquo;autre qui a perdu son animal, le{" "}
          <a href="/fr/blog/cadeaux-deuil-animalier">guide des cadeaux pour un deuil animalier</a> couvre ce qui aide
          vraiment, du point de vue de l&rsquo;ami.
        </p>
      </ArticleLayout>
    </>
  );
}

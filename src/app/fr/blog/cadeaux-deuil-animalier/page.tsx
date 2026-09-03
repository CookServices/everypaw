import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("cadeaux-deuil-animalier")!;

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
          Quand un ami perd son animal, on veut faire quelque chose. Mais &laquo;&nbsp;quelque chose&nbsp;&raquo; est
          difficile à cerner. Des fleurs semblent génériques. Une carte semble minuscule. Et tout ce qu&rsquo;on
          trouve en ligne sous &laquo;&nbsp;mémorial animalier&nbsp;&raquo; est soit produit en série, soit tellement
          personnalisé qu&rsquo;il faudrait des informations qu&rsquo;on n&rsquo;a pas.
        </p>
        <p>
          La vérité, c&rsquo;est que les meilleurs cadeaux pour un deuil animalier ne concernent pas l&rsquo;objet.
          Ils montrent à votre ami que vous avez compris la relation, que vous savez que ce n&rsquo;était pas
          &laquo;&nbsp;juste un animal&nbsp;&raquo;, et que vous n&rsquo;allez pas le presser de passer à autre chose.
        </p>
        <p>
          Voici sept idées, classées à peu près du geste le plus simple au plus élaboré, avec quelques attentions
          bien intentionnées mais à éviter.
        </p>

        <h2>1. Prononcez le nom de l&rsquo;animal</h2>
        <p>
          Ce n&rsquo;est pas un cadeau qu&rsquo;on achète. C&rsquo;est celui qui compte le plus. Dans votre carte,
          votre message, votre visite, utilisez le nom de l&rsquo;animal. &laquo;&nbsp;Je suis désolé pour
          Milo&nbsp;&raquo; n&rsquo;a rien à voir avec &laquo;&nbsp;je suis désolé pour ta perte&nbsp;&raquo;. Le nom
          dit : je me souviens de qui il était. Je sais que c&rsquo;était particulier.
        </p>
        <p>
          Si vous avez un souvenir de l&rsquo;animal, partagez-le. Même un petit. &laquo;&nbsp;Je repense encore au
          jour où Milo a volé mon sandwich au barbecue&nbsp;&raquo; réconforte plus que la plupart des cartes de
          condoléances.
        </p>

        <h2>2. Un repas dont il n&rsquo;a pas à s&rsquo;occuper</h2>
        <p>
          Le deuil est épuisant, et cuisiner est l&rsquo;une des premières choses qu&rsquo;on arrête de faire.
          Déposez un repas, commandez une livraison, ou remplissez son frigo de choses simples. Ce n&rsquo;est pas un
          cadeau spécifique au deuil animalier, mais c&rsquo;est celui dont les gens se souviennent le plus. Ne
          demandez pas &laquo;&nbsp;qu&rsquo;est-ce que je peux apporter ?&nbsp;&raquo;. Apportez simplement quelque
          chose. Demander ajoute une décision à une journée qui en a déjà trop.
        </p>

        <h2>3. Une photo encadrée que vous avez prise</h2>
        <p>
          Parcourez votre propre pellicule photo. Si vous avez déjà pris une photo de son animal, même une mauvaise,
          même floue en arrière-plan d&rsquo;une photo de groupe, faites-la imprimer et encadrer. Ça fonctionne
          précisément parce que c&rsquo;est une photo qu&rsquo;il n&rsquo;a jamais vue, sous un angle qu&rsquo;il
          n&rsquo;a pas choisi. Ça prouve que l&rsquo;animal a existé aussi dans la vie de quelqu&rsquo;un d&rsquo;autre.
        </p>

        <h2>4. Un mot manuscrit avec un vrai souvenir</h2>
        <p>
          Pas une carte de condoléances avec un poème imprimé. Un mot, de votre écriture, qui dit quelque chose de
          vrai sur l&rsquo;animal. Ce que vous aviez remarqué chez lui. Ce qu&rsquo;il faisait quand vous rendiez
          visite. Comment votre ami en parlait. Restez court. C&rsquo;est la précision qui donne sa valeur.
        </p>

        <h2>5. Un don en son nom</h2>
        <p>
          Renseignez-vous sur l&rsquo;origine de l&rsquo;animal (un refuge, une association de sauvetage, une
          organisation de race) et faites un don en son nom. Si vous ne connaissez pas son origine, choisissez un
          refuge local. Envoyez un simple message à votre ami : &laquo;&nbsp;J&rsquo;ai fait un don à [refuge] au nom
          de Milo&nbsp;&raquo;. Aucun montant n&rsquo;est trop petit. C&rsquo;est le geste qui compte.
        </p>

        <h2>6. Un livre souvenir ou un journal à remplir</h2>
        <p>
          Un journal vierge dédié à son animal peut être un cadeau chargé de sens, surtout si votre ami est du genre à
          se libérer en écrivant. Accompagnez-le d&rsquo;un mot : &laquo;&nbsp;Quand tu seras prêt, pour tout ce dont
          tu voudras te souvenir&nbsp;&raquo;. Ne le poussez pas à l&rsquo;utiliser tout de suite. Certains
          commencent à écrire la même semaine. D&rsquo;autres attendent des mois. Les deux sont bien.
        </p>
        <p>
          Si vous voulez lui suggérer un point de départ, la liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> a une section sur les
          chapitres plus difficiles, conçue exactement pour ce genre d&rsquo;écriture. Et s&rsquo;il a déjà des notes
          ou des entrées de la vie de son animal, le{" "}
          <a href="/fr/blog/ecrire-histoire-de-vie-animal">guide pour écrire l&rsquo;histoire de vie d&rsquo;un animal</a>{" "}
          peut l&rsquo;aider quand il sera prêt.
        </p>

        <h2>7. Une page mémorial ou un souvenir auquel revenir</h2>
        <p>
          Pour un ami qui apprécierait un espace permanent et partageable pour la mémoire de son animal, la{" "}
          <a href="/fr/memorial">page mémorial d&rsquo;Everypaw</a> lui permet de créer un endroit calme en ligne avec
          la photo de son animal, son propre message, et des hommages d&rsquo;autres personnes. C&rsquo;est le genre
          de cadeau qui fonctionne le mieux quand vous préparez l&rsquo;espace vous-même et l&rsquo;invitez à le
          remplir quand il sera prêt, plutôt que de lui confier une tâche pendant la semaine la plus difficile. Un{" "}
          <a href="/fr/gift">abonnement offert</a> couvre l&rsquo;année qu&rsquo;il faut pour le remplir.
        </p>
        <p>
          Pour plus d&rsquo;idées de souvenirs que le propriétaire peut créer lui-même, l&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a>
          couvre neuf approches, du point de vue du propriétaire.
        </p>

        <h2>Ce qu&rsquo;il faut éviter</h2>
        <p>Quelques attentions bien intentionnées qui tombent souvent mal :</p>
        <ul>
          <li>
            Tout ce qui sous-entend un délai. &laquo;&nbsp;Tu vas vite te sentir mieux&nbsp;&raquo; ou &laquo;&nbsp;Tu
            es prêt pour un nouveau ?&nbsp;&raquo; sont les deux phrases que les personnes en deuil entendent le plus
            et apprécient le moins.
          </li>
          <li>
            Les objets génériques &laquo;&nbsp;pont arc-en-ciel&nbsp;&raquo;, sauf si vous savez que votre ami se
            reconnaît dans cette imagerie. Pour beaucoup, ça semble impersonnel.
          </li>
          <li>
            Les portraits surprises ou les bijoux personnalisés sans vérifier avant. Ça peut être beau, mais ça exige
            une ressemblance juste, et un portrait qui ne ressemble pas à l&rsquo;animal peut blesser plus qu&rsquo;il
            n&rsquo;aide.
          </li>
          <li>
            Comparer les deuils. &laquo;&nbsp;Je sais ce que tu ressens, mon poisson rouge est mort en 2015&nbsp;&raquo;
            n&rsquo;est pas le réconfort que vous croyez, même si le sentiment était réel.
          </li>
        </ul>

        <h2>Le cadeau qui ne demande aucune préparation</h2>
        <p>
          Soyez présent. Envoyez un message sans attendre de réponse. Prononcez le nom de l&rsquo;animal. Évoquez un
          souvenir. Revenez trois semaines plus tard, quand tout le monde est déjà passé à autre chose, et
          reparlez-en, parce que le silence après la première vague de condoléances est souvent le moment le plus
          difficile.
        </p>
        <p>
          Le cadeau le plus attentionné pour un deuil animalier n&rsquo;est pas quelque chose qu&rsquo;on achète.
          C&rsquo;est la preuve que vous avez remarqué qui manquait.
        </p>
      </ArticleLayout>
    </>
  );
}

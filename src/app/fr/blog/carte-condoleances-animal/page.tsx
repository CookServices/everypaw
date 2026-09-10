import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("carte-condoleances-animal")!;

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
          Vous tenez une carte. Vous avez écrit &laquo;&nbsp;Cher/Chère [prénom],&nbsp;&raquo; et vous fixez
          maintenant l&rsquo;espace vide en dessous, parce que tout ce qui vous vient à l&rsquo;esprit sonne soit trop
          soit pas assez. L&rsquo;animal est mort hier, la semaine dernière, ou il y a un mois, et vous voulez dire
          quelque chose qui ait vraiment du sens.
        </p>
        <p>
          Bonne nouvelle : la barre est plus basse que vous ne le pensez. Une carte de condoléances pour un animal
          n&rsquo;a pas besoin d&rsquo;être éloquente. Elle doit être précise, courte, et sincère.
        </p>

        <h2>La seule règle qui compte</h2>
        <p>
          Utilisez le nom de l&rsquo;animal. Pas &laquo;&nbsp;votre chien&nbsp;&raquo;, &laquo;&nbsp;votre
          chat&nbsp;&raquo;, ou &laquo;&nbsp;votre animal&nbsp;&raquo;. Son nom. Ce seul détail transforme une carte
          générique en preuve que vous saviez qui manquait.
        </p>
        <p>
          &laquo;&nbsp;Je suis vraiment désolé(e) pour Biscuit&nbsp;&raquo; vaut déjà mieux que 90&nbsp;% des cartes
          de condoléances. Commencez par là.
        </p>

        <h2>Quoi écrire&nbsp;: des exemples simples</h2>
        <p>
          Pas besoin d&rsquo;écrire un paragraphe. Deux ou trois phrases suffisent. Voici quelques points de départ à
          utiliser tels quels ou à adapter&nbsp;:
        </p>
        <p>
          <strong>Quand vous connaissiez bien l&rsquo;animal&nbsp;:</strong>
          <br />
          &laquo;&nbsp;Je repense souvent au jour où Biscuit a volé ma chaussure et l&rsquo;a cachée sous le lit. Elle
          avait une personnalité si particulière, et votre maison va sembler différente sans elle. Je suis
          désolé(e).&nbsp;&raquo;
        </p>
        <p>
          <strong>Quand vous ne connaissiez pas bien l&rsquo;animal, mais que vous connaissez votre ami&nbsp;:</strong>
          <br />
          &laquo;&nbsp;Je voyais bien à quel point Luna comptait pour toi. Je suis désolé(e) qu&rsquo;elle soit
          partie. Si tu veux en parler, je suis là pour t&rsquo;écouter.&nbsp;&raquo;
        </p>
        <p>
          <strong>Quand vous ne savez pas quoi dire&nbsp;:</strong>
          <br />
          &laquo;&nbsp;Je n&rsquo;ai pas les mots justes, mais je veux que tu saches que je pense à toi et à Max. Il a
          eu de la chance de t&rsquo;avoir.&nbsp;&raquo;
        </p>
        <p>
          <strong>Pour un collègue ou une connaissance&nbsp;:</strong>
          <br />
          &laquo;&nbsp;J&rsquo;ai été triste d&rsquo;apprendre pour Charlie. Je sais qu&rsquo;il comptait beaucoup
          pour toi, et j&rsquo;espère que les bons souvenirs t&rsquo;apporteront un peu de réconfort.&nbsp;&raquo;
        </p>
        <p>
          <strong>Pour un enfant qui a perdu son animal&nbsp;:</strong>
          <br />
          &laquo;&nbsp;Je suis désolé(e) pour Pepper. C&rsquo;est normal d&rsquo;être vraiment triste. Elle savait
          que tu l&rsquo;aimais, et c&rsquo;est ce qui compte le plus.&nbsp;&raquo;
        </p>

        <h2>Ce qui fait qu&rsquo;une carte touche juste</h2>
        <p>Quelques petits choix qui font la différence entre une carte qu&rsquo;on garde et une qu&rsquo;on oublie&nbsp;:</p>
        <ul>
          <li>
            <strong>Un souvenir précis.</strong> Si vous avez déjà rencontré l&rsquo;animal, partagez un moment dont
            vous vous souvenez. Pas besoin que ce soit spectaculaire. &laquo;&nbsp;Je me souviens comme elle
            s&rsquo;asseyait toujours sur tes pieds&nbsp;&raquo; suffit.
          </li>
          <li>
            <strong>Reconnaissez le poids de la perte.</strong> Ne le minimisez pas. &laquo;&nbsp;Je sais à quel
            point il comptait pour toi&nbsp;&raquo; dit&nbsp;: ça compte, et je ne vais pas faire comme si ce
            n&rsquo;était pas le cas.
          </li>
          <li>
            <strong>N&rsquo;expliquez pas, ne philosophez pas.</strong> Évitez &laquo;&nbsp;tout arrive pour une
            raison&nbsp;&raquo; et &laquo;&nbsp;il est dans un monde meilleur&nbsp;&raquo;. Ces phrases parlent de
            votre confort, pas du sien.
          </li>
          <li>
            <strong>Datez la carte.</strong> Ça semble un détail, mais une carte datée devient un objet qu&rsquo;on
            garde.
          </li>
        </ul>

        <h2>Ce qu&rsquo;il faut éviter</h2>
        <p>Certaines phrases sont bien intentionnées mais tombent presque toujours mal&nbsp;:</p>
        <ul>
          <li>
            &laquo;&nbsp;Au moins, il a eu une belle vie.&nbsp;&raquo; C&rsquo;est probablement vrai, et ça n&rsquo;aide
            personne sur le moment.
          </li>
          <li>
            &laquo;&nbsp;Tu vas en reprendre un quand&nbsp;?&nbsp;&raquo; Ne dites jamais ça. Ni maintenant, ni dans
            un mois. Laissez la personne aborder le sujet elle-même.
          </li>
          <li>
            &laquo;&nbsp;Je sais ce que tu ressens, mon hamster est mort en 2009.&nbsp;&raquo; Votre empathie est
            réelle, mais ramener la conversation à votre propre expérience déplace le sujet.
          </li>
          <li>
            &laquo;&nbsp;Il est dans un monde meilleur.&nbsp;&raquo; Vous le pensez peut-être sincèrement. Mais dans
            les premiers jours du deuil, &laquo;&nbsp;un monde meilleur&nbsp;&raquo; peut sonner comme &laquo;&nbsp;mieux
            que d&rsquo;être avec toi&nbsp;&raquo;, même si ce n&rsquo;est pas ce que vous voulez dire.
          </li>
          <li>
            &laquo;&nbsp;Ce n&rsquo;est qu&rsquo;un chien/chat.&nbsp;&raquo; Si quelqu&rsquo;un dit ça à votre ami,
            cette personne n&rsquo;aide pas.
          </li>
        </ul>

        <h2>Au-delà de la carte</h2>
        <p>
          Une carte est un point de départ. Si vous voulez faire plus, le{" "}
          <a href="/fr/blog/cadeaux-deuil-animalier">guide des cadeaux pour un deuil animalier</a> propose des idées
          qui vont au-delà des mots&nbsp;: une photo encadrée que vous avez prise, un don au nom de l&rsquo;animal, un
          repas livré sans qu&rsquo;on ait eu à le demander. Et si votre ami est du genre à traiter son deuil par
          l&rsquo;écriture, lui partager l&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a>,
          quand il sera prêt, pourrait être bienvenu.
        </p>
        <p>
          La chose la plus importante que vous puissiez faire n&rsquo;est pas dans la carte. C&rsquo;est de reprendre
          contact trois semaines plus tard, quand la première vague de soutien est passée et que le silence
          s&rsquo;installe. Reprononcez le nom de l&rsquo;animal. C&rsquo;est là que ça compte le plus.
        </p>
      </ArticleLayout>
    </>
  );
}

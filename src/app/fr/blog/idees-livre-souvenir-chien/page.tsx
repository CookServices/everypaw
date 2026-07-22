import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("idees-livre-souvenir-chien")!;

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
          Votre pellicule photo compte des centaines de photos de votre chien. Posez-vous maintenant une question
          inconfortable : pour combien d&rsquo;entre elles pourriez-vous encore dire ce qui se passait ce jour-là, et
          pourquoi vous avez sorti votre téléphone ?
        </p>
        <p>
          C&rsquo;est le vide que comble un livre souvenir pour chien. Ce n&rsquo;est pas un album photo. C&rsquo;est
          l&rsquo;histoire autour des photos : le contexte, les manies, le chaos, les mardis ordinaires. Voici douze
          idées pour en construire un qui ressemble vraiment à votre chien, plus l&rsquo;habitude qui décide si le
          livre sera un jour terminé.
        </p>

        <h2>Commencez par des histoires, pas par des photos</h2>
        <p>
          Les photos capturent à quoi ressemblait un moment. Un livre souvenir a besoin de pourquoi il comptait, et
          cette partie ne vit que dans votre mémoire, qui est justement la partie qui s&rsquo;efface. Alors avant de
          penser à la mise en page, au papier ou à l&rsquo;impression, commencez à collecter de courtes notes écrites
          à côté de vos photos : une ou deux phrases par moment, écrites près du moment où il s&rsquo;est produit. Si
          vous ne savez pas quoi écrire, une liste de{" "}
          <a href="/fr/blog/prompts-journal-animalier">prompts de journal animalier</a> règle le problème de la page
          blanche en trente secondes.
        </p>
        <p>
          Une fois cette habitude en place, chaque idée ci-dessous devient facile. Sans elle, la plupart sont
          impossibles à reconstituer plus tard.
        </p>

        <h2>Six pages qui racontent qui est votre chien</h2>

        <h3>1. Le chapitre des origines</h3>
        <p>
          Le jour où il est arrivé à la maison : comment vous l&rsquo;avez trouvé, le trajet du retour, la première
          nuit, et pourquoi ce chien et pas un autre. Vous êtes certain de vous souvenir de ces détails pour toujours.
          Écrivez-les quand même ; la certitude s&rsquo;efface plus vite qu&rsquo;on ne le pense.
        </p>

        <h3>2. Son dictionnaire personnel</h3>
        <p>
          Les mots qu&rsquo;il connaît vraiment, les sons qu&rsquo;il fait et ce que chacun signifie, et les ordres
          qu&rsquo;il connaît techniquement mais choisit de négocier. Cette page devient plus drôle chaque année.
        </p>

        <h3>3. La chronologie des surnoms</h3>
        <p>
          Chaque chien accumule des noms. Listez-les dans l&rsquo;ordre d&rsquo;apparition, chacun avec son histoire
          d&rsquo;origine : l&rsquo;incident, la mauvaise prononciation, l&rsquo;enfant qui n&rsquo;arrivait pas à
          dire le vrai nom.
        </p>

        <h3>4. Une carte de son monde</h3>
        <p>
          Dessinez ou annotez la promenade habituelle : le coin qui doit être reniflé, la maison avec le chat,
          l&rsquo;endroit où il ralentit toujours, le banc où vous vous reposez tous les deux. Le territoire
          d&rsquo;un chien est une biographie.
        </p>

        <h3>5. Ce qu&rsquo;il aime et déteste, classé</h3>
        <p>
          Un classement officiel et solennel des nourritures, des humains, des parcs et de la météo, idéalement avec
          des preuves photographiques attachées aux entrées du haut et du bas.
        </p>

        <h3>6. Le musée des jouets</h3>
        <p>
          Des portraits des jouets qu&rsquo;il a aimés jusqu&rsquo;à destruction, avec leurs noms et leurs dates de
          service approximatives. Quiconque a jeté un canard en peluche désintégré sait pourquoi cette page compte.
        </p>

        <h2>Six pages pour les moments que vous oublierez</h2>

        <h3>7. Un mardi ordinaire</h3>
        <p>
          Documentez une journée parfaitement normale, heure par heure : le réveil, la danse du petit-déjeuner, les
          positions de sieste, la patrouille à la fenêtre, l&rsquo;effondrement du soir. Rien ne se passe sur cette
          page, et dans dix ans ce sera celle que vous ne pourrez pas arrêter de relire.
        </p>

        <h3>8. La page des premières fois</h3>
        <p>
          Première neige, première mer, premier escalier, premier tonnerre, la trêve historique avec l&rsquo;aspirateur.
          Les premières fois ne s&rsquo;arrêtent pas après le stade chiot ; elles arrêtent juste d&rsquo;être notées.
        </p>

        <h3>9. Complices de crime</h3>
        <p>
          Ses amis chiens, ses humains préférés, le chat qu&rsquo;il fait semblant de tolérer. Les relations
          représentent la moitié de la vie d&rsquo;un chien et n&rsquo;arrivent presque jamais dans l&rsquo;album.
        </p>

        <h3>10. Le chapitre des bêtises</h3>
        <p>
          Les meilleures catastrophes, racontées avec amour : le casse de la chaussette, l&rsquo;incident de la
          poubelle, le canapé. Le temps transforme ces moments en vos histoires préférées. Donnez-leur la page
          qu&rsquo;ils méritent.
        </p>

        <h3>11. Quatre saisons, un seul endroit</h3>
        <p>
          Le même endroit, photographié quatre fois dans l&rsquo;année avec votre chien dedans. Si vous avez des
          photos de lui chiot au même endroit, ajoutez une paire avant-après.
        </p>

        <h3>12. Des lettres pour lui</h3>
        <p>
          Une courte lettre à chaque anniversaire. Observez comment votre propre voix change au fil des années ; cela
          devient discrètement aussi un journal sur vous. Si vous écrivez des lettres à un animal qui n&rsquo;est plus
          là, l&rsquo;article{" "}
          <a href="/fr/blog/idees-souvenirs-deuil-animal">idées de souvenirs après la perte d&rsquo;un animal</a> a
          d&rsquo;autres façons d&rsquo;honorer sa mémoire.
        </p>

        <h2>Faites en sorte que ça leur ressemble, pas à un modèle</h2>
        <ul>
          <li>
            Donnez à chaque photo une légende avec une date et une phrase de contexte. &laquo;&nbsp;Pourquoi on
            riait&nbsp;&raquo; vaut plus qu&rsquo;un éclairage parfait.
          </li>
          <li>
            Si vous lui parlez avec une &laquo;&nbsp;voix&nbsp;&raquo; particulière à la maison, écrivez certaines
            légendes avec elle. Le livre doit sonner comme votre foyer.
          </li>
          <li>
            Gardez la photo floue si l&rsquo;histoire derrière est bonne. Le flou signifie généralement qu&rsquo;il se
            passait quelque chose.
          </li>
          <li>
            Préférez les routines réelles aux photos posées. La façon dont il dort vraiment vaut mieux que la façon
            dont il s&rsquo;assoit pour les friandises.
          </li>
        </ul>

        <h2>L&rsquo;habitude qui décide de tout</h2>
        <p>
          La plupart des projets de livre souvenir n&rsquo;échouent pas à l&rsquo;étape du design. Ils échouent à
          &laquo;&nbsp;je trierai mes photos un jour&nbsp;&raquo;. La solution est de construire le livre en le
          vivant : une courte note par moment, écrite le jour même. Faites ça, et assembler un livre souvenir pour
          chien devient une après-midi au lieu d&rsquo;une montagne. Le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> en dit plus sur la
          construction de cette habitude quotidienne et sur la façon d&rsquo;écrire des entrées qui tiennent des
          années plus tard.
        </p>
        <p>
          C&rsquo;est comme ça qu&rsquo;Everypaw voit les choses : vous notez les petits moments, l&rsquo;IA les
          transforme en chapitres d&rsquo;histoire mensuels, et en fin d&rsquo;année ils deviennent un livre relié
          imprimé. Quelle que soit votre méthode, commencez par la promenade de ce soir.
        </p>
      </ArticleLayout>
    </>
  );
}

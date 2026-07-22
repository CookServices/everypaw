import type { Metadata } from "next";
import ArticleLayout from "@/components/blog/ArticleLayout";
import { getPostFr } from "@/lib/blog";

const post = getPostFr("prompts-journal-animalier")!;

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
          Le plus difficile quand on tient un journal animalier, ce n&rsquo;est pas de trouver le temps. C&rsquo;est la
          page blanche. Vous vous installez, votre chien dort à un mètre de vous en train de faire quelque chose
          d&rsquo;objectivement adorable, et votre cerveau ne produit toujours rien de mieux que &laquo;&nbsp;journée
          sympa&nbsp;&raquo;.
        </p>
        <p>
          Les prompts règlent ce problème. Un bon prompt transforme &laquo;&nbsp;je devrais écrire quelque
          chose&nbsp;&raquo; en une question à laquelle vous pouvez répondre en une phrase, en trente secondes, sur
          votre téléphone. Voici 50 prompts de journal animalier organisés par thème : le quotidien, la personnalité,
          les étapes importantes, votre lien, et les chapitres plus difficiles. Vous n&rsquo;en aurez jamais besoin de
          tous. Il vous en faut juste un, les jours où rien ne vient.
        </p>

        <h2>Comment utiliser ces prompts</h2>
        <p>
          Quelques règles simples pour que tenir un journal sur votre animal reste durable, sans devenir une corvée de
          plus :
        </p>
        <ul>
          <li>
            Une phrase suffit pour une entrée complète. &laquo;&nbsp;Il est resté assis devant la porte pendant 20
            minutes après le vétérinaire&nbsp;&raquo; est une entrée parfaite. Ce n&rsquo;est pas la longueur qui
            compte, c&rsquo;est la précision.
          </li>
          <li>N&rsquo;allez pas dans l&rsquo;ordre. Parcourez la liste, choisissez celui qui vous inspire aujourd&rsquo;hui, ignorez le reste.</li>
          <li>
            Datez tout. Dans cinq ans, &laquo;&nbsp;octobre 2026, quand elle tenait encore dans une main&nbsp;&raquo;
            porte la moitié de l&rsquo;émotion.
          </li>
          <li>
            Les légendes de photo comptent. Si écrire vous pèse, décrivez la photo que vous venez de prendre. C&rsquo;est
            exactement ce contexte qui s&rsquo;efface en premier.
          </li>
        </ul>

        <h2>Moments du quotidien (prompts 1 à 10)</h2>
        <p>
          Les journées ordinaires sont celles qui s&rsquo;effacent le plus vite de la mémoire, et celles qui compteront
          le plus plus tard.
        </p>
        <ul>
          <li>1. Qu&rsquo;a-t-il fait aujourd&rsquo;hui qui vous a fait sourire, même une seconde ?</li>
          <li>2. Décrivez sa position exacte sur le canapé (ou le lit, ou la chaise interdite) en ce moment même.</li>
          <li>3. Quel est son jouet préféré du moment, et dans quel état est-il ?</li>
          <li>4. Quel son a-t-il fait aujourd&rsquo;hui que vous reconnaîtriez entre mille ?</li>
          <li>
            5. Décrivez la promenade du jour en trois détails : quelque chose qu&rsquo;il a senti, quelqu&rsquo;un
            qu&rsquo;il a rencontré, un endroit qu&rsquo;il a refusé de quitter.
          </li>
          <li>6. Qu&rsquo;a-t-il fait pendant que vous prépariez le dîner ?</li>
          <li>7. Comment vous a-t-il réveillé ce matin, et à quelle heure, exactement ?</li>
          <li>8. Décrivez son rituel du dîner : la danse, le regard fixe, l&rsquo;endroit exact où il attend.</li>
          <li>9. Que fait-il quand il pleut ?</li>
          <li>10. Quelle petite routine a eu lieu aujourd&rsquo;hui, celle qui se répète absolument tous les jours ?</li>
        </ul>

        <h2>Personnalité et manies (prompts 11 à 20)</h2>
        <p>
          C&rsquo;est la section que vous relirez le plus dans le futur. Si vous avez un chat et que ces prompts vous
          semblent trop orientés chien, le{" "}
          <a href="/fr/blog/livre-souvenir-chat">guide du livre souvenir pour chat</a> propose des prompts et des
          structures pensés pour des compagnons plus discrets.
        </p>
        <ul>
          <li>11. Listez ses surnoms et comment chacun est né.</li>
          <li>12. De quoi a-t-il complètement, irrationnellement peur ?</li>
          <li>13. Quelle &laquo;&nbsp;règle&nbsp;&raquo; de la maison a-t-il inventée, et que vous suivez maintenant ?</li>
          <li>14. S&rsquo;il pouvait dire une seule phrase, laquelle serait-ce ?</li>
          <li>15. Que se passe-t-il quand vous prononcez son mot préféré à voix haute ?</li>
          <li>16. Décrivez sa tête de coupable, et ce qui la déclenche habituellement.</li>
          <li>17. Qui est sa personne préférée, et comment le savez-vous ?</li>
          <li>18. Quelle est la chose la plus étrange qu&rsquo;il ait jamais revendiquée comme sienne ?</li>
          <li>19. Comment réclame-t-il de l&rsquo;attention ? Décrivez toute l&rsquo;escalade, étape par étape.</li>
          <li>20. Quelle habitude n&rsquo;aurait de sens que pour quelqu&rsquo;un qui vit avec lui ?</li>
        </ul>

        <h2>Premières fois et étapes importantes (prompts 21 à 30)</h2>
        <p>
          Si vous êtes dans les douze premiers mois, un{" "}
          <a href="/fr/blog/livre-souvenir-premiere-annee-chiot">guide mois par mois du livre souvenir du chiot</a> peut
          vous aider à structurer toute l&rsquo;année autour de ces premières fois.
        </p>
        <ul>
          <li>21. Racontez l&rsquo;histoire du jour où vous l&rsquo;avez ramené à la maison, avec tous les détails qu&rsquo;il vous reste.</li>
          <li>22. Comment s&rsquo;est vraiment passée sa première nuit ?</li>
          <li>23. Comment a-t-il eu son nom, et quels étaient les candidats rejetés ?</li>
          <li>24. Comment s&rsquo;est passé son premier trajet en voiture ou son premier voyage ?</li>
          <li>25. Quelle a été la première fois qu&rsquo;il vous a fait rire aux éclats ?</li>
          <li>26. Quelle &laquo;&nbsp;première fois&nbsp;&raquo; s&rsquo;est produite récemment : une nouvelle nourriture, un nouvel ami, un nouvel endroit ?</li>
          <li>27. Quand avez-vous compris qu&rsquo;il vous faisait confiance ?</li>
          <li>28. Décrivez sa première rencontre avec la neige, la mer, les escaliers ou un miroir.</li>
          <li>29. Quel moment d&rsquo;apprentissage a enfin fonctionné, et qu&rsquo;est-ce qui a fait le déclic ?</li>
          <li>30. Comment avez-vous célébré son dernier anniversaire ou son adoption ?</li>
        </ul>

        <h2>Votre lien (prompts 31 à 40)</h2>
        <ul>
          <li>31. Décrivez, geste par geste, comment il vous accueille quand vous rentrez.</li>
          <li>32. Que fait-il quand vous êtes triste ?</li>
          <li>33. Décrivez un moment cette semaine où vous êtes simplement restés assis ensemble.</li>
          <li>34. Qu&rsquo;a-t-il changé en vous ?</li>
          <li>35. Un jour loin de lui, qu&rsquo;est-ce qui vous manque en premier ?</li>
          <li>36. Racontez une journée difficile qu&rsquo;il a rendue meilleure sans le savoir.</li>
          <li>37. Que ressentez-vous quand il est complètement calme à côté de vous ?</li>
          <li>38. Que lui dites-vous quand personne d&rsquo;autre n&rsquo;est là ?</li>
          <li>39. Décrivez la façon dont il vous regarde quand il veut quelque chose, et quand il ne veut rien du tout.</li>
          <li>40. Laquelle de ses routines est discrètement devenue l&rsquo;une des vôtres ?</li>
        </ul>

        <h2>Les chapitres plus difficiles (prompts 41 à 50)</h2>
        <p>
          Les visites chez le vétérinaire, le vieillissement, la maladie et la perte font aussi partie de
          l&rsquo;histoire. Ce sont les entrées les plus difficiles à écrire, et celles pour lesquelles vous serez le
          plus reconnaissant. Si vous écrivez pendant un deuil, allez à votre rythme. Et si vous cherchez une façon
          d&rsquo;honorer un animal que vous avez perdu, un{" "}
          <a href="/fr/memorial">livre mémorial pour animal</a> peut en faire partie.
        </p>
        <ul>
          <li>41. Comment a-t-il vécu le vétérinaire aujourd&rsquo;hui, et vous, comment l&rsquo;avez-vous vécu ?</li>
          <li>42. Qu&rsquo;est-ce qui a rendu une journée de maladie plus facile pour vous deux ?</li>
          <li>43. Qu&rsquo;est-ce qui a changé avec l&rsquo;âge, et qu&rsquo;est-ce qui n&rsquo;a pas du tout changé ?</li>
          <li>44. Que voulez-vous retenir de lui exactement tel qu&rsquo;il est aujourd&rsquo;hui ?</li>
          <li>
            45. Écrivez sur son museau qui grisonne, ses promenades plus lentes, ou ses siestes plus longues, avec
            tendresse plutôt que tristesse.
          </li>
          <li>46. S&rsquo;il pouvait comprendre chaque mot pendant une minute, que lui diriez-vous ?</li>
          <li>47. Notez une frayeur qui s&rsquo;est bien terminée, maintenant que c&rsquo;est derrière vous.</li>
          <li>48. Que fait-il encore exactement comme quand il était chiot ou chaton ?</li>
          <li>49. Si vous pouviez garder un seul de ses rituels pour toujours, lequel serait-ce ?</li>
          <li>50. Décrivez-le aujourd&rsquo;hui comme si vous relisiez ce texte dans dix ans.</li>
        </ul>

        <h2>Comment faire tenir l&rsquo;habitude</h2>
        <ul>
          <li>
            Rattachez-la à une routine que vous avez déjà : après la promenade du soir, avec votre café du matin, juste
            après le repas.
          </li>
          <li>
            Gardez la règle de la phrase unique sacrée. Le jour où vous déciderez que les entrées doivent être
            &laquo;&nbsp;bonnes&nbsp;&raquo;, vous arrêterez d&rsquo;écrire.
          </li>
          <li>Ne rattrapez pas par culpabilité. Vous avez raté trois semaines ? Ce n&rsquo;est pas grave. Recommencez aujourd&rsquo;hui.</li>
          <li>Laissez les entrées imparfaites. Fautes, fragments, pensées à moitié formées : c&rsquo;est un journal, pas un essai.</li>
        </ul>
        <p>
          Pour aller plus loin sur la construction d&rsquo;une habitude durable, le{" "}
          <a href="/fr/blog/comment-tenir-journal-animalier">guide du journal animalier</a> couvre la fréquence, le
          format, et comment écrire des entrées qui traversent le temps.
        </p>

        <h2>Des notes éparses à leur histoire</h2>
        <p>
          Prises séparément, ces entrées sont petites. Ensemble, elles racontent une vie : les promenades, les manies,
          les jours difficiles, les jours ridicules. C&rsquo;est l&rsquo;idée derrière Everypaw : vous écrivez les
          moments en une phrase, et chaque mois ils se transforment en chapitre d&rsquo;histoire, puis en fin
          d&rsquo;année en un livre relié imprimé. Si vous voulez aller plus loin, voici{" "}
          <a href="/fr/blog/idees-livre-souvenir-chien">12 idées de livre souvenir pour chien</a> qui transforment ces
          entrées en pages qui valent la peine d&rsquo;être gardées. Et si vous êtes prêt à transformer ces entrées en
          récit complet, voici un guide pour{" "}
          <a href="/fr/blog/ecrire-histoire-de-vie-animal">écrire l&rsquo;histoire de vie de votre animal</a>, étape
          par étape. Mais quel que soit l&rsquo;outil que vous utilisez, le principe reste le même : une phrase
          honnête à la fois, en commençant aujourd&rsquo;hui.
        </p>
      </ArticleLayout>
    </>
  );
}

# Kit des deux tests à zéro code de PP-1

Spec : `docs/acquisition/specs.md`, section « Deux tests à zéro code ». Leur résultat décide si PP-4 s'écrit.

---

## Test 1 : porte A, le partage

**Mesure** : clics et réactions à 48 h, dans deux groupes Facebook pet loss francophones et sur r/petloss. Zéro = la porte A ne se construit pas.

### Un écart avec la spec, à trancher avant de poster

La spec prévoit un mémorial « avec un animal de test ». Je déconseille : publier le deuil d'un animal qui n'existe pas dans un groupe de soutien, c'est tromper des gens en deuil, et la plupart de ces groupes l'interdisent (bannissement, et la marque reste associée au faux post). Deux options honnêtes :

1. **Un vrai animal** : le tien, ou celui d'un proche qui accepte que son mémorial serve au test.
2. **Un post transparent de créateur** : « j'ai créé cet outil, est-ce que ça vous parlerait ? ». Le test mesure alors l'intérêt pour l'outil, pas le partage spontané, ce qui est une hypothèse un peu différente.

Avant de poster dans un groupe, lire ses règles ; beaucoup interdisent les liens commerciaux sans accord des modérateurs. Leur écrire d'abord est souvent la seule voie.

### Texte proposé (option 1, vrai animal)

> Ça fait [durée] que [nom] est parti(e). Je n'arrivais pas à écrire quelque chose de juste, alors j'ai essayé une page où on dépose trois souvenirs et où elle devient une lettre, écrite comme si c'était [nom] qui parlait. Je la partage ici parce que vous êtes les seuls à comprendre ce que ça fait. [lien de la page]
>
> Si vous voulez en créer une pour le vôtre, c'est gratuit et sans compte : everypaw.app/fr/memorial. Transparence : j'ai créé cet outil.

### Version r/petloss (anglais)

> It's been [time] since [name] passed. I couldn't find the right words, so I tried a page where you leave three memories and it turns them into a letter, written as if [name] were speaking. Sharing it here because you're the ones who get it. [link]
>
> Full disclosure: I built this tool. It's free and needs no account if you want to make one: everypaw.app/memorial

### À relever à 48 h

| Canal | Vues de la page (`view_count`) | Réactions | Commentaires | Pages créées depuis (`funnel.sql`) |
|---|---|---|---|---|
| Groupe FB 1 | | | | |
| Groupe FB 2 | | | | |
| r/petloss | | | | |

`view_count` se lit sur la ligne `public_pages` de la page postée ; les pages créées ensuite, par `supabase/analytics/funnel.sql`.

---

## Test 2 : porte B, le chapitre impressionne

**Mesure** : la réaction de cinq personnes hors de ton cercle à un chapitre écrit depuis trois lignes. « Mignon mais bof » = la porte B ne convertira pas.

### Protocole

1. Montrer d'abord **les trois lignes seules**, puis le chapitre. L'effet à mesurer, c'est l'écart entre les deux.
2. Ne rien dire de l'outil avant la lecture, ni « c'est de l'IA », ni « c'est mon projet ». Le dire après, et noter si ça change l'avis.
3. Poser les quatre questions ci-dessous, telles quelles, et noter les mots exacts de la réponse.
4. Idéalement, une des cinq personnes avec son propre animal : lui demander ses trois lignes et générer devant elle sur everypaw.app/fr/memorial/new, porte « animal vivant » (c'est l'écran de PP-4, non encore ouvert : utiliser le chapitre ci-dessous sinon).

### Les quatre questions

1. Ta première réaction, en un mot ?
2. Qu'est-ce qui sonne juste, qu'est-ce qui sonne faux ?
3. Si c'était ton animal, tu l'enverrais à quelqu'un ? À qui ?
4. Tu paierais pour en recevoir un chaque mois, puis un livre imprimé en fin d'année ? Combien ?

### Grille

| Personne | Mot de la Q1 | Juste / faux | L'enverrait à | Paierait, combien | Verdict (waouh / mignon mais bof / non) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

### Deux chapitres prêts à montrer

Générés le 2026-11-03 avec le prompt de production des pages publiques (porte « animal vivant »), depuis trois lignes inventées.

**Pistache (chatte).** Les trois lignes :
- Elle dort tous les après-midi dans le carton de la livraison, jamais dans son panier à 40 euros.
- Elle miaule devant la porte de la salle de bain jusqu'à ce qu'on la laisse entrer, puis repart aussitôt.
- Le soir, elle vient se coucher sur mon clavier pile quand je dois finir un mail.

> **Pistache prend ses quartiers**
>
> Je m'appelle Pistache, et je suis chatte avec tout ce que cela implique de sérieux, de précision et d'exigences bien placées. Mes journées ont un rythme que j'ai mis au point avec soin : l'observation matinale du jardin depuis le rebord de la fenêtre, quelques étirements dignes d'une gymnaste, et puis le grand moment, celui que j'attends en secret depuis le réveil. Ce carton brun arrivé un mardi, celui qui sent encore un peu le papier d'emballage, est devenu mon royaume. Tu as posé là un panier moelleux, tout propre, tout neuf, mais le carton a quelque chose que le panier n'aura jamais : il est à moi parce que je l'ai choisi.
>
> Je t'observe beaucoup, tu sais. Je sais quand tu t'enfermes dans la salle de bain et je sais aussi que tu finiras par ouvrir la porte si j'insiste avec la bonne note dans la voix. Ce n'est pas vraiment l'envie d'entrer qui me pousse, c'est plutôt le principe, la certitude que les portes closes sont une idée fragile face à moi. Et le soir, quand tu t'installes devant ton écran avec cet air concentré et pressé, je reconnais le moment parfait pour venir m'allonger sur ton clavier. Tes mots peuvent attendre. Moi, Pistache, je suis là, maintenant, chaude et ronronnante, et c'est bien plus important qu'un mail.
>
> Il y a encore tellement de cartons à tester, de portes à questionner, de soirées à interrompre avec tendresse. Cette vie que nous partageons, toi et moi, elle est faite de ces petits instants répétés et jamais tout à fait pareils. Et je compte bien en savourer chacun, à ma façon, à mon heure.

**Gaston (chien).** Les trois lignes :
- Il a peur des sacs plastique mais affronte les gros chiens sans hésiter.
- Chaque matin il apporte une chaussette, jamais la paire, toujours la même couleur.
- Quand ma fille rentre de l'école, il fait trois tours sur lui-même avant de lui sauter dessus.

> **Gaston, chien sans pareille**
>
> Je m'appelle Gaston, et je suis un chien qui prend ses responsabilités très au sérieux. Chaque matin, avant même que le soleil ait fini de se décider, je descends en mission. Je fouille le panier à linge, je cherche, je renifle, et je trouve toujours ce qu'il me faut : une chaussette. Jamais la paire, ce serait trop simple. Toujours la même couleur, parce que j'ai mes principes. Je la dépose ensuite au pied du lit, fier comme un soldat qui a accompli son devoir. Les détails comptent, dans ce métier.
>
> Il faut savoir qui je suis vraiment. Je suis courageux, d'abord. Les gros chiens du quartier ? Je leur tiens tête sans ciller, le poitrail en avant, la queue haute. Mais qu'un sac plastique vienne à froisser ses ailes de papier dans le couloir, et me voilà qui recule de trois pas, le cœur battant à toute vitesse. La vie est pleine de mystères, et certains sont franchement dangereux. Et puis il y a le moment que j'attends chaque après-midi comme une fête : quand la petite rentre de l'école. Je la sens arriver bien avant que la porte ne s'ouvre. Alors je tourne, je tourne, trois fois exactement, parce que trois c'est le bon chiffre, et je lui saute dessus avec tout l'amour que j'ai accumulé depuis le matin.
>
> Gaston n'a pas fini d'écrire son histoire. Il y a encore tant de chaussettes à trouver, tant de matins à inventer ensemble, tant de retours à fêter comme si c'était la première fois. Ce journal, c'est le nôtre, tu sais. Et je compte bien le remplir jusqu'au bout, page après page, avec toi.

Défaut repéré en les relisant, à garder en tête si les testeurs le relèvent : le titre « Gaston, chien sans pareille » porte une faute d'accord (« sans pareil »), et le modèle invente des détails absents des trois lignes (le jardin, le mardi, le panier à linge).

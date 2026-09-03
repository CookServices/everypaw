# Chantier conversion Print — roadmap

Objectif unique : faire passer un utilisateur actif au plan Print à 79 €/an.
Horizon septembre 2026 à février 2027, saison visée Noël 2026.
Les specs exécutables sont dans [specs.md](specs.md).

## Le constat

Cinq nombres décident de tout :

| Nombre | Ce qu'il vaut |
|---|---|
| ~~7~~ **14** | ~~chapitres~~ **pages remplies** minimum pour commander (`MIN_FILLED_PAGES_TO_ORDER`, P1-3) |
| **3** | entrées par période pour générer un chapitre (`plan-guards.ts`) |
| **1** | histoire en plan gratuit, et 10 entrées au total |
| **28** | pages imprimées, plancher imposé par Gelato |
| **79 €** | Print par an, livre inclus, 28 € de valeur |

Mis bout à bout : **un utilisateur gratuit ne peut pas atteindre un livre.** Il lui faudrait 7
chapitres, donc au moins 21 entrées réparties sur 7 périodes, alors qu'il est plafonné à 10
entrées et 1 histoire. Le désir d'imprimer ne peut donc pas naître pendant la période où il
décide s'il paie.

**Et le seuil ne protégeait pas ce qu'on croyait.** Un chapitre occupait exactement une page,
ses photos étaient composées dedans, et toutes les photos orphelines tenaient sur une seule page
plafonnée à six : un livre commandé au seuil des 7 chapitres contenait dix pages de contenu et
**dix-huit pages blanches**.

**Corrigé par P1-3** (2026-09-03) : les photos non rattachées se paginent 2 par page (plafond 30
pages), les étapes 8 par page, et les pages blanches ne sont plus que le complément final au
multiple de 4. Le seuil de commande compte désormais les pages remplies. Trois chapitres, quarante
photos et douze étapes donnent 25 pages de contenu et 3 blanches.

## Le calendrier

| Phase | Fenêtre | Ce qui doit exister à la fin |
|---|---|---|
| **0** Voir le tunnel | 3 au 16 septembre | ✅ livrée le 2026-09-03 (P0-1, P0-2) |
| **1** Livre atteignable | 17 septembre au 29 octobre | ✅ livrée le 2026-09-03 (P1-1, P1-2, P1-3), en avance |
| **2** Déclencher | 30 octobre au 24 décembre | ✅ livrée le 2026-09-03 (P2-1, P2-2, P2-3), en avance |
| **3** Dire le prix | janvier 2027 | Pas commencée, après la première mesure post-saison |

Les huit specs des phases 0 à 2 sont écrites et testées, en PR empilées #145 à #152. Ce qu'il reste
n'est pas du code : la vérification visuelle des parcours et la commande Gelato réelle.

Les phases gardent leur ordre. Viser Noël avec cette contrainte laisse **zéro marge**, et
c'est la phase 1 qui absorbera tout retard.

**Gel du pipeline d'impression, 7 novembre au 31 décembre.** Aucune modification de
`book-pdf`, `calcPageCount` ou `gelato/order` pendant la saison. Ces trois-là doivent bouger
ensemble pour que le nombre de pages déclaré corresponde au fichier envoyé ; un refus Gelato
le 10 décembre coûterait l'année.

~~**Repli si la phase 1 déborde le 29 octobre**~~ : sans objet, la phase 1 est livrée le
2026-09-03, sept semaines avant l'échéance. P1-3 n'a pas eu à être reportée.

**Sur les délais de Noël** : le cadeau offre un abonnement, pas un colis. Aucune contrainte
d'expédition avant le 24 décembre, le destinataire commandera son livre quand il aura rempli
son journal.

## L'argument de prix

| | |
|---|---|
| Digital pendant douze mois | 59,88 € |
| Un livre imprimé acheté à part | 28,00 € |
| **Séparément** | **87,88 €** |
| **Plan Print** | **79,00 €** |

L'écart est réel et vérifiable dans le code. Une page de tarifs qui aligne deux colonnes de
fonctionnalités le rend invisible ; deux lignes de calcul le rendent évident. C'est l'objet de
la phase 3.

## Ce qui n'est pas recommandé

- **Pas de test A/B.** Au dernier comptage connu, la base réelle se comptait en unités. À ce
  volume un test ne mesure que du bruit, et coûte le double du travail.
- **Pas de nouvelle acquisition avant la phase 1.** Envoyer du trafic sur un tunnel où le
  livre est hors d'atteinte revient à payer pour remplir un seau percé.
- **Pas de refonte de la page de tarifs isolée.** Elle ne convertira pas mieux tant que
  l'utilisateur n'a pas vu son propre livre.

## Décisions prises

| Date | Décision |
|---|---|
| 2026-09-02 | Priorité conversion Print, horizon septembre à février |
| 2026-09-02 | Le livre minimum se remplit avec des pages photos et des étapes ; le plancher de 28 pages reste celui de l'imprimeur |
| 2026-09-02 | Noël 2026 visé, phases dans l'ordre, campagne figée au plus tard le 7 novembre |
| 2026-09-02 | Les événements d'achat partent sans aucune donnée utilisateur |
| 2026-09-03 | Photos du livre à **2 par page**, pas 6 : à 6 le critère d'acceptation de P1-3 était inatteignable et le livre restait aux deux tiers blanc. Plafond de 30 pages photos |
| 2026-09-03 | Le livre supplémentaire est facturé sur la **sélection réellement commandée** et non sur un pire cas ; en contrepartie `gelato/order` refuse un livre plus grand que les pages payées |
| 2026-09-03 | Le lien livre de la page mémorial va au pied de page et non dans l'en-tête : une pastille d'achat en tête d'une page de deuil se lit comme une bannière commerciale |

## Décisions en attente

- **Le plan Supabase.** Sans base de recette, chaque vérification de paiement se fait en
  production avec une vraie carte. C'est le goulot de toutes les validations en attente.

## Ce qui reste ouvert, et son échéance

| Échéance | Point | Pourquoi il ne peut pas être fermé en PR |
|---|---|---|
| **7 novembre** | Une commande Gelato réelle acceptée avec la nouvelle pagination | Gelato refuse un fichier dont le nombre de pages contredit la commande. Les tests prouvent que déclaré = rendu, seul l'imprimeur prouve que le fichier passe. Après cette date, le pipeline est gelé jusqu'au 31 décembre |
| Avant la saison | Passe visuelle des parcours des phases 1 et 2 | Demande une session applicative |
| Fait le 2026-09-03 | `GA_API_SECRET` et `META_CAPI_TOKEN` sur Vercel | ✅ posées par Julien, P0-1 est actif |

---

*Rédigé le 2026-09-02 à partir de l'état du code, pas d'une analyse d'audience : Everypaw ne
mesure pas encore ses conversions, ce que la phase 0 corrige.*

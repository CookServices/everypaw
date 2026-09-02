# Chantier conversion Print — roadmap

Objectif unique : faire passer un utilisateur actif au plan Print à 79 €/an.
Horizon septembre 2026 à février 2027, saison visée Noël 2026.
Les specs exécutables sont dans [specs.md](specs.md).

## Le constat

Cinq nombres décident de tout :

| Nombre | Ce qu'il vaut |
|---|---|
| **7** | chapitres minimum pour commander un livre (`order/utils.ts`, `tooFewContent`) |
| **3** | entrées par période pour générer un chapitre (`plan-guards.ts`) |
| **1** | histoire en plan gratuit, et 10 entrées au total |
| **28** | pages imprimées, plancher imposé par Gelato |
| **79 €** | Print par an, livre inclus, 28 € de valeur |

Mis bout à bout : **un utilisateur gratuit ne peut pas atteindre un livre.** Il lui faudrait 7
chapitres, donc au moins 21 entrées réparties sur 7 périodes, alors qu'il est plafonné à 10
entrées et 1 histoire. Le désir d'imprimer ne peut donc pas naître pendant la période où il
décide s'il paie.

**Et le seuil ne protège pas ce qu'on croit.** Un chapitre occupe exactement une page, ses
photos sont composées dedans, et toutes les photos orphelines tiennent sur une seule page
plafonnée à six. Un livre commandé au seuil des 7 chapitres contient donc dix pages de contenu
et **dix-huit pages blanches**. Il faut environ vingt-cinq chapitres avant qu'un livre n'ait
plus une seule page vide. Vérifié dans `api/book-pdf/route.tsx`.

## Le calendrier

| Phase | Fenêtre | Ce qui doit exister à la fin |
|---|---|---|
| **0** Voir le tunnel | 3 au 16 septembre | Les six nombres, mesurés chaque semaine |
| **1** Livre atteignable | 17 septembre au 29 octobre | Aperçu, rattrapage des chapitres, 28 pages remplies |
| **2** Déclencher | 30 octobre au 24 décembre | Campagne cadeau en ligne le 15 novembre |
| **3** Dire le prix | janvier 2027 | Après la première mesure post-saison |

Les phases gardent leur ordre. Viser Noël avec cette contrainte laisse **zéro marge**, et
c'est la phase 1 qui absorbera tout retard.

**Gel du pipeline d'impression, 7 novembre au 31 décembre.** Aucune modification de
`book-pdf`, `calcPageCount` ou `gelato/order` pendant la saison. Ces trois-là doivent bouger
ensemble pour que le nombre de pages déclaré corresponde au fichier envoyé ; un refus Gelato
le 10 décembre coûterait l'année.

**Repli si la phase 1 déborde le 29 octobre**, décidé d'avance : livrer P1-1 et P1-2, qui
portent la conversion sans toucher à l'impression, et reporter P1-3 à janvier.

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

## Décisions en attente

- **Le plan Supabase.** Sans base de recette, chaque vérification de paiement se fait en
  production avec une vraie carte. C'est le goulot de toutes les validations en attente.

---

*Rédigé le 2026-09-02 à partir de l'état du code, pas d'une analyse d'audience : Everypaw ne
mesure pas encore ses conversions, ce que la phase 0 corrige.*

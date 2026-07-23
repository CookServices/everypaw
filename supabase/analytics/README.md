# Diagnostic de rétention — mode d'emploi

`retention_diagnostic.sql` répond **aujourd'hui**, rétroactivement, à la question :
*« où décrochent les utilisateurs ? »* — à partir des timestamps déjà en base
(`profiles.created_at`, `entries.created_at`, `stories.created_at`). Aucun event
tracking à ajouter, aucune attente de 7 jours. 100 % read-only.

## Comment lancer

Éditeur SQL Supabase → coller chaque bloc (A→E) → Run. Ordre indifférent, blocs
indépendants.

## Comment lire (ce qu'on cherche)

| Bloc | Question | Signal à surveiller |
|---|---|---|
| **A** | Funnel global | À quelle marche le % s'effondre : animal ? 1re entrée ? 2e entrée ? histoire IA ? C'est la marche à réparer en priorité (règle 90/10). |
| **B** | Rétention par cohorte | `ret_d7_pct` est **la** métrique PMF. Objectif de départ : un plateau, pas une chute vers 0. `null` = cohort trop récent pour la fenêtre (normal). |
| **C** | ★ Point de décrochage | Réponse directe. Si la masse est en bucket **0/1** → problème d'onboarding/activation. En bucket **2** → vitamine (pas de raison de revenir). En bucket **4** → tu as un noyau à répliquer. |
| **D** | Free vs Payant | Teste l'hypothèse « vitamine » : si le payant ne retient pas plus que le free, le prix ne crée pas d'engagement → le wedge doit changer, pas le pricing. |
| **E** | Time-to-wow | Médiane des heures inscription→1re histoire IA. Plus c'est court, mieux ça retient. Cible : < 24 h. |

## La seule chose que les timestamps ne disent PAS

Les blocs A-E voient *qu'*un user décroche avant sa 1re entrée, mais pas *pourquoi*
(a-t-il calé sur la création d'animal ? l'écran vide du journal ? le paywall ?).

`events_log` **ne peut pas** servir à ça : sa contrainte `UNIQUE (user_id, pet_id,
event_type)` en fait une table de dédup booléenne, pas un flux d'événements.

**Si (et seulement si) les blocs A-E montrent une hémorragie pré-activation**, la
prochaine étape sera une table append-only minimale (`onboarding_step` timestampé :
`signup → pet_created → journal_opened → entry_started → entry_saved`). On ne la
construit **pas** en spéculatif : on attend que le diagnostic rétroactif prouve que
c'est là que ça saigne. C'est la discipline « instrumenter ce qui bouge la décision,
rien d'autre ».

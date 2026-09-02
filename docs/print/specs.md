# Chantier conversion Print — specs

Dix chantiers, dans l'ordre où ils se tiennent. Objectif unique : faire passer un
utilisateur actif au plan Print à 79 €/an. Le pourquoi et le calendrier sont dans
[roadmap.md](roadmap.md).

Charge : **S** courte, **M** quelques jours, **L** une semaine ou plus.

---

## Ce qui vaut pour les dix

- **Une branche, une PR, un sujet.** `main` refuse tout push direct. Chaque spec vaut une
  PR, mergée après vérification sur preview quand la preview peut la prouver.
- **Fini veut dire** : `tsc --noEmit` sans nouvelle erreur, `npm test` vert, `npm run build`
  passé, clés i18n dans les deux fichiers, rendu ouvert dans un navigateur si l'écran change.
  La Definition of Done complète est dans `CLAUDE.md`.
- **Les montants ne s'écrivent pas dans la copie.** Ils viennent de `currency.ts` et
  `gelato-pricing.ts`. Un prix en dur dans une chaîne i18n est exactement le bug #17.
- **Le français vouvoie**, et `src/lib/copy-register.test.ts` le vérifie sur tout le bundle.
  Pas de flèche ni de tiret cadratin dans la copie visible.
- **Les migrations SQL sont idempotentes** et exécutées à la main dans Supabase avant le
  merge de la PR qui en dépend.
- **Gel du pipeline d'impression du 7 novembre au 31 décembre** : ni `book-pdf`, ni
  `calcPageCount`, ni `gelato/order`. Un refus Gelato en décembre coûterait la saison.

---

## Phase 0 — Voir le tunnel (3 au 16 septembre)

### P0-1 — Événement d'achat, côté serveur · M

**Pourquoi.** La mesure s'arrête à l'inscription. Le paiement se termine sur le domaine de
Stripe, et les trackers navigateur sont derrière le consentement cookie : un abonnement payé
par quelqu'un qui a refusé les cookies n'existe nulle part.

**Comportement attendu**
- Toute souscription payée produit un événement d'achat, avec le plan et le montant.
- Tout renouvellement en produit un aussi, distinct d'une première souscription.
- Tout achat de livre à l'unité en produit un.
- Rejouer un événement Stripe n'en produit aucun de plus.

**Plan technique**
- Nouveau `src/lib/analytics-server.ts`, une fonction
  `trackPurchase({ userId, plan, amountCents, currency, eventId, billingReason })`.
- Appelée depuis `stripe/webhook` sur `checkout.session.completed` et
  `invoice.payment_succeeded`, où `user_id`, `plan` et le price ID sont déjà lus.
- Deux destinations : GA4 Measurement Protocol et l'API Conversions de Meta. `eventId` =
  identifiant de l'événement Stripe, ce qui déduplique côté Meta si un événement navigateur
  arrive un jour en double.
- Deux variables d'environnement à créer : `GA_API_SECRET` et `META_CAPI_TOKEN`. Les
  identifiants GA4 et pixel existent déjà.
- Idempotence : réutiliser `events_log` et son `stripe_event_id`, déjà en place dans ce
  webhook. Ne pas inventer un second mécanisme.
- Un échec d'envoi se logue et ne fait jamais échouer le webhook, sinon Stripe rejoue la
  facturation.

**Données personnelles — arbitré le 2026-09-02.** L'événement part **sans aucune donnée
utilisateur** : ni email, ni email haché, ni identifiant de navigateur. GA4 exige un
`client_id` : envoyer un identifiant non signifiant dérivé de l'identifiant Stripe, jamais
l'identifiant du compte. Conséquence assumée : pas d'attribution publicitaire par cet
événement, on mesure le volume et le revenu. Rien à ajouter à la politique de confidentialité.

**Critères d'acceptation**
- [ ] Une souscription réelle apparaît une seule fois dans GA4 temps réel et dans le
      gestionnaire d'événements Meta.
- [ ] Rejouer l'événement depuis le tableau de bord Stripe n'ajoute rien.
- [ ] Couper les deux variables d'environnement laisse le webhook fonctionnel.

### P0-2 — Les six nombres du tunnel · S

**Comportement attendu.** Une requête lancée à la main chaque semaine, qui rend six nombres
sur une fenêtre de dates : inscrits, comptes avec au moins un animal, comptes avec au moins
trois entrées, comptes avec au moins une histoire, comptes ayant ouvert un aperçu de livre,
abonnements Print actifs.

**Plan technique**
- Un fichier `supabase/queries/funnel.sql`, versionné mais pas une migration.
- Chaque nombre est un `count(distinct user_id)` sur `profiles`, `pets`, `entries`,
  `stories`, `book_configs`, et `profiles.plan = 'print'`.
- L'aperçu de livre n'a pas d'événement aujourd'hui : compter les lignes `book_configs`
  comme approximation, jusqu'à ce que P1-1 pose l'événement réel.
- Les définitions vont dans `CLAUDE.md` : un nombre dont la définition bouge d'une semaine à
  l'autre ne vaut rien.

**Critères d'acceptation**
- [ ] La requête tourne sur un mois donné et rend six entiers.
- [ ] Chaque nombre a sa définition écrite, sans ambiguïté sur ce qui est compté.

---

## Phase 1 — Rendre le livre atteignable (17 septembre au 29 octobre)

### P1-1 — Aperçu de couverture dès la première histoire · M

**Pourquoi.** L'aperçu vit derrière la page de commande, qui exige déjà sept chapitres.
L'utilisateur gratuit, qui a droit à une histoire, ne voit jamais à quoi ressemblerait son
livre, et c'est pendant cette période qu'il décide s'il paie.

**Comportement attendu**
- Dès la première histoire, l'onglet Histoires montre la couverture : photo de l'animal, son
  nom, la période couverte.
- Un bouton mène à l'aperçu complet, quel que soit le plan.
- En plan gratuit, l'aperçu s'ouvre mais la commande reste fermée, avec le motif affiché
  plutôt qu'un bouton inerte.
- Sans photo d'animal, la couverture garde sa mise en page et son illustration par défaut.

**Plan technique**
- Réutiliser `order/components/BookCover.tsx`. S'il dépend de l'état de la page de commande,
  l'extraire en composant autonome avant de le rendre ailleurs.
- Point d'accroche : `pets/[id]/components/StoriesTab.tsx`, qui reçoit déjà `stories`,
  `petName` et `userPlan`.
- Poser l'événement `book_preview_opened` dans `events_log` à l'ouverture, ce qui remplace
  l'approximation de P0-2.
- `BookProgressWidget` existe déjà sur le tableau de bord : vérifier qu'il ne dit pas
  l'inverse de cette carte.

**Critères d'acceptation**
- [ ] Un compte gratuit à une histoire voit sa couverture et peut ouvrir l'aperçu.
- [ ] Un animal sans photo ne casse pas la mise en page.
- [ ] L'ouverture d'un aperçu se retrouve dans `events_log`.

### P1-2 — Rattrapage des chapitres passés · M

**Pourquoi.** Un abonné peut déjà générer autant de chapitres qu'il veut, sur les périodes de
son choix. Rien ne le lui dit : il attend le chapitre mensuel automatique, donc sept mois
avant de pouvoir commander.

**Comportement attendu**
- L'onglet Histoires annonce l'écart : « vos entrées couvrent neuf mois, deux chapitres sont
  écrits ».
- Un bouton lance la génération des mois manquants, un par un, en montrant lequel est en cours.
- Un mois sans les trois entrées requises est listé comme non éligible, avec ce qui manque.
- Au plafond de dix générations par jour, la série s'arrête proprement et dit quand elle peut
  reprendre.
- En plan gratuit, la carte explique et renvoie vers l'abonnement, sans lancer de génération.

**Plan technique**
- Périodes candidates : mois ayant au moins trois entrées et aucune histoire dont la période
  chevauche. Les entrées sont déjà chargées par la page.
- Appels séquentiels à `/api/generate` avec `periodStart` et `periodEnd`, jamais en
  parallèle : la route compte les générations du jour.
- Traiter `daily_generation_limit` comme un cas nominal, pas comme une erreur.
- La logique de calcul des périodes va dans un module pur, testable sans navigateur.

**Critères d'acceptation**
- [ ] Un compte payant avec des entrées sur plusieurs mois obtient un chapitre par mois éligible.
- [ ] Un mois à deux entrées n'est jamais proposé.
- [ ] Le plafond quotidien interrompt sans perdre les chapitres déjà écrits.

**Coût.** Chaque chapitre est un appel au modèle. Le plafond de dix par jour existe déjà et
reste la seule protection ; ne pas le lever pour cette fonctionnalité.

### P1-3 — Remplir les 28 pages au lieu de les laisser blanches · L

**Pourquoi.** Un chapitre occupe une page, ses photos sont composées dedans, et toutes les
photos orphelines tiennent sur une seule page plafonnée à six. Au seuil des sept chapitres, le
livre contient dix pages de contenu et dix-huit pages blanches. Le seuil ne protège pas la
qualité, il garantit un relié aux deux tiers vide.

**Comportement attendu**
- Les photos non rattachées à un chapitre se paginent, six par page.
- Les étapes franchies, déjà datées, gagnent leur page, huit par page.
- Les pages blanches ne servent plus que de complément final au multiple de quatre.
- Le seuil de commande compte les pages réellement remplies, pas les chapitres.
- Le plancher de 28 pages ne bouge pas : il vient de l'imprimeur.

**Plan technique**
- Trois endroits bougent ensemble, sous peine de refus Gelato : `estimateOrderPages`
  (`order/utils.ts`) pour le seuil affiché, `calcPageCount` (`lib/book-pages.ts`) pour le
  nombre déclaré, `api/book-pdf` pour la composition. Le PDF doit contenir exactement le
  nombre déclaré.
- Les 27 tests de caractérisation du PDF vont échouer : c'est leur rôle. Chaque échec se lit
  et se met à jour délibérément, jamais en masse.
- Prévoir un plafond de pages photos, sinon un compte à mille photos produit un livre de cent
  pages et une facture à l'avenant.
- Vérifier la cohérence avec le prix : `calcGelatoBookPrice` croît avec le nombre de pages, et
  le prix affiché doit rester celui qui sera débité.

**Critères d'acceptation**
- [ ] Trois chapitres, quarante photos et douze étapes produisent un livre de 28 pages avec au
      plus trois pages blanches.
- [ ] Le nombre déclaré à Gelato égale le nombre de pages du PDF, vérifié sur trois
      compositions différentes.
- [ ] Une commande réelle est acceptée par Gelato avant le 7 novembre.

**Fenêtre.** Doit être fini et éprouvé avant le gel du 7 novembre. S'il déborde, report à
janvier : la phase 2 part avec P1-1 et P1-2 seuls, qui suffisent à porter la conversion.

---

## Phase 2 — Déclencher au bon moment (30 octobre au 24 décembre)

### P2-1 — Campagne cadeau de fin d'année · S

**Comportement attendu**
- Entre le 15 novembre et le 24 décembre, les comptes gratuits voient sur leur tableau de bord
  un encart cadeau, qui disparaît seul après cette date.
- L'encart mène à la page cadeau existante, où le plan Print à 79 € est mis en avant.
- Le message dit que le cadeau est un abonnement, pas un colis : rien à recevoir avant Noël,
  le destinataire commandera son livre quand son journal sera prêt.

**Plan technique**
- Encart piloté par une plage de dates en dur dans le composant, pas par une variable
  d'environnement : il doit s'éteindre sans déploiement.
- La page cadeau et la planification d'envoi existent déjà et ne sont pas touchées.
- Le reste est du contenu : emails, visuels, liens depuis les trois articles de blog déjà
  publiés sur les cadeaux.

**Critères d'acceptation**
- [ ] L'encart apparaît et disparaît aux bonnes dates, vérifié en changeant l'horloge du
      navigateur.
- [ ] Un achat de cadeau daté part bien en file et non immédiatement.

### P2-2 — L'anniversaire mène au livre · S

**Comportement attendu**
- L'email d'anniversaire propose de réunir l'année écoulée dans un livre, quand l'animal a au
  moins une histoire.
- L'appel à l'action dépend du plan : commander pour un abonné Print avec crédit, découvrir
  Print pour les autres.
- Sans histoire, l'email reste tel qu'aujourd'hui.

**Plan technique**
- `cron/birthday-check` connaît déjà le plan et l'animal ; il manque le nombre d'histoires, un
  `count` à ajouter à la requête existante.
- Deux chaînes i18n de plus, dans les deux fichiers.
- L'idempotence de l'email est déjà assurée par `events_log`.

**Critères d'acceptation**
- [ ] Trois comptes, trois plans, trois appels à l'action justes, en français et en anglais.
- [ ] Un seul email par animal et par année, comme aujourd'hui.

### P2-3 — Un chemin depuis la page mémorial · S

**Pourquoi.** La landing mémorial promet « une page dédiée et un livre relié ». La page
mémorial d'un animal ne mène à aucun livre. C'est l'intention d'achat la plus forte du
produit, et elle finit en cul-de-sac.

**Comportement attendu**
- Sur la page mémorial, le propriétaire voit un lien discret pour réunir les souvenirs dans un
  livre.
- Les visiteurs ne le voient pas : ils viennent rendre hommage, pas acheter.
- Le ton reste retenu, sans urgence ni argument commercial.

**Plan technique**
- `memorial/[id]/page.tsx` distingue déjà le propriétaire, qui y voit un lien d'édition.
  Ajouter le second lien au même endroit. Aucune requête supplémentaire.

**Critères d'acceptation**
- [ ] Le lien n'apparaît que pour le propriétaire, vérifié avec un second compte.
- [ ] La copie passe la relecture de ton : c'est une page de deuil.

---

## Phase 3 — Dire le prix autrement (janvier 2027)

### P3-1 — Afficher la comparaison, pas la liste · S

**Comportement attendu**
- Là où les plans sont présentés, deux lignes de calcul remplacent la comparaison de
  fonctionnalités : douze mois de Digital plus un livre acheté à part (87,88 €) contre le prix
  de Print (79 €).
- Les montants s'adaptent à la devise du visiteur.

**Plan technique**
- Trois surfaces : la section tarifs de la landing, `dashboard/upgrade`, et la carte
  abonnement des réglages.
- Les montants viennent de `currency.ts` et `calcGelatoBookPrice`, jamais d'une chaîne i18n.
- La devise se lit par `/api/currency`, comme la page de commande depuis la PR #132.

**Critères d'acceptation**
- [ ] Aucun montant en dur dans les fichiers de traduction, vérifié au grep.
- [ ] Le calcul affiché est juste dans les deux devises.

### P3-2 — Proposer Print au moment d'acheter un livre · S

**Pourquoi.** Un abonné Digital qui s'apprête à payer un livre a déjà décidé qu'il voulait
l'objet. À cet instant, l'écart avec Print se réduit à la différence entre les deux, pour une
année entière de plus.

**Comportement attendu**
- Sur la page de commande, un abonné Digital sans crédit voit, à côté du prix du livre, ce que
  coûterait Print avec ce livre inclus.
- Le lien mène à la page d'abonnement, pas à un second paiement.
- Un abonné Print ne voit rien de tout cela.

**Plan technique**
- `order/components/UpsellBanners.tsx`, qui reçoit déjà le plan et les crédits.
- Ne pas rouvrir un second chemin de paiement depuis l'étape d'aperçu : c'est le bug corrigé
  en PR #132, la commande garde un point d'entrée unique.

**Critères d'acceptation**
- [ ] Visible pour Digital sans crédit, invisible pour Print et pour Free.
- [ ] Aucun appel à `stripe/book-checkout` ajouté sur ce chemin.

---

## Hors périmètre

- **L'acquisition.** Le SEO en place continue seul. Envoyer du trafic avant la phase 1 revient
  à remplir un seau percé.
- **Les tests A/B.** Le volume actuel ne permet de mesurer que du bruit.
- **Les refactos #4 et #8 du backlog.** Aucun ne sert la conversion.
- **Les vérifications en production** qui attendent un paiement réel : webhook Stripe en Live,
  montant débité du livre, annulation avec changement programmé, cadeau daté de bout en bout.

---

*Rédigé le 2026-09-02 depuis l'état du code. Chaque plan technique nomme les fichiers
réellement concernés ; si l'un d'eux a bougé au moment de commencer, c'est la spec qui a tort,
pas le code.*

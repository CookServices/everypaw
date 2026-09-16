# Chantier page avant compte, specs

Une seule mécanique, deux portes. Un visiteur crée une page publique pour son animal **sans
compte** (nom, espèce, photo, trois souvenirs), reçoit un chapitre écrit par l'IA, partage
l'URL, puis réclame la page en s'inscrivant. La réclamation crée l'animal, les entrées et le
chapitre dans son compte : le goulot « inscrit sans animal » disparaît par construction.

Porte A, le mémorial : « une page pour lui dire au revoir ». Porte B, l'animal vivant : « son
premier chapitre en 30 secondes ». A se livre d'abord, B est un dérivé de A.

Charge : **S** courte, **M** quelques jours, **L** une semaine ou plus.

---

## Le constat, 2026-09-16

Lecture de GA4 (consentement cookie requis, donc sous-compté) et de Search Console du 1er mai
au 15 septembre, croisée avec `funnel.sql`.

| Canal | Sessions | Engagées | Durée moyenne |
|---|---|---|---|
| Meta paid `traffic-test-aug2026`, atterrissage `/` | 702 | 17 | 0 s |
| Meta paid `conversion-signup-retargeting-sep2026`, atterrissage `/auth/signup` | 49 | 17 | 8 s |
| Direct | 45 | 17 | 45 s |
| Referral (yopmail, facebook) | 25 | 13 | 13 s |
| ChatGPT | 6 | 3 | 34 s |
| Google organique | 4 | 2 | 1 min 12 s |

- **Aucun canal d'acquisition ne fonctionne.** 12 vrais inscrits en cinq mois. Les sessions
  engagées viennent de Sèvres, Guyancourt, Rambouillet, Paris : le cercle du fondateur.
- **La campagne trafic d'août a acheté 700 clics de 1 seconde**, 507 villes américaines,
  vraies personnes, aucune n'a vu la page. L'objectif « Trafic » de Meta sélectionne des
  cliqueurs, pas des lecteurs. Aucune leçon produit à en tirer.
- **Search Console : 12 clics en 3 mois et demi.** Les seules requêtes non liées à la marque
  sont du deuil (« pet sympathy card », « pet memorial book », « what to write in a pet loss
  card »), toutes en page 5 à 8. Les 718 impressions de « everypaw login » viennent des
  clients d'un assureur britannique homonyme.
- **GA4 n'a aucun événement clé.** La colonne est à zéro sur tous les rapports : Google ne
  sait pas ce qu'est une inscription. Le pixel Meta le sait (`CompleteRegistration`).
- **Le produit n'a jamais été mis devant une audience tiède.** Le brainstorm « quelle feature
  attire » n'a pas de réponse mesurée. Ce chantier construit la seule feature qui soit
  elle-même un canal : un artefact public, partageable, créé avant le compte.

Pourquoi le mémorial d'abord : le deuil a un motif de partage naturel (groupes Facebook pet
loss, r/petloss), c'est le seul sujet qui apparaît en organique, le cluster blog le cible déjà,
et la page mémorial, les hommages et la landing `/memorial` existent. L'animal vivant n'a pas
de moment déclencheur équivalent.

---

## Deux tests à zéro code, avant et pendant l'écriture

Ils testent l'hypothèse la plus risquée de chaque porte. Leur résultat décide si PP-4 s'écrit.

1. **Porte A, le partage.** Créer un mémorial sur le `/memorial/[id]` existant avec un animal de
   test, le poster dans deux groupes Facebook pet loss francophones et sur r/petloss avec un vrai
   texte. Compter clics et réactions à 48 h. Zéro = A ne se construit pas.
2. **Porte B, le chapitre impressionne.** Générer un chapitre depuis trois lignes sur un compte
   de test, le montrer à cinq personnes hors du cercle. « Mignon mais bof » = B ne convertira
   pas.

---

## Ce qui vaut pour toutes

- **Une branche, une PR, un sujet.** Definition of Done de `CLAUDE.md`.
- **Le français vouvoie**, pas de flèche ni de tiret cadratin dans la copie visible, clés i18n
  dans les deux fichiers. Les pages marketing figent la langue par URL (`/memorial` EN,
  `/fr/memorial` FR), jamais par `navigator.language`.
- **Aucune ligne `pets` sans propriétaire.** Les pages anonymes vivent dans leur propre table.
  Toucher aux policies RLS de `pets` (récursion de la session 48) ou à `funnel.sql` (qui joint
  `pets.user_id`) pour des lignes orphelines est exclu.
- **Toute génération anonyme est plafonnée deux fois** : par IP et globalement par jour, via
  `checkRateLimitDb`. Le fail-open du limiteur est acceptable ici parce que le plafond global
  est vérifié en second et que le coût unitaire est d'environ un centime.
- **Pas de données personnelles dans l'URL.** Le token de réclamation transite par
  `localStorage` et par le corps des requêtes, jamais dans un lien partagé.
- **Gel du pipeline d'impression du 7 novembre au 31 décembre** : inchangé, ce chantier ne
  touche ni `book-pdf`, ni `paginateBook`, ni `gelato/order`.

---

## PP-0 — Voir ce chantier · S

**Pourquoi.** GA4 ne compte pas les inscriptions et `events_log` exige un `user_id`, donc une
page créée sans compte n'existe dans aucune mesure. Sans PP-0, PP-1 est aveugle.

**Comportement attendu**
- Une inscription réussie apparaît dans GA4 comme événement clé `sign_up`.
- Une page créée, une page vue, une page réclamée sont comptables par semaine, avec la porte
  (memorial ou living) et le pays.
- `funnel.sql` gagne deux colonnes : `pages_created` et `pages_claimed` sur la fenêtre, sans
  changer la définition des six nombres existants.

**Plan technique**
- `sign_up` : vérifier ce que `Trackers.tsx` envoie aujourd'hui au signup ; ajouter l'événement
  `gtag('event','sign_up')` derrière le consentement, au même endroit que `CompleteRegistration`
  dans `pixel.ts`. Le marquer « événement clé » dans l'interface GA4 : action manuelle, à noter
  dans `docs/SESSIONS.md` quand elle est faite.
- Les compteurs de pages ne passent **pas** par `events_log` : ils se lisent dans
  `public_pages`, colonnes `created_at`, `claimed_at`, `view_count`, `kind`, `country`.
  `funnel.sql` les agrège sur la même fenêtre. **La migration de la table est donc posée ici**
  (`add_public_pages_2026_09_16.sql`, schéma décrit en PP-1), sinon la requête ne tourne pas
  en production avant PP-1.
- `view_count` : incrément atomique par RPC `increment_public_page_view(slug)` depuis le server
  component, jamais depuis le client. Pas de déduplication par visiteur, on mesure des
  ouvertures, pas des personnes.

**Critères d'acceptation**
- GA4 affiche `sign_up` en événement clé sur un signup de test.
- `funnel.sql` rejoué sur `funnel.fixture.sql` (enrichi de deux pages) rend les deux
  nouvelles colonnes justes, les six autres inchangées.

---

## PP-1 — Le tronc : créer une page sans compte · L

**Pourquoi.** C'est la feature-canal. Tout le reste s'y branche.

**Comportement attendu**
- Sur `/memorial/new` (EN) et `/fr/memorial/new` (FR), un visiteur sans compte renseigne :
  nom (2 à 40 caractères), espèce (chien, chat, autre), date de départ (obligatoire pour la
  porte A, jamais dans le futur), date de naissance (optionnelle), une photo (optionnelle,
  recadrée côté client comme dans `pets/new`), et trois souvenirs (20 à 400 caractères
  chacun, le troisième optionnel).
- Il attend 10 à 20 secondes avec un état d'attente qui respecte `prefers-reduced-motion`,
  puis voit sa page à `/p/[slug]` : photo, nom, dates, le chapitre écrit à la première
  personne par l'animal, les trois souvenirs, un bouton « Partager » (`navigator.share`, repli
  copie du lien) et un encart « Cette page est à vous ? Réclamez-la » (PP-2).
- La page est publique par URL, en `noindex`, avec des balises OG (titre « En mémoire de
  {nom} », photo) pour l'aperçu Facebook et iMessage.
- Un visiteur qui a créé une page voit, en haut de sa propre page, un bandeau « Conservez ce
  lien » et le bouton de réclamation. Les autres visiteurs ne voient ni l'un ni l'autre.
- Refus propres : nom vide, souvenirs trop courts, photo trop lourde (avant upload), plafond
  atteint (« Beaucoup de pages ont été créées aujourd'hui, revenez demain »), échec de
  génération (« Nous n'avons pas réussi à écrire ce chapitre, réessayez » avec les champs
  conservés).

**Plan technique**
- Migration `add_public_pages_2026_09_16.sql`, posée par PP-0, idempotente :
  ```
  public_pages: id uuid pk, slug text unique (10 caractères base62),
    kind text check in ('memorial','living'), locale text check in ('en','fr'),
    pet_name, species, birthdate date null, deceased_at date null, photo_url text null,
    memories jsonb (tableau de 2 ou 3 chaînes), story_title, story_content,
    claim_token_hash text (sha256 hex), claimed_by uuid null references auth.users,
    claimed_pet_id uuid null references pets, claimed_at timestamptz null,
    creator_ip_hash text, country text null, view_count int default 0,
    status text check in ('active','claimed','hidden') default 'active',
    created_at, expires_at (created_at + 30 jours)
  ```
  RLS activée, **aucune policy** : service role seul, comme `gift_deliveries`.
- `POST /api/public-pages` (JSON, sans session) :
  1. `checkRateLimitDb('public-page:'+ip, 3, 24 h)` puis
     `checkRateLimitDb('public-page:global', 200, 24 h)`. Le second protège la facture
     Anthropic : 200 pages à un centime.
  2. Honeypot `website` : réponse `ok` silencieuse si rempli (même pattern que les hommages).
  3. Validation stricte des longueurs et dates, `escapeHtml` sur tout ce qui sera rendu.
  4. Prompt `buildPublicPagePrompt(kind, pet, memories, lang)` dans `src/lib/story.ts`, à
     côté de `buildOriginsPrompt` : même balisage XML et `escapeXml`, 250 à 350 mots,
     voix de l'animal. Porte A : lettre d'adieu tendre, jamais morbide, sans mention de la
     cause. Porte B : premier chapitre, ton de `buildOriginsPrompt`. `callClaude` avec
     `maxTokens: 800`, `parseStoryResponse`, `stripEmDash`.
  5. Insertion avec `claim_token` de 32 octets hex généré côté serveur, stocké haché ;
     réponse `{ slug, claimToken }`. Le client range le token dans
     `localStorage['ep_claim_'+slug]`.
  6. Toute erreur Anthropic se logue et renvoie un message générique, jamais le détail.
- `POST /api/public-pages/photo` (multipart, 5 Mo max, `image/jpeg|png|webp`) : upload par
  service role dans le bucket `pet-photos` sous `public/{uuid}.jpg`, renvoie l'URL publique.
  La policy `SELECT` publique du bucket existe déjà ; l'insert passe par le service role. Le
  client compresse d'abord avec `compressImage`. Même limiteur d'IP que la création.
- `src/app/p/[slug]/page.tsx` : server component, `getServiceSupabase()`, `noindex`,
  `generateMetadata` calqué sur `memorial/[id]`. Rendu sombre de la page mémorial pour la porte
  A (mêmes tokens, composants extraits si le partage de code avec `memorial/[id]` reste
  lisible, sinon dupliqués et notés). Locale = `page.locale`, pas `navigator.language`.
- Le bouton « Partager » suit la règle apprise sur la share-card : aucun `await` entre le
  clic et `navigator.share`, sinon l'activation utilisateur est perdue sur mobile.
- Modération : pas d'interface. Un lien « Signaler cette page » ouvre `/contact` avec le slug
  pré-rempli ; `status='hidden'` se pose en SQL et la page renvoie 404.
- Pas de `middleware` sur `/p/:path*` : aucune des quatre responsabilités du middleware n'y
  sert, et `x-pathname` n'y est pas nécessaire (la langue vient de la ligne).

**Critères d'acceptation**
- Un navigateur privé crée une page, la voit, la partage ; un second navigateur la voit sans
  bandeau de réclamation.
- Quatrième création depuis la même IP en 24 h : 429 avec le message prévu, champs conservés.
- `escapeHtml` vérifié : un souvenir contenant `<script>` s'affiche en texte.
- `npm test` : test unitaire sur `buildPublicPagePrompt` (balises fermées, langue, kind) et
  sur la validation des entrées.

---

## PP-2 — Hommages en attente et réclamation · M

**Pourquoi.** La réclamation transforme le visiteur en compte **avec animal**. Les hommages
déposés avant réclamation sont le meilleur motif de réclamer : ils sont annoncés, pas lisibles.

**Comportement attendu**
- Sur une page mémorial non réclamée, n'importe qui peut déposer un hommage (même formulaire
  que `/memorial/[id]`). Il n'est pas affiché ; la page montre « 3 personnes ont laissé un
  hommage. Réclamez la page pour les lire et les publier. »
- Le créateur clique « Réclamer », passe par l'inscription (ou la connexion), et retrouve dans
  son tableau de bord l'animal créé, ses trois souvenirs en entrées, le chapitre dans
  l'onglet Histoires, et les hommages en attente de modération dans l'onglet existant.
- Après réclamation, `/p/[slug]` redirige (308) vers `/memorial/[petId]` pour la porte A : le
  lien partagé continue de fonctionner, la page gagne l'édition propriétaire et la
  modération. Pour la porte B (PP-4), la page reste un instantané.
- Un utilisateur déjà connecté qui ouvre sa page voit « Réclamer » et réclame en un clic.
- Le plan gratuit peut réclamer même s'il possède déjà un animal. Refuser ici, c'est perdre
  la personne au moment où elle a le plus de raisons de rester. L'inscription lui rappelle la
  limite d'un profil au prochain ajout, pas à celui-ci.

**Plan technique**
- `memorial_tributes` : colonne `page_id uuid null references public_pages`, et `pet_id`
  devient nullable avec contrainte `check (pet_id is not null or page_id is not null)`.
  `POST /api/memorial/tributes` accepte `pageId` ou `petId` ; sur une page, l'hommage est
  inséré `pending` et **aucun email** n'est envoyé (pas de propriétaire). Le compteur
  affiché est un `count` de `pending` par page.
- RPC `claim_public_page(p_slug text, p_token_hash text, p_user uuid)` en `SECURITY DEFINER`,
  une transaction :
  1. lit la page `active`, compare le hash (la comparaison se fait en SQL sur des hex de
     longueur fixe ; côté route, le hash est calculé avec `node:crypto` et la comparaison du
     token brut n'a jamais lieu) ;
  2. insère `pets` (`user_id`, nom, espèce, dates, `photo_url`, `memorial_photo_url`,
     `memorial_message` = première phrase du chapitre pour la porte A) ;
  3. insère jusqu'à trois `entries` (`entry_date` = `deceased_at` moins un jour pour A, la
     date du jour pour B ; `mood` null) ;
  4. insère la `stories` : `story_type='memorial'` pour A, `'origins'` pour B, `status='published'` ;
  5. `update memorial_tributes set pet_id = new_pet where page_id = page` ;
  6. `update public_pages set status='claimed', claimed_by, claimed_pet_id, claimed_at` ;
  7. `update profiles set onboarding_completed=true, onboarding_dismissed=true where id=p_user`.
  Retourne `pet_id`. Le RPC est **révoqué pour `authenticated` et `anon`** (leçon de l'audit
  du 2026-07-06 sur les RPC crédits) ; seule la route l'appelle, en service role, après avoir
  vérifié la session.
- `POST /api/public-pages/claim` `{ slug, claimToken }` : session requise, hash du token,
  appel du RPC, redirection `/dashboard/pets/[petId]`.
- Parcours sans session : « Réclamer » envoie vers
  `/auth/signup?next=/p/[slug]?claim=1`. La chaîne est déjà en place et vérifiée le
  2026-09-16 : `signup/page.tsx` met `next` dans `emailRedirectTo`, `auth-hook/route.ts` le
  relit dans `redirect_to` (ligne `signupNext`), `/auth/confirm` le suit après `verifyOtp`.
  Rien à ajouter. Le repli tient quand même, pour Google OAuth et pour un lien ouvert sur un
  autre appareil : le tableau de bord lit `localStorage` au chargement, et si un `ep_claim_*`
  existe pour une page encore `active`, affiche un bandeau « Vous avez créé la page de {nom},
  ajoutez-la à votre compte » qui déclenche la réclamation. Le lien partagé n'embarque jamais
  le token.
- `story_type='memorial'` : ajouter la valeur à l'exclusion du quota
  `.not("story_type","in","(origins,birthday)")`, présente à trois endroits vérifiés le
  2026-09-16 : `src/app/api/generate/route.ts`, `src/lib/story.ts`
  (`shouldShowFirstStoryNudge`) et `src/app/dashboard/pets/[id]/page.tsx`. `funnel.sql` ne
  filtre pas par type, rien à y changer.
- `OriginsFlow` du dashboard : vérifier qu'il ne se relance pas sur un animal réclamé par la
  porte B (une origins existe déjà, index `stories_one_origins_per_pet`).

**Critères d'acceptation**
- Parcours complet en navigateur privé : création, deux hommages depuis un autre navigateur,
  inscription, confirmation, animal visible avec trois entrées, chapitre, deux hommages en
  attente ; `/p/[slug]` redirige vers le mémorial.
- Réclamation rejouée : 409, aucune seconde ligne `pets`.
- Token faux : 403, rien n'est écrit.
- `npm test` vert avec les exclusions de quota mises à jour.

---

## PP-3 — Porte A : l'entrée depuis le deuil · S

**Pourquoi.** La landing `/memorial` existe et envoie vers `/auth/signup`. C'est exactement le
mur que ce chantier abat.

**Comportement attendu**
- `/memorial` et `/fr/memorial` : le CTA devient « Créer sa page, sans compte », vers
  `/memorial/new` ou `/fr/memorial/new`. Le texte annonce ce qui se passe : trois souvenirs,
  une page, un chapitre, un lien à partager.
- Un exemple réel est visible sur la landing : une page créée par le fondateur, pas un
  placeholder.
- Le pied de page de `/p/[slug]` porte le lien vers le livre souvenir, comme le mémorial
  propriétaire, jamais dans l'en-tête (décision du 2026-09-03).

**Plan technique**
- Modifier `src/app/memorial/page.tsx` et `src/app/fr/memorial/page.tsx`, clés dans
  `memorial_landing`. Aucun composant nouveau.
- Rien d'autre. La share-card Instagram pour les pages (variante publique de
  `/api/share-card`) attend une mesure : si les pages se partagent déjà par OG, elle n'est pas
  nécessaire.

**Critères d'acceptation**
- Les deux landings mènent au formulaire dans leur langue ; hreflang et canonical inchangés.

---

## PP-4 — Porte B : l'animal vivant · M

**Ne s'écrit que si** le test 2 est concluant et PP-1 à PP-3 ont produit, en quatre semaines
et après publication dans au moins cinq communautés, au moins 20 pages créées et un taux de
réclamation d'au moins 10 %. En dessous, le tronc n'a pas prouvé qu'il porte, et ajouter une
porte à un tunnel vide ne mesure rien.

**Comportement attendu**
- `/` et `/fr` : sous le héros, un formulaire court « Son premier chapitre en 30 secondes »
  (nom, espèce, trois souvenirs, photo optionnelle) qui crée une page `kind='living'`.
- La page `/p/[slug]` en porte B est claire (tokens du dashboard, pas le sombre du mémorial),
  sans hommages, avec le chapitre et « Continuez son journal » comme réclamation.
- Après réclamation, la page reste un instantané public en `noindex`, avec un lien « Le
  journal continue sur Everypaw ».

**Plan technique**
- `kind='living'` dans le même `POST /api/public-pages`, prompt de la branche B, rendu clair
  dans `p/[slug]` selon `kind`. Le formulaire de la landing réutilise le composant client de
  `/memorial/new` avec une prop `kind`.
- La landing `/` reste figée par URL : le composant reçoit `locale` en prop.

---

## PP-5 — Expiration et purge · S

**Pourquoi.** Une page anonyme non réclamée contient un nom, des souvenirs, une photo et un
hash d'IP. Trente jours suffisent à décider ; au-delà, la conserver est un passif RGPD sans
valeur produit.

**Comportement attendu**
- Une page `active` dont `expires_at` est passé renvoie 404 avec un message « Cette page a
  expiré » et disparaît de la base, photo comprise.
- Une page réclamée n'expire jamais.
- La politique de confidentialité mentionne les pages anonymes et leur durée de vie.

**Plan technique**
- Cron `/api/cron/public-pages-purge`, quotidien, dans `vercel.json`, protégé par
  `CRON_SECRET` : sélectionne `status='active' and expires_at < now()`, supprime les objets
  `public/{id}.jpg` du bucket, puis les lignes (les hommages liés partent par cascade).
- Un utilisateur qui réclame juste avant la purge gagne : la sélection se fait sur
  `status='active'` au moment de la suppression, dans la même requête que le `delete`.
- Paragraphe ajouté aux deux pages légales (EN et FR).

**Critères d'acceptation**
- Cron appelé sans token : 401. Avec token sur une base contenant une page expirée et une
  page réclamée ancienne : une seule suppression, la photo absente du bucket.

---

## Ordre et charge

| Étape | Charge | Dépend de |
|---|---|---|
| Tests à zéro code 1 et 2 | une soirée | rien, en parallèle de l'écriture |
| PP-0 | S | rien |
| PP-1 | L | PP-0 (pour être mesuré dès le premier jour) |
| PP-2 | M | PP-1 |
| PP-3 | S | PP-2 (une landing qui mène à une page non réclamable ferait perdre les premiers créateurs) |
| PP-5 | S | PP-1, à livrer avant la première publication en communauté |
| PP-4 | M | mesure de quatre semaines |

Estimation solo : PP-0 à PP-5 hors PP-4, trois semaines de soirées. Livrable avant le 7
novembre sans toucher au pipeline d'impression.

---

## Décisions prises

| Date | Décision |
|---|---|
| 2026-09-16 | Une mécanique, deux portes ; le mémorial d'abord, l'animal vivant seulement après mesure |
| 2026-09-16 | Les pages anonymes ont leur propre table ; aucune ligne `pets` sans propriétaire |
| 2026-09-16 | Les hommages sur une page non réclamée sont annoncés, pas affichés : c'est le motif de réclamation |
| 2026-09-16 | Le plan gratuit réclame même avec un animal existant |
| 2026-09-16 | Plafond global de 200 générations anonymes par jour, révisable dans le code sans migration |
| 2026-09-16 | Pages anonymes en `noindex`, purgées à 30 jours si non réclamées |

## Décisions en attente

- **Demander un email à la création ?** Il permettrait d'envoyer le lien et de relancer avant
  expiration, au prix d'un champ de plus avant la valeur. Choix par défaut : non en PP-1,
  proposé **après** l'affichage de la page (« Recevez ce lien par email »), optionnel.
- **Le nom.** « everypaw login » à 718 impressions britanniques signale qu'un assureur occupe
  la marque au Royaume-Uni. Ce chantier n'en dépend pas, mais un jour un choix se pose.
- **Budget pub.** Aucune campagne avant que dix pages aient été créées par des inconnus. Si
  campagne, objectif conversion sur « page créée », jamais « Trafic ».

---

*Rédigé le 2026-09-16 à partir de la lecture de GA4, Search Console, `funnel.sql` et du code
des pages mémorial, hommages, génération et limiteur. À amender quand les deux tests à zéro
code ont parlé.*

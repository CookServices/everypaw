# Everypaw — Archive des sessions & fonctionnalités

> Historique détaillé extrait de CLAUDE.md le 2026-07-07 pour alléger le contexte.
> Les 2 sessions les plus récentes vivent dans CLAUDE.md ; le reste est archivé ici.

---

### ✅ Session 63 — Fix `allow_promotion_codes` manquant sur checkout Stripe (2026-08-28)

Testeur passé en abonnement Digital n'a vu aucun champ code promo sur la page Stripe Checkout. Audit : 4 routes appellent `stripe.checkout.sessions.create`, aucune ne passait `allow_promotion_codes`.

- **Fix appliqué** (`allow_promotion_codes: true`) : `stripe/checkout` (abonnement digital/print), `gift/checkout` (achat gift), `stripe/book-checkout` (livre supplémentaire).
- **Non touché** : `gift/redeem` — passe déjà `discounts: [{ promotion_code }]` codé en dur ; Stripe refuse `allow_promotion_codes` + `discounts` sur la même session.
- PR : voir historique Git (branche `fix/checkout-allow-promo-codes`).

---

### ✅ Session 56 — SEO : canonicals par page, robots.ts, sitemap.ts (2026-07-11)

Commit `f01d59a`. Bug critique révélé par audit SEO : `alternates.canonical` + `openGraph.url` hardcodés `https://everypaw.app` dans le root layout → hérités par **toutes** les pages → Google considérait tout le site comme duplicata de la homepage.

- **Root layout** : canonical, og:url et hreflang supprimés — `metadataBase` conservé (les canonicals par page sont relatives et résolues contre lui)
- **Homepage** : `page.tsx` client déplacé → `src/app/home-client.tsx` ; nouveau `page.tsx` server wrapper qui exporte metadata (canonical `/`, hreflang en/fr/x-default, og complet avec `url: "/"`) et ré-exporte le composant client. Title/description homepage **inchangés** (lot suivant)
- **Pages client** (metadata impossible) → layouts de segment : `gift/layout.tsx` (title "Gift a Pet Journal & Memory Book | Everypaw" + description dédiée + canonical `/gift`), `auth/login/layout.tsx` + `auth/signup/layout.tsx` (`robots: { index: false, follow: false }`)
- **Legal terms/privacy/notices** : descriptions dédiées + canonical + og:url ; **contact** : canonical + og:url
- **`/pets/[id]`** : canonical dynamique `/pets/${id}` ajoutée dans `generateMetadata`
- **`src/app/robots.ts`** créé (allow `/`, disallow `/dashboard` `/api` `/auth` `/unsubscribe`, sitemap) ; `public/robots.txt` **supprimé** (conflit route metadata)
- **`sitemap.ts`** réécrit : anciennes URLs FR 301-redirigées (`/legal/cgv|confidentialite|mentions`) remplacées par terms/privacy/notices, `/gift` ajouté, `/fr` conservé
- Vérifié sur `next start` + curl : `/gift` canonical+title+desc propres ✓, `/` canonical+hreflang ✓, noindex login/signup ✓, robots.txt + sitemap.xml servis ✓. Build OK, 16 tests Vitest verts. Webhook Stripe + crons intacts.
- **Note locale (résolu)** : login/signup rendaient le shell `__next_error__` en local (vars `NEXT_PUBLIC_SUPABASE_*` vides après `vercel env pull` — Sensitive). Fix : ces valeurs sont publiques par design → récupérées depuis le bundle JS prod et réinjectées dans `.env.local`. Astuce valable pour toute var `NEXT_PUBLIC_*` marquée Sensitive.

**Lot 2 — on-page homepage (commit `52060fd`)** : optimisation "ai pet journal" (primaire) + "pet memory book" (secondaire) :
- Title/description/og/twitter : "AI Pet Journal That Becomes a Printed Book | Everypaw" (`layout.tsx` + og homepage dans `page.tsx`)
- H2 hero + H2 section livre + CTA carte gift ("Gift a pet memory book" / "Offrir un livre souvenir") : textes inline hardcodés migrés vers clés i18n `hero_sub`, `book_h2_1/2`, `f6_cta` (en+fr). H1 inchangé
- JSON-LD déplacé de `home-client.tsx` (client) vers `page.tsx` (server) : Organization (nouveau) + SoftwareApplication (**`aggregateRating` factice 5★/3 retiré** — risque pénalité) + FAQPage **construit depuis les clés i18n** `faq.q1..q6/a1..a6` (mêmes clés que la section visible → jamais de drift)
- Images landing : 6 SVG décoratifs `alt="" aria-hidden` = correct WCAG, aucun nom cryptique, rien à changer
- Vérifié : 3 blocs JSON-LD `JSON.parse` OK, headings rendus, hero visuel intact (screenshot), build + 16 tests verts

**Lot 3 — hygiène SEO / cohérence contenu (commit `a59e318`)** :
- Architecture homepage : **aucun changement** — `page.tsx` server (metadata + JSON-LD server-rendered depuis lot 2), corps client SSR complet via force-dynamic ; split en îlots RSC = refactor lourd reporté (#4/#8), zéro gain SEO
- Liens legacy 301 remplacés par liens directs : `/legal/cgv`→`terms`, `/legal/confidentialite`→`privacy` dans signup, settings, upgrade, CookieBanner (`/gift` était déjà propre) ; **aussi** dans les messages TOS Stripe checkout (`api/gift/checkout` + `api/stripe/checkout`, commit `8432574`)
- `src/lib/legal.ts` : source ISO unique `LEGAL_LAST_UPDATE_ISO` + formateur → `LEGAL_LAST_UPDATE_EN` "May 26, 2026" sur terms/privacy/notices (affichaient "26 mai 2026"), const FR conservée pour les pages legacy
- Gift "12 months" : affichage réel déjà dynamique (`step3_title_digital/print`) — clés mortes `step3_title/desc` réécrites avec la durée réelle, `redeem.subtitle` visible corrigé ("12 months" → formulation neutre), en+fr

---

### ✅ Session 55 — Refonte config Stripe : 3 plans stricts + catalogue live (2026-07-07)

Nettoyage complet variables/produits Stripe. `tsc --noEmit` OK, tests plan.test.ts 9/9 verts.

**Code — système 3 plans strict (free, digital mensuel, print annuel) :**
- `PRICE_MAP` (stripe-helpers.ts) réduit à `digital` + `print_annual` — `digital_annual` et `print_monthly` supprimés
- Allowlists checkout/upgrade/upgrade-preview → `["digital", "print_annual"]`
- `priceIdToPlan()` (plan.ts) → 4 price IDs ; vars legacy supprimées (`STRIPE_PRICE_ID`, `STRIPE_PRICE_DIGITAL_MONTHLY`, `STRIPE_PRICE_PRINT_MONTHLY`, `STRIPE_PRICE_PRINT_ANNUAL` sans devise)
- Webhook : `printPriceIds` = annual EUR/USD seulement ; fallback metadata simplifié
- Labels signup : entrées `digital_annual` + `print` mensuel retirées
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` supprimée partout (jamais utilisée — checkout 100% Stripe hosted, pas de Stripe.js client)
- `STRIPE_PRICE_BOOK_ONCE*` confirmées mortes (livre = prix dynamique `calcGelatoBookPrice`)
- `scripts/stripe-create-products.ts` réécrit : crée 2 produits × 2 prix (EUR/USD sous le même produit)
- `.gitignore` réparé (contenu UTF-16 corrompu inséré par une session antérieure → réécrit ASCII)

**Catalogue Stripe LIVE recréé (l'ancien catalogue live était vide — les vars Vercel pointaient vers des objets mode test) :**
- `prod_UqDtaYROKVKI0W` "Everypaw Premium Digital" : mensuel 4,99 €/$4.99 + gift one-time 4,99 €/$4.99
- `prod_UqDtrt2zti1g36` "Everypaw Premium Print" : annuel 79 €/$79 + gift one-time 79 €/$79
- Coupon gift `fZf1Hxyy` : 100% off, `duration: once` (1 mois offert sur mensuel, 1 an sur annuel)

**Vercel — 11 vars Stripe exactement** (voir section env plus haut) : 2 clés + 4 prix plans + 4 prix gift + 1 coupon. Supprimées : `STRIPE_PRICE_ID_PRINT_EUR/USD`, `STRIPE_PRICE_ID_DIGITAL_ANNUAL_EUR/USD`. Déployé + vérifié (endpoints répondent, vars présentes).

**À tester manuellement :** checkout digital + print annuel + achat cadeau jusqu'à la page Stripe (vérifier montants affichés).

**⚠️ Modes Stripe test/live :** erreur "No such price" post-deploy → `STRIPE_SECRET_KEY` Vercel était une `sk_test` alors que le nouveau catalogue (produits + prix + coupon) est en mode **live**. Les 2 catalogues sont séparés. Résolu : passage en live (sk_live + webhook live dans Vercel), page paiement Stripe fonctionnelle. Endpoint webhook live `we_1TqHQkRmAiDTHhpuLkV9Udz4` : il manquait `invoice.payment_succeeded` (traité par la route pour lever `payment_past_due` + créditer le livre au renouvellement annuel) — ajouté via API le 07-07.

**Affichage prix (commits `071d356`, `5a06455`, `93505fe`) :**
- Premium Print affiché **79 €/an** partout (le 9,99 €/mois n'existe plus) : bloc upsell dashboard, JSON-LD landings, CGV/Terms
- CGV/Terms : mention plan digital annuel (2,99 €/35,88 €) retirée
- Livre à la carte : plus aucun prix fixe affiché — prix calculé selon nombre de pages (`calcGelatoBookPrice`, minimum 28 €). CGV/Terms reformulées, tuile upgrade "dès 28 €", warning commande référence le montant affiché
- `currency.ts` : clés mortes `print` (9,99), `digitalAnnual`, `digitalAnnualMonthly`, `book` supprimées de `PRICE_TABLE`
- Clés `messages/*.json` mortes avec "29 €" (`free_book`, `order_book`, `pricing_book_note`, `product_price`) : non affichées, non corrigées — à corriger si réactivées

**CLAUDE.md restructuré (commit `05e9016`)** : 2004 → ~590 lignes (−73% contexte/session). Historique sessions 1-53 + audit UX + détail features déplacés vers `docs/SESSIONS.md`. Règle de maintenance : garder ici les 2 dernières sessions seulement, < 700 lignes. Ajout au repo : `docs/charte-graphique.md` + logos (assets Instagram, créés 06-29).

---


## Fonctionnalités implémentées

### ✅ Sprint 1 — Core
- Upload et gestion de photos (compression canvas avant upload)
- Rappels hebdomadaires par email (cron tous les lundis 8h UTC)
- Page de préférences email (`/dashboard/settings`) avec toggle opt-out
- Lien de désinscription tokenisé dans les emails
- Onboarding guidé (modal 3 étapes, sessionStorage pour résumption + bouton retour)
- Timeline visuelle des entrées groupées par mois

### ✅ Sprint 2 — Livre & monétisation
- Preview du livre en PDF (`/api/preview-pdf`)
- Commande livre imprimé via Gelato API
- Gifting — offrir un abonnement (coupon Stripe : `GLTgXWbF`)
- Page profil animal publique (`/pets/[id]`)
- Mode mémorial (`deceased_at` sur pet → badge + modal)

### ✅ Sprint 3 — Contenu & scale
- Milestones & achievements (détection automatique à la création d'entrée via `src/lib/milestones.ts`)
- Multi-langues EN/FR — solution custom (next-intl abandonné)
- Navigation globale refonte UX (sidebar 3 zones + FAB mobile)
- Filtres mood pills dans le journal
- Dashboard avec chips navigation pet + KPI améliorés

### ✅ Localisation EUR/USD (2026-05-22)
- `src/lib/currency.ts` : `getCurrencyFromCountry(countryCode)` + `formatPrice(currency, key)` — liste Europe : AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK CH NO IS GB
- `GET /api/currency` lit `x-vercel-ip-country`, retourne `{ currency }` — fallback USD (champ `country` supprimé en Round 2)
- Checkout (`/api/stripe/checkout`) : sélectionne le price ID Stripe selon la devise détectée au moment du paiement
- Upgrade (`/api/stripe/upgrade`) : lit `subscription.currency` depuis Stripe pour garder la cohérence EUR/USD sur la durée de l'abonnement
- `priceIdToPlan` dans `plan.ts` supporte les 4 variantes EUR/USD (+ anciens IDs legacy)
- Affichage dynamique dans toutes les pages de prix : landing, dashboard, settings, upgrade, gift — fetch `/api/currency` au mount, défaut USD

### ✅ QA audit 2026-05-22 — Bugs corrigés
- **Sécurité** : changement de mot de passe désormais protégé par vérification du mot de passe actuel (`signInWithPassword` avant `updateUser`)
- **Milestones** : noms d'étapes complets (suppression du `slice(0,-1)` qui retirait le dernier mot quand `name_fr` DB est sans emoji)
- **i18n** : bouton Google et séparateur "ou" désormais traduits FR/EN sur la page signup (étaient en dur en anglais)
- **Share** : "Partager ce chapitre" copie l'URL publique `${origin}/pets/[id]#story-[storyId]` dans le presse-papiers + toast "Lien copié !" (remplace la génération canvas sans feedback visible)
- **CTA page publique** : bouton nav affiche "Commencer gratuitement →" (`cta_button`) au lieu de "Commencez l'histoire de votre animal →" (`start_story`)
- **Forgot-password** : doublon du lien "← Retour à la connexion" supprimé (hors carte)

### ✅ SEO — Sprints 1, 2, 3 (2026-05-22)

**Sprint 1 — Quick wins**
- Meta description mise à jour (<155 chars, mentionne "free" + "no credit card")
- Balise canonical ajoutée (`alternates.canonical`) dans `layout.tsx`
- `public/robots.txt` créé (`Allow: *` + pointer sitemap)
- `src/app/sitemap.ts` généré (6 URLs : `/`, `/fr/`, 3 légales, contact)
- Contenu démo homepage traduit EN (9 strings FR → EN dans `page.tsx`)

**Sprint 2 — Données structurées & i18n**
- JSON-LD `FAQPage` (6 Q&R EN) dans `page.tsx`
- JSON-LD `FAQPage` FR dans `src/app/fr/page.tsx`
- JSON-LD `SoftwareApplication` (3 offres + aggregateRating 5/3) dans les deux pages
- hreflang `en`/`fr`/`x-default` dans `layout.tsx` (alternates.languages)
- `src/app/fr/layout.tsx` : metadata FR (title, desc, canonical `/fr`, `og:locale fr_FR`)
- `src/app/fr/page.tsx` : page française complète et interactive (toutes sections, pricing dynamique EUR, JSON-LD FR)
- `<html lang>` dynamique : middleware injecte `x-pathname`, root layout lit le header pour basculer `lang="en"|"fr"`
- Images publiques auditées — `alt` déjà correct sur les pages publiques

**Sprint 3 — Contenu SEO**
- H2 SEO après H1 (EN + FR) : style identique au sous-titre, H1 intact
  - EN : "The AI-powered pet journal that prints into a hardcover book every year"
  - FR : "Le journal pour animaux propulsé par l'IA, imprimé en livre relié chaque année"
- Enrichissement copy — 4 mots-clés, ≥2 occurrences chacun, `messages/en.json` + `messages/fr.json` :
  - `pet journal app` / `application journal pour animaux` → f1_desc + f4_desc
  - `pet diary` / `carnet de vie pour animaux` → f1_desc + s1_desc
  - `pet memory book` / `livre de souvenirs pour animaux` → f3_desc + f5_desc
  - `animal journal` / `journal animalier` → f2_desc + s2_desc

**Règles i18n SEO**
- Toute modification copy dans `messages/en.json` doit avoir son équivalent dans `messages/fr.json`
- La page `/fr/` est gérée par `src/app/fr/page.tsx` (composant autonome, `getTranslations("fr")` direct, pas de `useLocale`)
- `<html lang>` est dynamique via middleware (`x-pathname`) — ne pas repasser à `lang="en"` statique

### ✅ Sécurité backend (2026-05-22)
- **Webhook Stripe idempotent** : guard contre les retries — `stripe_subscription_id` pour les abonnements, `events_log.metadata.stripe_event_id` pour les achats livre, event ID loggé sur tous les événements
- **Rate limit `/api/generate`** : 10 générations/user/jour (UTC) — count `stories.created_at >= today` avant body parsing ; 429 `daily_generation_limit` si dépassé
- **RLS Supabase** : policies ajoutées sur `daily_prompts`, `events_log`, `milestones`, `milestone_definitions` + policies storage bucket `pet-photos` (migration `fix_rls_missing_tables.sql`)

### ✅ Audit sécurité routes API (2026-05-22)
- **`/api/generate`** : confirmé correctement protégé — `createServerClient` + `getUser()` + 401 immédiat avant tout traitement, Anthropic jamais appelé sans session valide
- **`/api/emails/auth-hook`** : vérification webhook remplacée — ancienne comparaison bearer token (fail-open si `SUPABASE_HOOK_SECRET` absent) → HMAC-SHA256 sur header `x-supabase-signature` avec `timingSafeEqual`, fail-closed (401 si secret absent ou signature invalide), body lu via `req.text()` avant tout parsing

### ✅ Session start hook Claude Code (2026-05-22)
- `.claude/hooks/session-start.sh` : lance `npm install` au démarrage de chaque session remote (no-op local)
- `.claude/settings.json` : enregistre le hook `SessionStart`
- Garantit que `node_modules` est disponible dès l'ouverture de session web/mobile/desktop

### ✅ Commande de livre — 10 personnalisations (2026-05-22)

**Backend `preview-pdf/route.ts`**
- **GET** (Gelato) : token HMAC-SHA256 signé obligatoire (`?token=...&expires=...`), généré par `gelato/order` via `src/lib/pdf-token.ts` (TTL 48h)
- **POST** (aperçu in-app dashboard) : session requise + vérification ownership du pet via service role
- `export const dynamic = "force-dynamic"` pour éviter le prerender Next.js au build
- **i18n** (Point 1) : dict `STRINGS` EN/FR — couverture, chapitres, dédicace, dates localisées
- **Dédicace** (Point 7) : page insérée après la couverture si `?dedication=...`
- **Photo de couverture** (Point 10) : `linear-gradient` + image si `?coverPhoto=...`
- **Filtre année** (Point 9) : stories et entries filtrées par `?year=YYYY`
- **Filtre chapitres** (Point 4) : `?storyIds=id1,id2,...`
- **pageCount dynamique** (Point 3) : calculé depuis le contenu réel (min 20, arrondi au pair)

**Backend `gelato/order/route.ts`**
- **Guard `canOrderBook`** (Point 8) : `getUserPlan()` + `canOrderBook()` avant tout appel Gelato
- **Devise dynamique** (Point 2) : `getCurrencyFromCountry(x-vercel-ip-country)` remplace `"USD"` fixe
- **pageCount dynamique** (Point 3) : passé à Gelato selon le contenu sélectionné
- Tous les nouveaux params (`lang`, `storyIds`, `dedication`, `coverPhoto`, `year`) transmis à l'URL du PDF

**Backend `book-checkout/route.ts`**
- **EUR/USD** (Point 5) : `STRIPE_PRICE_BOOK_ONCE_EUR` / `STRIPE_PRICE_BOOK_ONCE_USD` selon pays, fallback `STRIPE_PRICE_BOOK_ONCE` *(obsolète depuis : prix calculé dynamiquement via `calcGelatoBookPrice(pageCount)`, plus aucun Price ID livre)*

**UI `order/page.tsx`**
- **Filtre année** (Point 9) : sélecteur affiché si ≥2 années de données ; reset selectedStoryIds au changement
- **Sélection chapitres** (Point 4) : checkboxes sur chaque chapitre visible
- **Photo de couverture** (Point 10) : 8 miniatures cliquables + bouton "Par défaut"
- **Dédicace** (Point 7) : textarea dans le step adresse, compteur 400 chars
- **Pays élargi** (Point 6) : 25 pays via `COUNTRIES` array + `SHIPPING_BY_COUNTRY` étendu

### ✅ Fix step aperçu commande livre (2026-05-22)
- `yearFilter` s'initialise désormais à l'année la plus récente avec des données (`Math.max(...years)`) au lieu de l'année courante — évite de masquer toutes les sections si les données sont d'une année précédente
- `availablePhotos` (sélecteur photo de couverture) tire de toutes les entrées du pet, pas seulement celles filtrées par année
- Sélecteur d'année affiché dès qu'il y a au moins 1 année de données (au lieu de ≥2)

### ✅ Visibilité offre livre à la carte (2026-05-23)
- **Landing EN + FR** : bloc "Book à la carte" supprimé de la section pricing (footnote `?plan=book`) — grille reste à 3 colonnes : Free · Digital · Print
- **`canOrderBook()`** (`src/lib/plan.ts`) : plan `digital` ajouté comme autorisé à commander un livre (avant : seulement `print` + `bookCredits > 0`)
- **Pet stories tab** (`/dashboard/pets/[id]`) : CTA "Order book" + bouton preview PDF affichés uniquement si `plan === 'digital' || plan === 'print'` — masqués pour `free` et `book_only` ; page fetche désormais `plan` en plus de `is_premium` depuis `profiles`
- **Page upgrade** (`/dashboard/upgrade`) : section "Book à la carte" masquée pour `free` et `book_only` — visible uniquement pour `digital` et `print`
- **Étape confirm commande** : warning amber non bloquant si `selectedStoryIds.length < 3` — clé i18n `order.few_stories_warning` ajoutée en EN et FR

### ✅ Fix pricing annuel landing (2026-05-23)
- **Badge toggle "Annual"** : `−40 %` → `−34 %` (landing EN + FR)
- **Digital card en mode annuel** : affiche `$2.99/mo` (`2,99 €/mois`) + sous-titre `"billed $35.90/year"` (`"facturé 35,90 €/an"`) — même logique que la carte Print
- **`src/lib/currency.ts`** : ajout de `digitalAnnual` ($35.90 / 35,90 €) et `digitalAnnualMonthly` ($2.99 / 2,99 €)

### ✅ Security review Round 1 (2026-05-23) — PR #18

**Critical fixes**
- **Book credits décrémentés** : `gelato/order` appelle `decrement_book_credits` RPC après succès Gelato pour les plans non-`print` — supprime la possibilité de commander des livres à l'infini avec un seul crédit
- **Email hook routes fail-closed** : `confirm-signup`, `change-email`, `reset-password` retournent 401 immédiatement si `SUPABASE_HOOK_SECRET` est absent (au lieu de laisser passer toute requête)

**High fixes**
- **`/api/preview-pdf` authentifié** : GET nécessite un token HMAC signé (généré par `gelato/order`), POST nécessite une session + ownership — plus d'accès anonyme au contenu du livre
- **`/api/generate` prompt injection** : `petName`, `species`, `bio`, `entries` re-fetchés depuis la DB après vérification ownership — le client ne peut plus injecter de contenu dans le prompt Claude. Paramètre `style` whitelist-validé.
- **IDOR stories** : `gelato/order` filtre les mises à jour `stories` par `user_id` — impossible de marquer les stories d'autres users comme "ordered"
- **Rate limiter in-memory** : commentaire mis à jour — explicitement non fiable sur Vercel serverless (cold start = reset)

**Medium fixes**
- **RLS entries** : `entries_public_read USING (true)` remplacé par `entries_owner_read USING (auth.uid() = user_id)` — la clé anon ne peut plus lire les journaux en bulk. La page publique `/pets/[id]` utilise `getServiceSupabase()` avec filtre `pet_id` explicite.
- **Limite entrées plan Free** : trigger Postgres `trg_enforce_free_entry_limit` (BEFORE INSERT) — `RAISE EXCEPTION 'entry_limit'` si plan free et count ≥ 10. Impossible à bypasser via l'API directe.
- **Milestones INSERT RLS** : policy `milestones_owner_insert` ajoutée — les inserts client ne sont plus bloqués silencieusement
- **Waitlist HTML injection** : email échappé via `escapeHtml` dans la notification interne
- **stripe/upgrade** : erreur DB loggée explicitement après succès Stripe (le webhook réconcilie si nécessaire)

**Low fixes**
- **`/api/unsubscribe`** : rate limiting IP ajouté (5 req/min)

### ✅ Refactoring maintenabilité (2026-05-23)

**Nouvelles libs partagées**
- `src/lib/html.ts` : `escapeHtml()` — remplace 3 copies inline identiques
- `src/lib/locale.ts` : `getProfileLocale(email)` / `getProfileLocaleById(userId)` — remplace 4 blocs try/catch de détection de langue (auth-hook, confirm-signup, change-email, reset-password)
- `src/lib/book.ts` : `calcPageCount()` — remplace 2 copies dans gelato et preview-pdf
- `src/lib/pdf-token.ts` : `generatePdfToken()` / `validatePdfToken()` — HMAC-SHA256 pour l'accès à preview-pdf depuis Gelato

**Nettoyages**
- `cron/monthly-story` + `cron/weekly-reminder` : `getServiceSupabase()` au lieu de `createClient` inline
- `gelato/order` : import dynamique de supabase/server converti en import statique
- `preview-pdf` : suppression de `_pageCount` (variable calculée jamais utilisée)
- `auth-hook` : suppression du log debug qui émettait le payload complet en clair (tokens inclus)
- `plan.ts priceIdToPlan` : les env vars absentes ne créent plus de clé `""` dans la map de lookup

**Dette connue (non bloquante)**
- `verifyBearer()` dupliquée dans 3 routes (`confirm-signup`, `change-email`, `reset-password`) — à extraire dans `src/lib/auth.ts` lors du prochain passage

### ✅ Security review Round 2 (2026-05-23) — PR #18

**Critical fixes**
- **CSS injection** (C1) : URL photo de couverture échappée pour contexte CSS — `'` → `%27` avant insertion dans `url('...')`
- **Race condition book credits** (C2) : RPC `try_consume_book_credit` (verrou `FOR UPDATE`) consommé **avant** l'appel Gelato ; `restore_book_credit` appelé en cas d'échec — remplace le duo `canOrderBook` + `decrement_book_credits`
- **UUID validation storyIds** (C3) : chaque `storyId` validé via regex UUID avant construction de l'URL PDF

**High fixes**
- **timingSafeEqual Bearer** (H1) : `===` remplacé par `timingSafeEqual` dans les 3 routes email hook (`confirm-signup`, `change-email`, `reset-password`) — prévient les attaques par timing
- **Cookie locale sécurisé** (H2) : `secure: true` (prod), `sameSite: "lax"` + `try/catch` sur le JSON parse. Note : `httpOnly` a été retiré ultérieurement (session 15) — le cookie doit être lisible par `document.cookie` dans `useLocale`.
- **Unsubscribe fantôme** (H3) : vérification du nombre de lignes affectées — 400 si token introuvable en DB (au lieu de 200 silencieux)
- **Vol de carte cadeau** (H4) : vérification `promoCode.metadata.recipient_email` === `user.email` avant activation
- **Validation params preview-pdf** (H5) : `lang` whitelisté, `year` borné 2000–2100, `dedication` limité à 500 chars
- **Injection date generate** (H7) : `periodStart`/`periodEnd` validés format `YYYY-MM-DD` avant usage en filtre DB

**Medium fixes**
- **URL injection auth-hook** (M2) : `confirmation_url` validée — hostname doit correspondre à l'instance Supabase
- **XSS auth-emails** (M3) : `escapeHtml(newEmail)` dans `buildChangeEmailEmail`
- **XSS weekly-reminder** (M4) : `escapeHtml(petNames)` dans l'email HTML
- **Injection prompt monthly-story** (M5) : champs pet isolés dans des balises XML (`<pet_details>`, `<journal_entries>`) ; modèle mis à jour `claude-sonnet-4-5` → `claude-sonnet-4-6`
- **XSS monthly-story email** (M5) : `escapeHtml(petNames)` + `escapeHtml(monthLabel)`
- **XSS suggestion** (M6) : `escapeHtml(userEmail)` sur tous les contextes HTML (affichage + lien mailto)
- **locale.ts service client** (M7) : `createClient` (server, RLS, session requise) remplacé par `getServiceSupabase()` — les hooks d'auth n'ont pas de session, les requêtes échouaient silencieusement et retournaient toujours "fr"
- **Cap entrées generate** (M8) : `.limit(50)` sur la requête entries — borne la taille du prompt Anthropic
- **Suppression compte complète** (M9) : `events_log` et `daily_prompts` supprimés avant la suppression du profil
- **Avertissement pdf-token** (M11) : log warning si `PDF_ACCESS_SECRET` absent (fallback sur service role key)

**Low fixes**
- **Audit log webhook** (L1) : `subscription.updated` loggé dans `events_log` (plan change + cancellation)
- **Privacy currency API** (L3) : champ `country` supprimé de la réponse `/api/currency`

**Migration SQL** : `supabase/migrations/round2_security_fixes_2026_05_23.sql`
- `try_consume_book_credit(p_user_id uuid) → boolean` — verrou `FOR UPDATE`, décrémente atomiquement
- `restore_book_credit(p_user_id uuid)` — rollback sur échec Gelato (no-op pour plan `print`)

### ✅ Option "Toutes les années" — dropdown commande livre (2026-05-23)
- **`order/page.tsx`** : `yearFilter` passe de `number` à `number | null` (null = toutes les années)
- **Défaut = null** : au chargement, toutes les stories sont pré-sélectionnées (plus d'initialisation sur l'année courante)
- Option "All years" / "Toutes les années" en tête du select, visible uniquement si l'animal a des données sur **plusieurs** années
- `visibleStories` et `filteredEntries` retournent tout quand `null` ; `coverPeriod` dérive l'année de fin depuis le max réel des données
- API (`gelato/order`, `preview-pdf`) géraient déjà `yearFilter = null` via guard `if (yearFilter)` — aucun changement backend

### ✅ Filtres date journal — remplacement pills par selects (2026-05-23)
- **`/dashboard/pets/[id]`** onglet Journal : pills horizontales par mois remplacées par 2 selects côte à côte
- **Année** : "All years" / "Toutes les années" + années disponibles dans les entries, décroissant
- **Mois** : "All months" / "Tous les mois" + 12 mois localisés FR/EN via `Intl.DateTimeFormat` — se remet à "All" au changement d'année
- État : `periodFilter: string | null` → `filterYear: string | null` + `filterMonth: string | null`
- Logique de filtrage identique : année seule → toutes les entries de l'année ; année+mois → mois précis ; les deux "All" → tout
- Style : `#F7F2EA` fond, `#D4C5B0` bordure, `#3D2B1F` texte, `border-radius: 8px`, hauteur 36px, inline styles

### ✅ Corrections et améliorations page commande livre (2026-05-26, session 11)

**Bugs corrigés**
- **`monthsCount` ignorait `yearFilter`** : désormais, si une année est sélectionnée → span entre la 1ère et la dernière entrée/histoire de cette année ; si "Toutes les années" → depuis la 1ère histoire écrite (plus depuis la naissance). Fallback sur `created_at` si aucun contenu.
- **`availablePhotos` tirait de toutes les années** même quand un filtre d'année était actif → "0 photos" dans les stats mais des photos proposées en couverture. Corrigé : `availablePhotos` utilise désormais `filteredEntries`.
- **`coverPhotoUrl` non réinitialisée** au changement d'année → `handleYearChange` reset maintenant `setCoverPhotoUrl(null)`.
- **`lang` non transmis** au PDF → `locale` (fr/en) est maintenant envoyé dans le body `POST /api/gelato/order` et propagé à l'URL du PDF.
- **Période absente sur chapitre 1** : fallback `period_start ?? created_at` comme partout dans le code.

**Nouvelles fonctionnalités**
- **Upload photo de couverture custom** : bouton `+` / Importer dans le picker de couverture → upload vers `pet-photos/{userId}/book-cover-{ts}.jpg` ; preview avec bouton `✕` pour retirer ; section toujours visible (pas conditionnée aux photos du journal).
- **5 thèmes de couleur** (Classique · Noir · Forêt · Océan · Rose) : swatches cliquables dans une section "Personnalisation" — preview live de la couverture ; transmis au PDF via `?theme=`.
- **Titre du livre custom** (max 60 chars) avec preview live sur la couverture ; transmis au PDF via `?customTitle=`.
- **Modale "Aperçu complet du livre"** : bouton 📖 dans le step preview → `POST /api/preview-pdf` avec tous les paramètres de personnalisation (thème, titre, couverture, année, chapitres, dédicace, langue) → iframe `srcdoc` (évite les restrictions blob URL/CSP).
- **Photos dans les chapitres** : chaque entrée avec photos est associée au chapitre dont la `period_start → period_end` couvre sa `entry_date`. Photos affichées en grille 2 colonnes à la fin du chapitre (max 4, avec date en caption). Les entrées orphelines (hors période de toute histoire) restent sur une page "Souvenirs" séparée.
- **Période affichée sur les cartes de chapitre** (front) et dans le PDF (`.chapter-period` sous le numéro de chapitre).

**Architecture `preview-pdf/route.ts`**
- `COVER_THEMES` dict avec bg/title/accent/back par thème — appliqué sur couverture, numéros de chapitre, dédicace, 4ème de couverture.
- `entryToStoryIdx` Map : association entry → story par best-match (latest `period_start` couvrant `entry_date`).
- `chapterPhotos[][]` : groupement des entrées par index de chapitre (max 4/chapitre).
- `orphanEntries[]` : entrées non couvertes par aucune période de story.
- Paramètres PDF : `?theme=`, `?customTitle=`, `?lang=`, `?year=`, `?storyIds=`, `?dedication=`, `?coverPhoto=`.

### ✅ Corrections UX, traductions et qualité (2026-05-26, session 12)

**Nouveaux fichiers**
- **`src/app/not-found.tsx`** : page 404 branded — fond crème, navbar complète (logo + liens give_gift / sign_in / get_started), titre "Page introuvable", sous-titre, bouton "← Retour à l'accueil" → `/`, footer
- **`src/lib/auth-errors.ts`** : helper centralisé pour le mapping des erreurs Supabase Auth → messages FR/EN. Fonction `getSignupError(message, isFR)` avec 4 mappings + fallback générique. Prévu pour accueillir d'autres helpers (login, reset) au même endroit.

**Auth — signup (`/auth/signup`)**
- Validation client avant l'appel Supabase : regex email + longueur ≥ 8 chars
- Erreurs par champ : bordure rouge sur l'input + message inline en `#991B1B`
- `onBlur` email : erreur si vide ou format invalide ; `onBlur` password : erreur si < 8 chars
- `onChange` : efface l'erreur seulement quand la valeur redevient valide (ne re-valide pas au keystroke)
- Bouton "Créer un compte" : `disabled + opacity:.5 + cursor:not-allowed` tant que email et password sont invalides
- Erreurs Supabase mappées via `auth-errors.ts` au lieu d'être affichées brutes

**Auth — forgot-password**
- Lien "← Retour à la connexion" ajouté sous le bouton submit (couleur `#C8813A`, `fontWeight:500`, sans soulignement, bilingue)

**Landing (`/`)**
- `<h2>` hero traduit en FR : *"Le journal de vie de votre animal, raconté par l'IA et imprimé en livre chaque année."* — EN inchangé
- Captions carousel traduits avec `isFR` : *Journal de vie / Histoire générée par l'IA / Aperçu du livre annuel*
- Stat `94M` → `isFR ? "20,3M" : "94M"` — source *FACCO / Kantar, 2023* affichée conditionnellement en FR sous le bloc stats

**CGV (`/legal/cgv`)**
- Section 2 — Prix : grille tarifaire mise à jour (Digital 4,99€/mois ou 2,99€/mois·35,88€/an ; Print 9,99€/mois ou 79€/an ; livre imprimé 35€ autres plans)
- Clause multi-devise ajoutée en tête de section 2 : *"Les prix de référence sont indiqués en euros TTC. Ils peuvent être affichés dans une autre devise lors du paiement selon votre localisation, le montant en euros faisant foi."*
- Structure `sections` passée à `Array<{ title: string; body: React.ReactNode }>` — sections texte gardent `<p>`, section 2 utilise `<div>` avec `<ul>` (HTML valide)
- Date : *26 mai 2026*

**Gift (`/gift`)**
- Navbar : liens complets ajoutés (give_gift / sign_in / get_started) — cohérent avec la home
- `gift.subtitle` mis à jour en FR + EN (invite à choisir entre Digital et Print, plus de mélange des features)
- Cards de plan : descriptions remplacées par des listes à puces explicites — Digital (Entrées illimitées · Histoires IA · Export PDF), Print (Tout le Digital · Livre relié inclus chaque année · Livraison offerte)
- **Étape de confirmation** : state `step: "form" | "confirm"` — aucune navigation, inline dans la card. Clic "Envoyer le cadeau →" → validation → récapitulatif (formule + prix, destinataire, email, message optionnel, date ou "Immédiat"). Bouton "← Modifier" retour au formulaire pré-rempli. Bouton "Confirmer et payer →" déclenche l'appel API.

### ✅ SEO, accessibilité, UX & RGPD (2026-05-26, session 14)

**SEO bilingue**
- `app/layout.tsx` : `html[lang]` défaut `"en"` (marché US), logique inversée `pathname.startsWith("/en") ? "en" : "fr"` → `startsWith("/fr") ? "fr" : "en"` (identique, corrigé)
- `app/fr/layout.tsx` : metadata FR complète avec Twitter card (`title`, `description`, `og:title`, `og:description`, `og:locale: "fr_FR"`)
- `app/fr/page.tsx` : carousel hero FR 3 slides — "Promenade au parc" / "Génération de l'histoire..." / "Imprimé et livré chaque année" / "Inclus avec Premium"
- Marchés cibles : **États-Unis + France** (architecture bilingue EN/FR avec routes distinctes `/` et `/fr/`)

**RGPD**
- `src/components/CookieBanner.tsx` : bannière client-side, `localStorage("cookie_consent")`, fond `#3D2B1F`, texte crème, bouton orange, lien `/legal/confidentialite`, `role="dialog"`, `aria-label`
- `app/layout.tsx` : `<CookieBanner />` injecté dans le `<body>` (toutes les pages)

**Dates légales centralisées**
- `src/lib/legal.ts` : constante `LEGAL_LAST_UPDATE = "26 mai 2026"` — importée dans cgv, confidentialite, mentions
- `confidentialite` : "janvier 2025" → `{LEGAL_LAST_UPDATE}` ; `mentions` : date absente → ajoutée

**Middleware — route `/app`**
- `src/middleware.ts` : `/app/*` intercepté → connecté = `/dashboard`, non connecté = `/auth/login`
- Matcher étendu : `["/app", "/app/:path*", ...]`

**Formulaire de contact**
- `src/components/ContactForm.tsx` : Client Component, select 5 sujets, validation inline, compteur 20-char, états success/error
- `src/app/api/contact/route.ts` : POST Resend, routing `orders@` si "Commande & livraison" sinon `hello@`, `replyTo: email`, email HTML brandé, validation server-side
- `app/contact/page.tsx` : `<ContactForm />` entre les blocs email et le bloc RGPD

**Signup — bandeau plan sélectionné**
- `app/auth/signup/page.tsx` : bandeau `#FFF3E0` / border `#F7C27A` au-dessus du bouton Google si `?plan=digital_annual` ou `?plan=print`, mapping 2 plans avec prix et perks

**Signup — validation champs vides**
- `useRef` sur email + password → `focus()` sur premier champ en erreur à la soumission
- Messages distincts : "est requis" (vide) vs "n'est pas valide / doit contenir 8 car." (format/longueur)
- Bouton `disabled={status === "loading"}` seulement (plus de disabled sur valeurs de champ)

**Gift — toggle mensuel/annuel**
- `billingCycle` state, par défaut `"annual"`
- Prix : `digitalAnnual`/`printAnnual` via `formatPrice`, savings "économisez 24€/40€" en mode annuel
- `planApiKey` → `"digital_annual"` / `"print_annual"` / `"digital"` / `"print"` transmis au checkout
- Badge `−34 %` harmonisé (même style que landing)

**FAQ deep-link**
- `FAQ_IDS[]` constant + `handleFaqClick` → `window.history.replaceState(null, "", "#id")`
- `useEffect` au mount : lit `window.location.hash`, ouvre l'accordéon + `scrollIntoView({ behavior:"smooth" })`
- ARIA : `aria-expanded`, `aria-controls="faq-answer-{id}"`, `role="region"`, `aria-labelledby`, `aria-hidden="true"` sur le `+` décoratif

**5 corrections UI & accessibilité**
- **Hero padding** : `alignItems: "flex-start"` (fixe overflow du flex center sur mobile — H1 se retrouvait derrière la navbar) ; `scroll-padding-top: 70px` sur `html`
- **Stats responsive** : label `maxWidth: 160`, `textAlign: "center"`, `lineHeight: 1.4` ; `margin` 2rem → 1.25rem
- **Bouton Gratuit contraste** : bordure `rgba(61,43,31,.2)` → `.55` (1.46:1 → 4.3:1, WCAG 1.4.11)
- **Badge −34 %** : `#C8813A` → `#9C6420` (4.75:1 ≥ 4.5:1 WCAG AA) ; `fontSize: .68rem` → `.75rem` ; `padding: 2px` → `3px` ; `whiteSpace: "nowrap"` ; harmonisé dans `gift/page.tsx`
- **Focus ring** : `:focus-visible { outline: 2px solid #C8813A; outline-offset: 3px; border-radius: 4px }` dans `globals.css` + `@supports selector(:focus-visible)` pour supprimer l'outline souris

### ✅ UI pricing + plan Digital annuel (2026-05-26, session 13)

**UI landing — section tarifs**
- **Badge `−34 %`** : `padding: "2px 8px"` (explicite, immune au zoom), `flexShrink: 0`, `lineHeight: 1.4` — ne déborde plus sur le bord du toggle pill
- **Prix annuel Digital** : `digitalAnnual` dans `currency.ts` corrigé `35,90 €/$35.90` → `35,88 €/$35.88` (= 2,99 × 12 exact)
- **CTA "Commencer Digital →"** : fond plein `#C8813A` + `color: #FDFAF5` + `fontWeight: 600` + hover `#B5712E` — remplace l'outline pâle ; hiérarchie Print > Digital > Gratuit cohérente
- **Affichage prix annuel Digital harmonisé sur Print** : prix principal = total annuel (`35,88 €`) au lieu du mensuel (`2,99 €`) ; sous-titre `par an · économisez 24 €` (économies = 4,99 × 12 − 35,88 = 24 €) — même pattern que Print (`par an · économisez 40 €`)

**Plan Digital annuel — implémentation complète**
- Nouvelles vars Vercel : `STRIPE_PRICE_ID_DIGITAL_ANNUAL_EUR`, `STRIPE_PRICE_ID_DIGITAL_ANNUAL_USD`, `STRIPE_PRICE_PRINT_ANNUAL_EUR`, `STRIPE_PRICE_PRINT_ANNUAL_USD`
- **`checkout/route.ts`** : `digital_annual` ajouté dans `PRICE_MAP` — le toggle annuel déclenche désormais un vrai Price ID Stripe annuel
- **`upgrade/route.ts`** : `digital_annual` + `print_annual` ajoutés — un abonné peut passer de mensuel → annuel via `POST /api/stripe/upgrade { newPlan: "digital_annual" }`
- **`plan.ts` → `priceIdToPlan()`** : les 2 nouveaux Price IDs digital annuel mappés → plan `"digital"` en DB (le plan DB ne distingue pas mensuel/annuel, c'est Stripe qui gère)
- **Landing CTA Digital** : `href` passe `?plan=digital_annual` quand `pricingCycle === "annual"`, `?plan=digital` sinon

### ✅ Fix switch langue + composants nav/footer partagés (2026-05-26, session 15)

**Bug switch langue corrigé**
- `/api/locale/route.ts` : `httpOnly: true` retiré du cookie `locale` — `document.cookie` (client-side) ne peut pas lire les cookies httpOnly. `useLocale()` ne trouvait jamais la préférence sauvegardée et retombait sur la langue du navigateur. Les pages serveur (`memorial`, `pets/[id]`) qui lisent via `cookieStore` (Next.js) continuent de fonctionner sans changement.

**Composants publics partagés** (`src/components/`)
- `PublicNav.tsx` ("use client") — `variant="full"` (logo + give_gift + sign_in + get_started) ou `"simple"` (logo seul) ; prop `fixed` pour la landing (position: fixed, zIndex: 50)
- `PublicFooter.tsx` ("use client") — `variant="full"` (logo + copyright + liens légaux) ou `"minimal"` (© seul)
- Appliqués à 8 pages : `/`, `/fr`, `/gift` (+ footer manquant ajouté), `/legal/cgv`, `/legal/confidentialite`, `/legal/mentions`, `/contact`, `/not-found`
- Pages intentionnellement exclues : `/auth/*` (UX épurée), `/redeem` + `/unsubscribe` (centered layout), `/pets/[id]` + `/memorial/[id]` (nav spécifique), `/dashboard/*` (DashboardNav)

**FAQ — mise à jour Q3 (personnalisation du livre)**
- Q3 FR + EN : reformulé de "en cours de développement" → liste des options réellement disponibles (5 thèmes de couverture, titre custom, dédicace, sélection chapitres, filtre année, photo couverture)
- JSON-LD `FAQ_JSONLD` (page.tsx) et `FAQ_JSONLD_FR` (fr/page.tsx) synchronisés avec les nouvelles réponses

### ✅ Bouton "Modifier" sur la page mémorial (2026-05-26, session 15)

- `memorial/[id]/page.tsx` : auth check server-side via `createServerClient` — si le visiteur est le propriétaire (`user.id === pet.user_id`), affiche un bouton **✏️ Modifier / Edit** dans le nav → `/dashboard/pets/{id}?openMemorial=1`
- `dashboard/pets/[id]/page.tsx` : `useEffect` détecte `searchParams.get("openMemorial") === "1"` après chargement du pet → appelle `openMemorialModal()` automatiquement
- Flow : page mémorial → clic "Modifier" → dashboard → modal mémorial pré-ouvert (photo, message, date)
- Les visiteurs non-propriétaires voient la page normalement, sans bouton

### ✅ Security review Round 3 (2026-05-26) — PR #26

**Medium fixes**
- **`try_consume_book_credit` plan Digital** (M4) : la RPC bloquait les abonnés `digital` (0 crédits) alors qu'ils ont droit aux livres. `digital` ajouté comme cas libre (pas de crédit consommé) ; `restore_book_credit` mis à jour en cohérence. Migration : `round3_security_fixes_2026_05_26.sql`.
- **XSS `/api/contact`** (M1) : `email` et `subject` interpolés en HTML sans échappement → `escapeHtml()` appliqué.
- **SSRF `coverPhotoUrl`** (M2) : URL transmise à Gelato sans validation de protocole → `https:` enforced côté serveur dans `gelato/order`.
- **Validation `shippingAddress`** (M3) : champs sans contrôle de présence ni limite de taille → validation + plafond 100 chars.
- **`CRON_SECRET` timing attack** (M5) : `===` remplacé par `timingSafeEqual` via `verifyBearer()` dans les 2 routes cron.

**Low fixes**
- **Open redirect `redirect_to`** (L1) : `redirect_to` non validé dans `confirm-signup`, `change-email`, `reset-password` → `validateRedirectTo()` ajouté, fallback si hostname invalide.
- **`verifyBearer` extrait** (L2) : fonction dupliquée dans 3 fichiers → extraite dans `src/lib/auth.ts` avec `validateRedirectTo`. Dette CLAUDE.md soldée.
- **Plan DB `upgrade`** (L3) : `digital_annual` / `print_annual` écrits tels quels en DB (type invalide) → mappés en `"digital"` / `"print"` avant écriture.
- **HMAC bytes `auth-hook`** (L4) : `timingSafeEqual` portait sur les strings hex UTF-8 → `Buffer.from(sig, "hex")` (32 bytes constants).

**Info fixes**
- **Rate limit `/api/contact`** (I2) : 3 req/min par IP via `checkRateLimit`.
- **XML injection cron** (I3) : `pet.name`, `pet.species`, `pet.bio`, `entriesText` XML-escapés avant interpolation dans les balises `<pet_details>` / `<journal_entries>`.

### ✅ Security review Round 4 (2026-05-26) — PR #27

**High fixes**
- **Prompt injection `/api/generate`** (H1) : `pet.name`, `pet.species`, `pet.bio`, `entriesText` interpolés directement dans le prompt → wrappés dans `<pet_details>` / `<journal_entries>` + `escapeXml()`. `escapeXml` extraite dans `src/lib/html.ts` (partagée). Copie locale dans `monthly-story` remplacée par l'import.
- **UUID non validés `preview-pdf` POST** (H2) : `storyIds` du client sans validation → UUID_REGEX ajouté, cohérent avec `gelato/order`.
- **Détails Gelato exposés au client** (H3) : `details: data` dans la réponse d'erreur supprimé — l'erreur complète reste en logs serveur uniquement.

**Medium fixes**
- **Détail erreur Anthropic exposé** (M1) : `detail: anthropicData.error` supprimé de la réponse `/api/generate`.
- **Plafond message contact** (M2) : max 5000 chars sur le message `/api/contact`.
- **Format `scheduledDate`** (M4) : regex `YYYY-MM-DD` validée avant construction de la Date dans `/api/gift/create`.
- **`coverPhoto` HTTPS `preview-pdf` POST** (M5) : validation `https:` ajoutée (cohérence avec `gelato/order`).
- **`createClient` inline** (M6) : remplacé par `getServiceSupabase()` dans `preview-pdf` et `unsubscribe` (règle projet).

**Low fixes**
- **`user_id` dans logs** (L1) : retiré du log INSERT payload dans `/api/generate` (RGPD).
- **UUID `petId`** (L4) : validation UUID_REGEX ajoutée dans `generate`, `gelato/order`, `preview-pdf` GET+POST.
- **CSP `'unsafe-eval'`** (L5) : retiré de `script-src` dans `next.config.js`.

**Info fixes**
- **`GELATO_API_KEY` manquante** (I1) : guard explicite avant l'appel Gelato — évite consommation d'un crédit sur appel voué à l'échec.
- **`WAITLIST_TO_EMAIL` crash** (I2) : rendu optionnel avec `console.warn` si absent (plus de crash).
- **Redirect protocol-relative** (I3) : `!next.startsWith("//")` ajouté dans `/auth/callback`.

### ✅ Fix auth hook signup 500 + gift auth guard (2026-05-27, session 18)

**Auth hook — signup retournait HTTP 500**
- Cause racine : `SUPABASE_HOOK_SECRET` absente de Vercel → hook retournait 401 → Supabase propageit en 500 client.
- Fix 1 : variable ajoutée à Vercel et documentée dans `.env.local.example` avec note sur le format.
- Fix 2 : mauvais header — `x-supabase-signature` → `webhook-signature` (Supabase suit le spec **Standard Webhooks**).
- Fix 3 : contenu signé incorrect — body seul → `{webhook-id}.{webhook-timestamp}.{body}` (Standard Webhooks).
- Fix 4 : décodage du secret incorrect — on strippait `v1,` (3 chars) alors que le format Supabase est `v1,whsec_<base64>` (9 chars de préfixe). Après strip complet : `Buffer.from(secretB64, "base64")` comme clé HMAC.
- `auth-errors.ts` : ajout des patterns `unexpected_failure`, `hook`, `send email`, rate-limit, email déjà enregistré.
- `signup/page.tsx` : `console.error` du `signupError` complet (message + status) pour faciliter le debug futur.

**Standard Webhooks — format de vérification définitif** (`/api/emails/auth-hook`)
```
header    : webhook-signature: v1,<base64_hmac>
signed    : {webhook-id}.{webhook-timestamp}.{raw-body}
secret    : Buffer.from(secret.replace(/^v1,whsec_/, "").replace(/^v1,/, ""), "base64")
algo      : HMAC-SHA256, digest base64
```
Rotation de clés : `webhook-signature` peut contenir plusieurs signatures espace-séparées (toutes testées).

**Gift `/gift` — guard auth + UX 401**
- `handleGoToConfirm` (maintenant async) : `supabase.auth.getUser()` avant d'afficher le récap — redirige vers `/auth/login?redirect=/gift` si non connecté.
- Sauvegarde du formulaire dans `sessionStorage("gift_form")` avant redirect ; restauration automatique au mount (champs + plan sélectionné + cycle annuel/mensuel).
- `handleConfirm` : `res.status === 401` → `authError = true` (filet de sécurité si session expirée entre les étapes).
- Bannière d'erreur contextuelle : 401 = *"Vous devez être connecté… Se connecter →"* (lien `/auth/login?redirect=/gift`) ; autres erreurs = message générique. Style unifié `#FEF2F2 / #FCA5A5 / #991B1B`.

### ✅ Bug fixes (2026-05-27, session 16)

**Milestones orphelins — comptage ≠ liste affichée (`dashboard/pets/[id]/page.tsx`)**
- Cause : la liste était construite depuis `milestone_definitions` ; les milestones dont le `type` n'existe pas dans cette table (ex. `in_memory` créé à la déclaration d'un décès, ou `first_entry` legacy avant la migration vers `first_memory`) étaient comptés dans le badge/barre de progression mais jamais affichés dans la section "Débloquées".
- Fix : après le mapping des définitions, on détecte les milestones "orphelins" (`milestones` dont le `type` n'est pas dans `definedKeys`) et on les ajoute à `allItems` via `MILESTONE_TYPES` fallback pour l'icône/label. `achievedItems.length` coïncide désormais avec `milestones.length`.

**Mockup hero page `/` — textes hardcodés en anglais (`app/page.tsx`)**
- Cause : `isFR` était disponible dans le composant mais aucun string du mockup téléphone ne l'utilisait — même pour un utilisateur FR sur `/` (détection navigateur), tout le carrousel restait en EN. La route `/fr/page.tsx` (composant autonome) était correcte.
- Fix : tous les strings du mockup passés en ternaires `isFR ? "FR" : "EN"` — nav bar (titre slide + sous-titre `"2 ans"/"2 yrs"`), slide 0 (entrées journal, label `"Aujourd'hui"`, typing, bouton `"+ Ajouter un moment"`), slide 1 (label génération, en-tête chapitre, texte histoire avec guillemets « »), slide 2 (titre aperçu, sous-titre, badge Premium).

### ✅ Bug fixes E2E landing / signup / login (2026-05-27, session 19)

**P1 — Paramètre plan annuel incorrect pour "Commencer Print"**
- `app/page.tsx` (landing EN) : bouton Print rendu dynamique → `?plan=print_annual` quand `pricingCycle === "annual"` (Digital était déjà correct)
- `app/fr/page.tsx` (landing FR) : les deux boutons Digital + Print étaient statiques — rendus dynamiques avec le même pattern que la landing EN

**P2 — Bannière plan signup incomplète et prix erronés**
- `auth/signup/page.tsx` : `PLAN_LABELS` complété avec les 4 plans (`digital`, `digital_annual`, `print`, `print_annual`)
- Correction du prix `print` mensuel : était `"79 €/an"` (annuel !) → `"9,99 €/mois"` / `"$9.99/mo"`
- Perks bilingues FR/EN (étaient hardcodés en français uniquement)

**P3 — Messages d'erreur login en anglais (Supabase brut)**
- `auth/login/page.tsx` : ajout du cas `"missing email or phone"` → `"L'adresse email est requise."`
- Fallback générique : `error.message` brut → `"Une erreur est survenue. Veuillez réessayer."` / `"An error occurred. Please try again."`

### ✅ Bug fixes et i18n (2026-05-27, session 20)

**Localisation par pays (IP) sur la landing**
- `/api/currency` : retourne désormais `isFrance: boolean` (`x-vercel-ip-country === "FR"`) en plus de `currency`
- `app/page.tsx` + `app/fr/page.tsx` : témoignages et stats basculés sur `isFrance` (IP) au lieu de `isFR` (langue) — France = 20,3M + source FACCO/Kantar, reste du monde = 94M
- Ajout de `stats_pets_us` dans les deux fichiers JSON (nécessaire pour la satisfaction du type union TypeScript)

**Suppression des tirets longs**
- Tous les `—` remplacés par `,` dans `messages/en.json` et `messages/fr.json`

**Limites de caractères sur le formulaire d'édition animal**
- `dashboard/pets/[id]/edit/page.tsx` : Nom/40, Race/50, Bio/300 — compteur `xx/xxx` sous chaque champ, rouge à 90%
- Même règle appliquée rétrospectivement aux compteurs existants de `order/page.tsx` : customTitle rouge à ≥54/60, dedication rouge à ≥360/400

**Numérotation des pages dans la preview PDF**
- `api/preview-pdf/route.ts` : CSS counter sur `.chapter`, `.dedication`, `.photo-page` — numéro centré en bas de chaque page intérieure ; couverture et 4ème de couverture exclues

**Propagation de la locale dans les liens de partage**
- `dashboard/pets/[id]/page.tsx` : les 3 URLs de partage (story, profil, mémorial) incluent désormais `?lang=${locale}`
- `pets/[id]/page.tsx` + `memorial/[id]/page.tsx` : détection locale par priorité `?lang` URL param → cookie → Accept-Language header

**Entrées de journal antidatées**
- `dashboard/pets/[id]/page.tsx` : sélecteur de date dans le formulaire d'entrée (max = aujourd'hui), surligné en amber si date ≠ aujourd'hui ; `entry_date` transmis à Supabase

**Crédits livre — plan Print (Option 1 : 1 livre/an inclus, supplémentaires à $29)**
- Migration SQL `fix_book_credits_print_plan_2026_05_27.sql` : `try_consume_book_credit` et `restore_book_credit` s'appliquent à tous les plans (suppression de l'exemption print/digital incorrecte de Round 3)
- `plan.ts canOrderBook()` : require `bookCredits > 0` pour tous les plans non-free
- `order/page.tsx` : fetch `plan` + `book_credits` au mount ; bloc upsell affiché quand `book_credits === 0` avec CTA Stripe book-checkout
- i18n : `no_credits_title`, `no_credits_desc`, `no_credits_cta` EN + FR

**FAQ a1 — réécriture moins anxiogène**
- `messages/en.json` + `messages/fr.json` : nouvelle formulation centrée sur la facilité d'utilisation
- JSON-LD `FAQPage` synchronisé dans `app/page.tsx` et `app/fr/page.tsx`

**i18n milestones et journal — suppression des ternaires `isFR` hardcodés**
- `messages/en.json` + `messages/fr.json` : ajout de `milestones.steps_completed`, `not_yet`, `unlocked`, `locked`, `auto_hint` + `journal.generating_1/2/3`
- `dashboard/pets/[id]/page.tsx` : tous les `isFR ? "EN" : "FR"` remplacés par `t.milestones.xxx` / `t.journal.xxx`

### ✅ Génération PDF réel pour Gelato (2026-05-28, session 22)

**Problème** : Gelato retournait "File format isn't supported — Supported formats: PNG, TIF, SVG, JPG, PDF". `preview-pdf` retourne `text/html`, pas un vrai PDF.

**Solution : `/api/book-pdf/route.tsx`** — nouvel endpoint utilisant `@react-pdf/renderer` :
- Retourne `application/pdf` (200×200mm, police standard PDF Times-Roman / Helvetica)
- Mêmes paramètres URL que `preview-pdf` GET (petId, token, expires, lang, year, dedication, theme, customTitle, storyIds, coverPhoto, layouts)
- Même logique de données (entryToStoryIdx, chapterPhotos, orphanEntries, page count, blank pages)
- 4 layouts par chapitre : `classic` (texte + grille photo bas), `photo_hero` (image pleine largeur en haut), `split` (2 colonnes texte/photos), `text_only`
- Cover photo : `<Image>` absolu + overlay `rgba(0,0,0,0.55)` quand photo présente
- `next.config.js` : `serverExternalPackages: ["@react-pdf/renderer"]` — évite les conflits de bundling
- `gelato/order` : URL changée de `/api/preview-pdf` → `/api/book-pdf`
- `preview-pdf` GET reste disponible mais n'est plus utilisé par Gelato — `preview-pdf` POST reste pour l'aperçu in-app dashboard

**Dédup crédits Print — fix race condition (2026-05-28, session 22)** :
- `checkout.session.completed` attribue 1 crédit pour plan Print (dedup par `stripe_subscription_id`, `event_type: "stripe_print_subscription_credit"`, `source: "checkout"`)
- `invoice.payment_succeeded` avec `subscription_create` : vérifie la même clé de dedup avant d'attribuer (agit en fallback si checkout a déjà attribué)
- `invoice.payment_succeeded` avec `subscription_cycle` : renouvellements annuels, dedup par `stripe_event_id`
- Résout la race condition où `invoice.payment_succeeded` arrive avant que `stripe_customer_id` soit écrit par `checkout` → `book_credits = 0`

### ✅ Fix numérotation pages PDF preview (2026-05-28, session 21)

**Bug : saut de numéro dans la numérotation (2 → 4 au lieu de 2 → 3)**
- Cause : le dernier chip d'un chapitre multi-pages était volontairement masqué (évite l'effet "double chip" quand le dernier segment est court), mais le compteur `pageNum` était quand même incrémenté via `pageNum++; continue` — la page "invisible" consommait un numéro.
- Fix : `if (i === n - 1 && n > 1) { pageNum++; continue; }` → `if (i === n - 1 && n > 1) { continue; }` dans le script JS de `api/preview-pdf/route.ts`.
- Résultat : numéros consécutifs sans trous, quelle que soit la hauteur des chapitres.

### ✅ Crédits livre Print — attribution automatique (2026-05-28, session 21)

**Webhook `invoice.payment_succeeded`** :
- Nouveau handler : attribue 1 crédit livre aux abonnés Print sur `billing_reason === "subscription_create"` (première souscription) et `"subscription_cycle"` (renouvellement)
- Vérifie que le price ID de la facture est un Print price ID (mensuel ou annuel EUR/USD — 5 variables d'env)
- Idempotence : `events_log.metadata.stripe_event_id` avant tout incrément, trace insérée après succès (`event_type: "stripe_invoice_book_credit"`)
- `checkout.session.completed` ne pose plus de credit directement — source unique évite la double attribution

**Page `/dashboard/pets/[id]/order`** — bloc upsell différencié :
- `plan === "print"` + `book_credits === 0` → bloc `print_extra_book_*` : "Votre livre annuel a déjà été commandé cette année. / Commander un exemplaire supplémentaire (29 €/29$)"
- `plan !== "print"` (digital, book_only) + `book_credits === 0` → bloc `no_credits_*` existant inchangé
- 3 nouvelles clés i18n EN + FR : `order.print_extra_book_title`, `order.print_extra_book_desc`, `order.print_extra_book_cta`

**`canOrderBook()`** (`src/lib/plan.ts`) : confirmé correct — autorise si `bookCredits > 0` pour tous les plans non-free (aucun changement).

> **Action Stripe requise** : activer `invoice.payment_succeeded` dans la config webhook Stripe si pas déjà fait.

### ✅ Audit UX/UI complet (2026-06-02, session 23)

Voir tableau "Sujets restants" ci-dessous pour les items non encore traités.

**Commits de la session** :
- `76ab349` — 11 quick wins (copyright, redirect /en, virgule hero, bouton génération stories, etc.)
- `ba333f8` — CGU checkbox signup + tooltip PetSelector
- `04f3180` — Détection langue auto par navigateur, suppression switcher
- `f584b91` — M4-M11 batch (cookie banner, confirm mdp, indicateur next chapter, section livre landing, cron on-this-day)

**Changements majeurs** :
- `useLocale` : plus de cookie locale, pur `navigator.language` — `{ locale, t }` uniquement
- `DashboardNav` : `LanguageSwitcher` retiré
- Signup : champ confirmation mdp + checkbox CGU avec liens légaux
- Stories tab : bouton génération + bandeau "prochain chapitre dans Xj"
- Landing : section "Un livre relié, pas juste un PDF" entre testimonials et pricing (mockup 3D CSS + 4 specs)
- Cron `on-this-day` : email quotidien FR/EN "Il y a X an, [animal]…" pour users avec entrées ce jour

### 🚧 Prochaine étape
- ~~Exécuter les migrations SQL~~ ✅
- ~~Configurer `STRIPE_PRICE_BOOK_ONCE_EUR` / `STRIPE_PRICE_BOOK_ONCE_USD`~~ ✅
- ~~Publier Google OAuth~~ ✅
- ~~Migration `fix_book_credits_print_plan_2026_05_27.sql` exécutée~~ ✅
- **Passer Stripe en mode Live** (voir checklist prod)
- Traiter les sujets UX restants (voir ci-dessous)

---

---

## Sujets UX/UI restants (audit 2026-06-02)

### ✅ Tous les items traités en session 24 (2026-06-02)

| ID | Description | PR | Statut |
|---|---|---|---|
| M6 | CGV dans flows Stripe (`custom_text` + `consent_collection` + mentions sous boutons) | #46 | ✅ |
| M5-bis | `consent_collection: { terms_of_service: "required" }` dans checkout Stripe | #46 | ✅ |
| Mo1 | Footnote "Au-delà de 10 entrées…" sous carte Free landing | #48 | ✅ |
| Mo2 | "+ Livre imprimé disponible à la commande" dans features Digital | #48 | ✅ |
| Mo5 | Sous-titre forgot-password | #46 | ✅ |
| Mo6 | Lien "← Retour à l'accueil" sur signup/login/forgot-password | #46 | ✅ |
| Mo7 | "Envoyé instantanément." sur Gift how-it-works étape 2 | #48 | ✅ |
| Mo8 | Hint keyword sur milestones bloqués (`unlock_hint` i18n) | #47 | ✅ |
| Mo10 | Crédits livre sur dashboard + settings | #47 | ✅ |
| Mo11 | "Envoyé chaque lundi matin." dans settings rappels | #46 | ✅ |
| Mo12 | Export RGPD JSON — `GET /api/export-data` + bouton settings | #50 | ✅ |
| Mo13 | Bouton "Supprimer mon compte" avec bordure rouge | #46 | ✅ |
| Mo14 | Bouton aperçu PDF dans order page | déjà fait | ✅ |
| Mo15 | "0 photos" cliquable → journal avec tooltip | #49 | ✅ |
| Mo16 | Testimonials : prénom + ville + type animal en deux lignes | #49 | ✅ |
| Mo17 | Pill "X moments ce mois · Prochain chapitre dans Xj" sur journal tab | #48 | ✅ |
| Mo18 | Footnote paywall IA sous carte Free landing | #46 | ✅ |
| LT3 | 3 routes cron manquantes : `streak-alert`, `birthday-check`, `daily-prompts` | #51 | ✅ |

### Long terme (non traité — faible urgence)
| ID | Description | Effort |
|---|---|---|
| ~~LT1~~ | ~~Exit-intent capture email~~ | ✅ session 31 — `ExitIntentPopup.tsx`, `mouseleave` top + 3s delay, `sessionStorage`, POST `/api/waitlist`, FR/EN. Commit `0a05387`. | — |
| ~~LT2~~ | ~~Partage social natif sur profil public avec Open Graph preview~~ | ✅ session 31 — `generateMetadata` OG+Twitter sur `/pets/[id]`. Commit `6858ec1`. | — |
| ~~LT3~~ | ~~Page `/books` — bouton "Recommander le même exemplaire"~~ | ✅ session 31 — `books/page.tsx` : lien "Recommander" passe `?configId=X&startStep=address`. `order/page.tsx` : lit `startStepParam`, saute au step après chargement config. "Dupliquer en brouillon" reste sur `preview`. Commit `245667a`. | — |
| ~~LT4~~ | ~~Page `/books` — bouton "Créer un nouveau livre à partir de ce modèle"~~ | ✅ déjà en place — "Dupliquer en brouillon" + `?configId=` existants couvrent ce cas. | — |
| ~~LT5~~ | ~~Date de renouvellement Stripe~~ | ✅ déjà implémenté — `/api/stripe/subscription` existe, settings + order page affichent la date. Migration SQL ajoutée : `add_subscription_renewal_date_2026_06_05.sql` (colonne `bigint` sur `profiles`). | — |
| ~~LT6~~ | ~~Wording crédit livre settings~~ | ✅ session 29 — commit `69a9624` | — |
| ~~LT7~~ | ~~Page mémorial `/memorial/[id]`~~ | ✅ session 31 — déjà implémentée. Ajouté : `generateMetadata` OG+Twitter, colonne `memorial_photo_url` (migration `add_memorial_photo_url_2026_06_05.sql`), helper `anonClient()`. Commit `accd141`. | — |

---

### ✅ Session 24 — UX/UI restants (2026-06-02)

**PR #46** — M6, Mo5, Mo6, Mo11, Mo13, Mo18 :
- CGV dans checkout Stripe (`custom_text` + `consent_collection`) + mentions sous boutons upgrade/gift
- Sous-titre forgot-password + lien "← Retour à l'accueil" sur 3 pages auth
- "Envoyé chaque lundi matin." dans settings
- Bouton "Supprimer mon compte" avec bordure rouge (plus lien texte)
- Footnote paywall IA sous Free card landing

**PR #47** — Mo8, Mo10 :
- Milestones bloqués : hint "Mentionnez '{keyword}' pour débloquer" — clé `milestones.unlock_hint` EN+FR, keywords depuis `MILESTONE_TYPES` (EN = `keywords[0]`, FR = `keywords[1] ?? keywords[0]`)
- Crédits livre : badge orange sur dashboard book card + affichage dans settings section abonnement (plan Print)

**PR #48** — Mo1, Mo2, Mo7, Mo17 :
- Footnote Free card landing (10 entrées + paywall IA)
- Feature "+ Livre imprimé disponible à la commande" dans Digital card
- "Sent instantly." / "Envoyé instantanément." sur Gift step 2
- Pill progression mensuelle sur journal tab : `thisMonthCount` entrées ce mois + `daysUntil` jours avant génération auto, vert si chapitre déjà généré ce mois

**PR #49** — Mo15, Mo16 :
- "0 photos" dans stats pill order page → Link dotted vers `?tab=journal` avec `title` tooltip
- Testimonials : `authorStr.split(" , ")` → `name` (bold) + `meta` (animal + ville, muted) — landing EN + FR

**PR #50** — Mo12 :
- `GET /api/export-data` : auth requise, retourne JSON avec profile/pets/entries/stories/milestones/book_configs
- Settings : section "Mes données / My data" avec bouton download client-side (blob URL)

**PR #51** — LT3 :
- `streak-alert` (17:00/jour) : alerte si dernière entrée 4–7 jours — fenêtre de réengagement optimale
- `birthday-check` (8:00/jour) : `.like("birthdate", "%-MM-DD")` pour matcher toutes les années ; âge calculé ; email branded FR/EN
- `daily-prompts` (7:00/jour) : 10 prompts par espèce (dog/cat/default) EN+FR, rotation déterministe `dayOfYear % len` ; skip si entrée déjà ajoutée aujourd'hui ou user sans historique

---

### ✅ Session 25 — Refonte navigation mobile (2026-06-03)

**Commits** : `e1af93e`, `8e7b9ea`, `bcfafbb`, `b528597`

**Navigation mobile — bottom nav → header + burger drawer** :
- Suppression bottom nav (56px) + FAB orange flottant
- Header fixe top : burger (gauche, 44×44px) + logo centré
- Drawer slide-in depuis la gauche (272px) : PetSelector + 6 items nav (Accueil, Journal, Histoires IA, Étapes, Livre, Mes livres) + Suggestion + Paramètres + Déconnexion
- `ep-bottom-nav` et `ep-fab` supprimés de `globals.css` → remplacés par `ep-mobile-header`
- `padding-bottom: 56px` → `padding-top: 56px` sur `ep-dashboard-main`
- `.ep-toast` : offset bottom nav supprimé → `bottom: 1.5rem` fixe

**Audit UX mobile + fixes** (5 corrections post-audit) :
- Tap targets : burger + bouton X → `44×44px` explicite
- Scroll lock : `body.overflow = hidden` via `useEffect` quand drawer ouvert
- Safe-area notch : `paddingTop: env(safe-area-inset-top)` sur le drawer panel
- A11y : `aria-hidden` + `inert` sur drawer fermé
- Dead code : `mobileOnly` / `shortLabel` supprimés de `mainItems`

**Page animal (`/dashboard/pets/[id]`)** :
- Bio tronquée à 3 lignes (`-webkit-line-clamp: 3`) + bouton "Voir plus / See more" si bio > 120 chars
- Tab bar pills horizontale (Journal · Histoires IA · Étapes) affichée directement sous la card profil — plus besoin d'ouvrir le drawer pour switcher d'onglet

---

### ✅ Session 26 — Corrections UX mobile suite (2026-06-03)

**Commits** : `c509492`, `272d394`, `af6035d`, `32196a3`, `fe4b3cb`, `6674ce0`, `7ef7962`, `631b08f`, `90f5717`, `7b15d96`

**Bugs et polish :**
- "Moments récents" dashboard : `whiteSpace: nowrap` → `-webkit-line-clamp: 2` (texte ne déborde plus)
- Card profil animal mobile entièrement restructurée : layout vertical (photo+nom en ligne, kebab `position: absolute`, milestone badge en pill horizontale, bio + liens mémorial pleine largeur)
- Tab bar labels : majuscules + libellés alignés avec drawer (Journal, Histoires IA, Étapes / Journal, AI Stories, Milestones)
- Tuile "Votre livre 2026" dashboard : `gridColumn: "1 / -1"` → pleine largeur des 2 colonnes
- Boutons modales (édition, suppression, génération) : `display: flex + alignItems: center + justifyContent: center + minHeight` — pills correctes et texte centré
- Dates ordinales partout : `fmtDateOrdinal()` dans `src/lib/date.ts` — "1er juillet" / "July 1st", "2nd", "3rd"… appliqué sur entries, stories, milestones, settings, dashboard
- Boutons mise en page livre : grille 2×2, labels raccourcis (Photo / Texte)
- Boutons page order (Commander, Aperçu, Sauvegarder, Retour) : `display: flex`, centrage, `minHeight`, CTA raccourci "Commander un exemplaire · 29 € →"
- "Nouveau livre" button : `display: inline-flex + whiteSpace: nowrap + flexShrink: 0` — plus de wrapping dans le header flex

**Nouveau fichier :**
- `src/lib/date.ts` : `ordinalDay(day, isFR)` + `fmtDateOrdinal(date, isFR, options)` — helper de dates ordinales FR/EN réutilisable

---

---

### ✅ Session 27 — Tests comptes livre, corrections bugs order page (2026-06-04)

**Seed de test** (`supabase/seed_book_test.sql`) : 5 comptes yopmail couvrant les scénarios free (bloqué), digital (bloqué), print-fresh (1 crédit), print-ordered (0 crédit + book_config), print-multi (3 crédits). Comptes créés via Supabase Admin API (`scripts/create-test-users.mjs`, SERVICE_ROLE_KEY effacée après usage). Mot de passe : `Test1234!`.

**Bugs corrigés suite aux tests automatisés (Claude Chrome, comptes A–E)** :

- **Plan Free** (`order/page.tsx`) : bannière gate + CTA désactivé pour `plan === "free"` → lien vers `/dashboard/settings`
- **Plan Digital** : bannière upsell neutre (sans mention "Print"), prix dynamique via `extraBookPriceLabel`, lien "Passer au plan Print / Upgrade to Print"
- **Step adresse — validation inline** : bordure rouge par champ + texte "Champ requis / Required" ; suppression des `alert()`
- **Step adresse — info crédit** : affichage "1 crédit utilisé · reste N / 1 credit used · N remaining" quand `book_credits > 0`
- **book_config name vide** (`gelato/order`) : `name` défaut sur l'année courante au lieu de chaîne vide (→ "Sans titre" corrigé)
- **i18n** (`messages/fr.json` + `messages/en.json`) : réécriture `no_credits_*`, ajout `no_credits_upgrade_cta`, suppression du prix 29 € hardcodé dans `print_extra_book_desc`

**Commit** : `30871b6` — 4 fichiers (`order/page.tsx`, `gelato/order/route.ts`, `messages/fr.json`, `messages/en.json`)

**Round 2 corrections (commit `b6bb3db`) suite aux tests A–E :**
- **A (Free)** : bouton CTA désormais visible + grisé/disabled (était caché car `book_credits=0`) — condition `book_credits > 0 || plan === "free"`
- **B (Digital)** : `no_credits_desc` FR/EN reécrits sans mention "Premium Print" → wording neutre ("plan actuel", "abonnement supérieur")
- **D (Print ordered)** : bouton "Commander un exemplaire supplémentaire" ajouté dans le bloc `print_extra_book` → passe à l'étape adresse au clic

Tous les comptes A–E ✅ PASS après round 2.

---

---

### ✅ Session 28 — Améliorations mineures (2026-06-04)

**PR #53 — minor-improvements**

- **Liste animaux triée alphabétiquement** (`DashboardNav.tsx`) : `.order("name", { ascending: true })` remplace `.order("created_at", ...)` — valable sidebar desktop et drawer mobile
- **Point "nouveau chapitre" dans le menu** (`DashboardNav.tsx`) : fetch des stories des 30 derniers jours au mount, `newChapterPetIds: Set<string>` passé à `PetSelector` — point orange + `title` tooltip "Nouveau chapitre disponible / New chapter available" dans la liste des animaux. Même tooltip ajouté sur les chips du dashboard (`dashboard/page.tsx`).
- **Settings — toggle auto-save** (`settings/page.tsx`) : bouton "Enregistrer les préférences" supprimé — `handleToggleReminders` sauvegarde `email_reminders` immédiatement au clic du toggle (rollback en cas d'erreur)
- **Settings — toggle corrigé** : `overflow: hidden` sur le bouton toggle pour éviter le débordement visuel du thumb
- **Settings — boutons full-width** : `btnOutline` perd `alignSelf: flex-start`, gagne `width: "100%"`, `display: "block"`, `textAlign: "center"`, `boxSizing: "border-box"` — appliqué à tous les boutons action sauf "Réinitialiser le guide"
- **Page order — livraison affichée après adresse** (`order/page.tsx`) : step confirm affiche désormais `shippingEstimate` (depuis `SHIPPING_BY_COUNTRY[address.country]`) au lieu du générique "calculée à la commande" — cohérent avec le bloc déjà conditionnel du step adresse
- **Page books — chip animal** (`books/page.tsx`) : fetch du pet (name, species, photo_url) au mount, chip pill affiché dans chaque cartouche (photo ou emoji espèce + nom)

### ✅ Session 29 — Refacto + Security Round 5 (2026-06-05)

**Refacto `order/page.tsx`**
- 1460 lignes → 7 render closures (`renderPreviewModal`, `renderStepper`, `renderUpsellBanners`, `renderPreviewStep`, `renderSuccessStep`, `renderConfirmStep`, `renderAddressStep`) — `return` réduit à 23 lignes
- Closures sur l'état parent : zéro prop drilling, zéro changement de logique

**Security Round 5 — 7 findings corrigés**
- **H1** `book-configs POST` : `cover_photo_url` validée `https://` à l'écriture (SSRF)
- **H2** `book-configs POST` : `selected_story_ids` — chaque élément validé UUID_REGEX
- **M1** `book-configs POST` : `story_layouts` — valeurs whitelistées (`classic|photo_hero|split|text_only`)
- **M2** `book-configs POST` : `year_filter` — borné 2000–2100
- **M3** `export-data` : rate limit 3 req/heure par user via `checkRateLimit`
- **L1** crons (`streak-alert`, `birthday-check`, `daily-prompts`, `on-this-day`) : `unsubscribe_token` null-guardé → fallback `/dashboard`
- **L2** `book-configs DELETE` : vérifie `count` après delete → 404 si aucune ligne affectée

### ✅ Session 31 — Memorial + OG social + LT1/LT2/LT3 + pricing + coach marks (2026-06-05)

**Commits** : `accd141`, `6858ec1`, `ca22206`, `0a05387`, `430bb60`, `245667a`, `cdd0515`, `a018d14`, `82f647a`, `2a544af`

**Page `/memorial/[id]`** — était déjà implémentée (165 lignes). Complétée :
- `generateMetadata()` : OG (`og:title`, `og:description`, `og:image`) + Twitter card — partage social Facebook/LinkedIn/WhatsApp/Slack/Discord/Twitter ✅
- Colonne `memorial_photo_url text` ajoutée sur `pets` (migration `add_memorial_photo_url_2026_06_05.sql`, appliquée en prod)
- `anonClient()` helper extrait pour éviter duplication dans `generateMetadata` + `MemorialPage`
- Design : dark (#1C1410), photo ronde 140px, dates naissance/décès, message mémorial, 3 dernières histoires IA, CTA signup
- Bouton "Modifier" visible propriétaire seulement
- RLS `pets_public_read` + `stories_public_read` : public SELECT ✅
- Lien depuis `/dashboard/pets/[id]` (bouton "Voir la page mémorial") ✅

**LT2 — OG meta `/pets/[id]`** (`src/app/pets/[id]/page.tsx`) — commit `6858ec1`
- `generateMetadata()` : title `{nom} · {espèce} · Everypaw`, description = bio ou fallback, OG + Twitter card
- Photo quand disponible (`photo_url`), sinon `summary` sans image
- Même couverture sociale : Facebook / LinkedIn / WhatsApp / Slack / Discord / Twitter ✅

**LT1 — Exit-intent popup** (`src/components/ExitIntentPopup.tsx`) — commit `0a05387`
- Déclenche sur `mouseleave` vers le haut de page, après 3s de délai
- Une seule fois par session via `sessionStorage`
- Email → POST `/api/waitlist` (confirmation Resend + notif interne déjà en place)
- FR/EN, état succès, gestion erreur rate-limit
- Injecté dans `/` (isFR détecté) et `/fr` (always FR)

**LT3 — Recommander saute au step adresse** — commit `245667a`
- `books/page.tsx` : bouton "Recommander/Reorder" → `?configId=X&startStep=address`
- `order/page.tsx` : `startStepParam` lu depuis URL, `setStep(startStepParam)` après chargement config (garde validité des valeurs)
- "Dupliquer en brouillon" inchangé → reste sur `preview`
- LT4 : déjà couvert par "Dupliquer en brouillon" + `?configId=` existants

**Arrondi supérieur prix livre** (`src/lib/gelato-pricing.ts`) — commit `a018d14`
- `Math.ceil` au lieu de `Math.round` → prix toujours entier (ex: 27,46 → 28 €)
- Cohérent affichage + charge Stripe (même fonction)
- Prix abonnements `currency.ts` inchangés (contrôlés par Stripe)

**Coach marks contextuels** (`src/components/CoachMark.tsx`) — commits `82f647a`, `2a544af`
- Composant toast bottom-right, slide-in animé, dismissible (× / "OK compris" / CTA)
- Affiché une seule fois par clé `localStorage` (`ep_cm_*`)
- 3 instances dans `pets/[id]/page.tsx` :
  1. `entries>=1 && stories=0` → push génération histoire IA (délai 1,5s)
  2. `stories>=1` → push création livre (délai 2s)
  3. `plan=print && book_credits>0` → rappel livre offert (délai 2,5s)
- "Réinitialiser le guide" dans Settings efface aussi les 3 clés `localStorage`
- Profile query étendue avec `book_credits`

---

### ✅ Session 30 — Features UX + qualité (2026-06-05)

**Commits** : `69a9624`, `c03770b`, `46c3e94`, `fa95918`

**Indicateur de force du mot de passe** (`src/components/PasswordStrength.tsx`)
- Composant partagé : 3 barres colorées + label FR/EN (Faible/Weak · Moyen/Medium · Fort/Strong)
- Invisible < 8 chars — contrainte min-length inchangée
- Logique : classes de caractères (min/maj/chiffre/spécial) + bonus longueur ≥ 14
- Couleurs : rouge `#A32D2D` / amber `#C8813A` / sage `#6B7B5E`
- Injecté dans : `auth/signup`, `auth/update-password`, `dashboard/settings`
- `settings` : placeholder "Nouveau mot de passe" mis à jour avec `(min. 8 caractères)`

**Wording crédit livre settings** (`settings/page.tsx`)
- `book_credits > 0` → "📖 Votre livre offert n'a pas encore été commandé"
- `book_credits === 0` → "📖 Votre livre offert a déjà été commandé [· Prochain : date]"

**Migration `subscription_renewal_date`** (`supabase/migrations/add_subscription_renewal_date_2026_06_05.sql`)
- Colonne `bigint` sur `profiles` — Unix timestamp Stripe `current_period_end`
- Était déjà utilisée par webhook + settings + order page sans migration formelle

**Export données — format HTML lisible** (`/api/export-data?format=html`)
- Fichier `.html` stylé palette Everypaw, sections par animal, imprimable (`@media print`)
- Contenu : profil → animaux → journal (date/mood/tags) → histoires IA → étapes
- Tout échappé via `escapeHtml()` — pas de risque XSS
- Même rate limit 3/heure que JSON
- `settings/page.tsx` : bouton HTML primaire + bouton JSON rétrogradé (texte secondaire)

**Roadmap — entrées ajoutées** : LT3 (reorder même exemplaire), LT4 (cloner config), LT5 ✅, LT6 ✅

### ✅ Session 31 (suite) — Abonnements annuels + réactivation + factures (2026-06-05)

**Commits** : `8bf7d3c` (reactivate), `c11705d` (invoices + billing settings)

**Abonnement annuel — toggle dans Settings** (`settings/page.tsx`)
- `SubscriptionInfo` interface : champ `interval: "month" | "year"` (retourné par `/api/stripe/subscription`)
- État `settingsBilling: "monthly" | "annual"` initialisé depuis `subscription.interval`
- Toggle mensuel/annuel visible dans la section abonnement pour tous les états de plan (free, digital, print)
- `handleCheckout` étendu : `"digital" | "digital_annual" | "print_monthly" | "print_annual"` — calcule le bon plan selon `settingsBilling`
- Correction : `handleCheckout("print")` → `handleCheckout("print_monthly")` (clé invalide dans `PRICE_MAP`)
- Correction : plan Digital respecte le billing cycle (`digitalPlan` dérivé de `settingsBilling`)
- **Page upgrade** : toggle annuel masqué via `{false && (...)}` — mensuel uniquement pour l'instant. Commentaire : `TODO: remove false && to re-enable annual billing`

**Réactivation abonnement** (`src/app/api/stripe/reactivate/route.ts`) — nouveau fichier
- `POST /api/stripe/reactivate` : `stripe.subscriptions.update(id, { cancel_at_period_end: false })`
- `resolveSubscriptionId()` : si `stripe_subscription_id` absent, lookup via `customer.id` status=active + backfill DB
- Bouton "Annuler ma résiliation" dans `settings/page.tsx` si `subscription.cancel_at_period_end === true`
- État `reactivateLoading` + vidage de `cancelledAt` après succès

**Factures Stripe** (`src/app/api/stripe/invoices/route.ts`) — nouveau fichier
- `GET /api/stripe/invoices` : fetch `stripe.invoices.list({ customer: stripe_customer_id, limit: 24 })` filtré `status=paid`
- Retourne : `id, number, amount_paid, currency, created, invoice_pdf, hosted_invoice_url, period_start, period_end`
- Retourne `{ invoices: [] }` si pas de `stripe_customer_id`
- Masqué entièrement pour users free (pas de customer ID)

**Section "Mes factures" dans Settings**
- Visible uniquement si `invoices.length > 0`
- Par facture : montant · date de paiement · période couverte · numéro · bouton "PDF" + bouton "Voir"
- Chargée au mount dans `useEffect` via `fetch("/api/stripe/invoices")`

**`/api/stripe/subscription`** — `interval` ajouté à `formatSubscription()`
- Retourne `interval: (sub.items.data[0]?.plan?.interval ?? "month") as "month" | "year"`

**Action requise (Stripe Dashboard)** : Settings → Billing → Customer emails → activer "Successful payments" pour envoi automatique PDF facture

---

**Modal confirmation upgrade** (`settings/page.tsx` + `src/app/api/stripe/upgrade-preview/route.ts`) — commit `2e9361f`
- Clic bouton upgrade → `handleUpgradeWithPreview(plan)` → `GET /api/stripe/upgrade-preview?newPlan=`
- Route preview : `stripe.invoices.retrieveUpcoming()` (prorata exact) + `stripe.customers.retrieve(expand: invoice_settings.default_payment_method)` (last4 + brand)
- Modal : montant TTC · carte "Visa ····4242" · warning "⚠️ Ce changement est effectif immédiatement."
- "Confirmer et payer →" → `handleUpgrade()` (existant) → upgrade effectif + fermeture modal
- Spinner "Calcul…" pendant le fetch preview, boutons désactivés pendant upgrade
- État `upgradePreviewLoading` distinct de `upgradeLoading` pour feedback précis

---

### ✅ Session 32 — 3 plans, PDF download, garde annuelle (2026-06-05)

**Commits** : `35f4ba4` (modal upgrade), `b96747f` (3 plans simplification)

**Simplification à 3 plans** (Digital mensuel + Print annuel + Free)
- Suppression du plan Print mensuel (vecteur d'abus : subscribe→commande livre offert→annule→recommence chaque mois)
- `src/app/dashboard/settings/page.tsx` : toggle billing cycle supprimé du bloc abonnement — `handleCheckout` accepte `"digital" | "print_annual"` uniquement
- `src/app/dashboard/upgrade/page.tsx` : toggle annuel/mensuel supprimé (déjà simplifié en session 31)
- `src/app/dashboard/page.tsx` : `handleSubscribe("print_monthly")` → `handleSubscribe("print_annual")`
- `src/app/page.tsx` (landing EN) + `src/app/fr/page.tsx` (landing FR) : toggle billing cycle supprimé, prix fixes Digital `formatPrice(currency,"digital")` + Print `formatPrice(currency,"printAnnual")` · "per year · hardcover book included" / "par an · livre relié inclus" · CTA `/auth/signup?plan=digital` et `/auth/signup?plan=print_annual`
- `src/app/gift/page.tsx` : toggle mensuel/annuel supprimé, Digital = `formatPrice(currency,"digital")`/mois, Print = `formatPrice(currency,"printAnnual")`/an, `planApiKey` = `"digital"` | `"print_annual"` uniquement

**Guard annuelle crédits livre** (`src/app/api/stripe/webhook/route.ts`)
- `last_book_credit_at timestamptz` colonne sur `profiles` (migration à appliquer : `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_book_credit_at timestamptz;` — déjà appliquée)
- Avant tout incrément `increment_book_credits` dans `invoice.payment_succeeded` : calcul `daysSinceLast` depuis `last_book_credit_at` → skip si < 365j
- Après incrément : `last_book_credit_at: new Date().toISOString()` écrit en DB
- Protection même si l'utilisateur annule+resouscrit : l'horloge repart de la dernière attribution

**Téléchargement PDF réel** (Digital + Print, page order uniquement)
- `src/app/api/book-pdf-link/route.ts` — NEW : `POST` auth + plan check (`digital`|`print`) + ownership pet + `generatePdfToken(petId)` → URL signée avec `?download=1`, retourne `{ url, filename: "Everypaw-{name}.pdf" }`
- `src/app/api/book-pdf/route.tsx` — modifié : `?download=1` → `Content-Disposition: attachment; filename="Everypaw-{name}.pdf"` (vs `inline` pour Gelato)
- `src/app/dashboard/pets/[id]/order/page.tsx` — modifié : bouton "📄 Télécharger le PDF" / "📄 Download PDF" dans le step aperçu ; `handleDownloadPdf()` POST → `window.location.href` ou anchor click

**Pagination factures** (`src/app/dashboard/settings/page.tsx`)
- `invoicesVisible` state (init 3) + `.slice(0, invoicesVisible)` sur la liste
- Bouton "Voir plus (N restantes)" → `+6` par clic
- Container scrollable `maxHeight: 380px, overflowY: "auto"` quand > 3 factures

**Modal confirmation upgrade** (`settings/page.tsx` + `src/app/api/stripe/upgrade-preview/route.ts`)
- `GET /api/stripe/upgrade-preview?newPlan=` : prorata via `stripe.invoices.retrieveUpcoming()` + carte via `stripe.customers.retrieve(expand: invoice_settings.default_payment_method)`
- Modal : montant TTC · carte "Visa ····XXXX" · warning immédiat · boutons Annuler / "Confirmer et payer" (`flex: 1` pour égalité de largeur)

### ✅ Session 32 (suite) — Security Round 6 + Refacto pré-prod (2026-06-05)

**Commit** : `67e04bb`

**Security — `book-pdf-link` input validation (High)**
- `lang` whitelisté `["en","fr"]`, `year` borné 2000–2100, `dedication` max 500, `theme` whitelisté, `customTitle` max 60, `storyIds` UUID_REGEX, `coverPhoto` https: enforced (SSRF), `layouts` valeurs whitelistées
- Defence-in-depth : `book-pdf/route.tsx` validait déjà à réception, mais la validation doit aussi être à la source du token

**Refacto — `src/lib/stripe-helpers.ts`** (nouveau fichier)
- `PRICE_MAP` : source unique pour les 4 plans EUR+USD — remplace 3 copies divergentes (`upgrade` avait `"print"`, `checkout` avait `"print_monthly"` — drift silencieux)
- `resolveSubscriptionId(stripe, userId, subscriptionId, customerId)` : remplace 2 fonctions inline identiques dans `cancel` + `reactivate`
- Consommé par 5 routes : `checkout`, `upgrade`, `upgrade-preview`, `cancel`, `reactivate`

**Règle critique ajoutée**
- **Partage Stripe** : tout `PRICE_MAP` et toute résolution de subscription ID doivent passer par `src/lib/stripe-helpers.ts`. Ne jamais dupliquer inline.
- **Changement de plan** : toujours différer via `SubscriptionSchedules` (2 phases, `proration_behavior: "none"`) — jamais de mise à jour directe des items avec proration. La DB est réconciliée par le webhook `customer.subscription.updated` au démarrage de la phase 2, pas avant.

### ✅ Session 33 — Security Round 7 (2026-06-05)

**Commit** : `82c5b94`

**Findings corrigés :**

- **`generate/route.ts` (H)** : `detail: insertError.message` retiré de la réponse JSON → loggé côté serveur uniquement (règle : ne jamais exposer les erreurs internes)
- **`book-checkout/route.ts` (H)** : `petId` validé UUID_REGEX avant usage dans les URLs de redirect Stripe (prévient la manipulation de chemin) + `pageCount` borné ≤ 500 (prévient les commandes abusives)
- **`account/delete/route.ts` (H)** : `book_configs` supprimé explicitement avant `profiles` (violation FK potentielle si contrainte `user_id → profiles.id` sans CASCADE)
- **`gift/redeem/route.ts` (M)** : remplace `STRIPE_PRICE_ID_PRINT` / `STRIPE_PRICE_ID_DIGITAL` (env vars non documentées, probablement absentes en prod) par `PRICE_MAP` + `getCurrencyFromCountry` — cohérent avec le reste du codebase + gère EUR/USD
- **`gift/create/route.ts` (M)** : metadata Stripe `plan: "print"` → `"print_annual"` (cohérence 3 plans)

### ✅ Session 34 — Security Round 8 (2026-06-05)

**No findings — full API surface reviewed, all clean.**

Files audited this round (no changes required):
- `emails/auth-hook` : Standard Webhooks HMAC-SHA256 + timingSafeEqual + confirmation_url domain check ✅
- `emails/confirm-signup` / `change-email` / `reset-password` : Bearer auth via `verifyBearer` + `validateRedirectTo` ✅
- `preview-pdf` POST branch : ownership check `pet.user_id !== user.id` + UUID + https: coverPhoto + layouts whitelist ✅
- `middleware.ts` : clean redirect logic, no issues ✅
- `currency/route.ts` : read-only, no user input ✅
- `locale/route.ts` : whitelist `["en","fr"]`, secure cookie ✅
- Cron routes (6 files) : all use `verifyBearer` + `CRON_SECRET` min-32-char guard ✅

**Full API surface is now reviewed across 8 rounds. Codebase is production-ready from a security standpoint.**

### ✅ Session 35 — Security Round 9 (2026-06-05)

**Commit** : `abec9d4`

**Findings corrigés :**

- **`checkout/upgrade/upgrade-preview` plan allowlist** (M1) : `PRICE_MAP` contient encore `print_monthly` (legacy) — les 3 routes acceptaient n'importe quelle clé de la map, permettant à un utilisateur de souscrire directement au plan mensuel Print via API directe, contournant la simplification 3 plans. Fix : `ALLOWED_PLANS = ["digital", "digital_annual", "print_annual"]` validé avant toute logique dans les 3 routes.
- **CSP `frame-src` incomplet** (L1) : seulement `https://js.stripe.com` — les flux 3D Secure Stripe utilisent aussi `https://checkout.stripe.com`. Fix : ajouté à `frame-src` dans `next.config.js`.

**Fichiers revus sans finding :**
- `stripe/webhook/route.ts` — signature `constructEvent`, idempotence, garde annuelle crédits, tous corrects ✅
- `stripe/cancel/route.ts`, `stripe/reactivate/route.ts`, `stripe/subscription/route.ts`, `stripe/invoices/route.ts` — clean ✅
- `lib/auth.ts` (`verifyBearer` + `validateRedirectTo`) — clean ✅
- `auth/callback/route.ts` — redirect guard correct (startsWith("/") + !startsWith("//")) ✅
- `api/contact/route.ts` — rate limit + escapeHtml + SUBJECT_ROUTING whitelist ✅
- `next.config.js` — headers HSTS/CSP/X-Frame-Options corrects (hors frame-src) ✅

### ✅ Session 36 — Security Round 10 (2026-06-05)

**Commits** : `28a03af`, `6a3a957`

**Findings corrigés :**

- **`auth-emails.ts` XSS** (M1) : version EN de `buildChangeEmailEmail` interpolait `${newEmail}` brut dans le HTML — la version FR utilisait déjà `escapeHtml`. Fix : `escapeHtml(newEmail)` dans les deux branches.
- **`gelato/order` `yearFilter` non validé** (M2) : pas de type-check ni de range-check. Une string ou valeur hors 2000-2100 filtrait silencieusement à 0 stories. Fix : `Number.isInteger(yearFilter) && yearFilter >= 2000 && yearFilter <= 2100`.
- **`gelato/order` `dedicationText` non borné** (L1) : aucune limite de longueur → risque URL overflow / DB bloat. Fix : max 500 chars validé avant ownership check.
- **`gelato/order` `addressLine2` non borné** (L2) : les autres champs d'adresse avaient `ADDR_MAX = 100`, pas `addressLine2`. Fix : validation conditionnelle ajoutée.
- **`weekly-reminder` unsubscribe_token null guard manquant** (L3) : `?token=null` littéral si token null — unsubscribe route rejetait. Fix : même null-guard que les 4 autres crons (Round 5 l'avait manqué).

**Fichiers revus sans finding :**
- `api/generate/route.ts` — plan gate, ownership, escapeXml, UUID, rate limit DB-backed ✅
- `lib/rate-limit.ts` — correctement documenté comme non fiable sur serverless, commentaire clair ✅
- `lib/auth-emails.ts` — toutes les branches escapées (hors M1 corrigé) ✅
- `api/gelato/order/route.ts` — SSRF, UUID, credit atomic, IDOR guard ✅ (hors M2/L1/L2)
- `cron/monthly-story` — escapeXml prompt, escapeHtml emails ✅
- `cron/birthday-check`, `on-this-day`, `streak-alert`, `daily-prompts` — clean ✅

### ✅ Session 37 — Security Round 11 (2026-06-05)

**Commit** : `0e694f0`

**Finding corrigé :**

- **Open redirect `login/page.tsx` + `signup/page.tsx`** (H) : `getRedirectTarget()` acceptait n'importe quelle valeur pour le paramètre URL `redirect` — incluant des URLs absolues externes (`https://evil.com`). Après login email/password, `window.location.href = getRedirectTarget()` redirigait sans validation, exposant le `?code=` de cadeau à un site malveillant. Fix : `redirect.startsWith("/") && !redirect.startsWith("//")` — même garde que `auth/callback/route.ts`. Appliqué aux deux pages.

**Fichiers revus sans finding :**
- `src/lib/html.ts` — `escapeHtml` + `escapeXml` correctes, pas de cas edge manquant ✅
- `src/lib/plan.ts` — `getUserPlan`, `getUserPlanById`, guards, `priceIdToPlan` ✅
- `src/app/api/unsubscribe/route.ts` — rate limit, UUID/hex token format, count check ✅
- `src/app/pets/[id]/page.tsx` — service role justifié, filtres `pet_id`, JSX auto-escape ✅
- `src/app/memorial/[id]/page.tsx` — anon client, ownership check pour bouton édition ✅
- `src/app/auth/update-password/page.tsx` — validation client min 8 chars + confirm match ✅
- `src/app/api/generate/route.ts` — clean (revue Round 10) ✅
- `src/app/auth/login/page.tsx` — path Google OAuth safe (passe par auth/callback qui valide) ✅

### ✅ Session 38 — Security Round 12 (2026-06-05)

**Commit** : `1539cea`

**Finding corrigé :**

- **`redeem/page.tsx` — URL param injection** (L) : `code` (gift code) non encodé dans `loginUrl` / `signupUrl`. Un code contenant `&` ou `?` (via l'input field) pouvait créer des URL malformées avec injection de paramètres. Impact réel nul (serveur valide `^[A-Z0-9_-]+$` + guard redirect), mais fix propre : `encodeURIComponent(code)` sur les 3 URLs.

**Fichiers revus sans finding :**
- `api/gelato/status/[orderId]/route.ts` — IDOR guard via `book_configs` ownership, `orderId.length > 100`, filtrage des champs réponse ✅
- `api/suggestion/route.ts` — rate limit 3/min, bounds (3–2000 chars), `escapeHtml` ✅
- `api/waitlist/route.ts` — rate limit, email regex + max 254 chars, `escapeHtml` sur notif interne ✅
- `api/export-data/route.ts` — auth session, rate limit 3/hr par user, tout `escapeHtml`'é en HTML ✅
- `redeem/page.tsx` — auth check avant form, `window.location.href = data.url` depuis API (URL Stripe) ✅
- `lib/rate-limit.ts` — limitations documentées (serverless unreliable), `getClientIp` correct ✅
- `api/gift/redeem/route.ts` — code format `^[A-Z0-9_-]+$`, recipient_email check, PRICE_MAP ✅
- `api/stripe/book-checkout/route.ts` — UUID petId, `pageCount` borné 28–500 ✅

### ✅ Session 39 — Security Round 13 — Dashboard client pages (2026-06-05)

**Commit** : `964fbcc`

**Findings corrigés :**

- **`books/page.tsx` — `trackingUrl` sans validation `https://`** (Info) : `<a href={shipment.trackingUrl}>` — URL depuis Gelato API rendue directement. Fix : `shipment?.trackingUrl?.startsWith("https://")` avant le rendu.
- **`settings/page.tsx` — `invoice_pdf` + `hosted_invoice_url` sans validation `https://`** (Info) : URLs depuis Stripe API rendues comme `<a href>`. Fix : `?.startsWith("https://")` sur les deux. Toutes avaient déjà `rel="noopener noreferrer"`.

**Pages dashboard revues sans finding :**
- `dashboard/page.tsx` — auth session client, JSX auto-escape, `handleSubscribe` plan typé ✅
- `dashboard/upgrade/page.tsx` — plans hardcodés (`"digital"` | `"print_annual"`), URLs Stripe ✅
- `pets/new/page.tsx` — auth `getUser()`, upload canvas→JPEG, `maxLength` sur inputs ✅
- `pets/[id]/edit/page.tsx` — auth + RLS session, même pattern upload ✅
- `pets/[id]/books/page.tsx` — IDOR via book_configs session-scoped, `rel="noopener noreferrer"` ✅
- `settings/page.tsx` — `signInWithPassword` avant update mdp, confirm "DELETE" avant suppression compte, `encodeURIComponent(newPlan)` sur upgrade-preview ✅

**Couverture complète :** 37 fichiers API + 8 pages dashboard + 8 pages auth/public. Codebase production-ready.

### ✅ Session 40 — Changement de plan en fin de période (2026-06-06)

**Commit** : `5656b77` — PR #66

**Problème** : `upgrade/route.ts` utilisait `proration_behavior: "always_invoice"` → factures au prorata immédiates, parfois à 0 €, et DB mise à jour avant le renouvellement effectif.

**Solution** : les changements de plan passent désormais par les **Stripe SubscriptionSchedules** avec `proration_behavior: "none"` — le nouveau plan démarre proprement au prochain renouvellement.

- `upgrade/route.ts` : crée (ou met à jour) un `SubscriptionSchedule` en 2 phases — Phase 1 : plan actuel jusqu'à `current_period_end` ; Phase 2 : nouveau plan à partir du renouvellement. La DB n'est plus mise à jour immédiatement — le webhook `customer.subscription.updated` réconcilie au changement de phase.
- `upgrade-preview/route.ts` : ne calcule plus de prorata — retourne uniquement `{ scheduledDate: current_period_end }`.
- `settings/page.tsx` : modal de confirmation revu — affiche la date effective, "Aucun paiement immédiat", bouton "Confirmer" (plus "Confirmer et payer"). Toast de succès : "Changement planifié pour le [date]".

### ✅ Session 40 (suite) — Code cadeau dans les paramètres (2026-06-06)

**PR #68**

- `src/app/api/gift/redeem/route.ts` : détecte si l'utilisateur a un abonnement actif. Si oui → crée/met à jour une `SubscriptionSchedule` (phase 2 = plan cadeau + coupon 100% off, `proration_behavior: "none"`) → retourne `{ scheduled: true, activatesAt, plan }`. Si non (plan free) → flow checkout Stripe existant inchangé.
- `src/app/dashboard/settings/page.tsx` : section "Vous avez un code cadeau ?" dans le bloc abonnement — input monospace + bouton "Activer" ; état succès inline avec la date d'activation et le plan cadeau ; erreurs traduits FR/EN ; touche Entrée déclenche l'activation.

### ✅ Session 41 — Fixes UX order page, dashboard, gift page (2026-06-06)

**Order page (`/dashboard/pets/[id]/order`)**
- Bouton "Retour au profil" supprimé, picto 📄 retiré du bouton PDF, bloc "Commander un exemplaire supplémentaire" supprimé
- Fix `handleDownloadPdf` : `a.click()` après `await fetch()` perdait le contexte geste → `window.location.href = data.url`
- Fix `handleFullPreview` : `res.ok` vérifié avant `res.text()`, `alert()` si échec

**Dashboard — pets d'autres utilisateurs visibles**
- Cause : `pets_public_read` RLS retourne toutes les lignes ; requêtes dashboard sans filtre `user_id`
- `DashboardNav.tsx` + `dashboard/page.tsx` : ajout `getUser()` + `.eq("user_id", user.id)` sur toutes les requêtes pets/stories/entries

**Landing — section features**
- Bouton "Offrir un abonnement" / "Give a subscription" ajouté dans la feature f6 (cadeau)
- Style identique au CTA hero — appliqué sur `page.tsx` (EN) et `fr/page.tsx` (FR)

**Gift page (`/gift`) — mobile layout**
- Cause : CSS global `display: inline-flex` sur `<button>` en mobile écrase le layout interne
- Fix : `display: "block"` + `flexDirection: "column"` hardcodé sur le container des cartes de plan

**Gift flow — suppression de l'obligation de connexion**
- `api/gift/create/route.ts` : guard `getUser()` + 401 supprimé — achat cadeau sans compte requis
- `gift/page.tsx` : `handleGoToConfirm` synchrone, redirect login supprimée

**Gift — validité du code cadeau (12 mois · usage unique)**
- `api/gift/create/route.ts` : `expires_at = now + 365 jours` sur `promotionCodes.create` Stripe
- Email footer + page succès : "Code valable 12 mois · Usage unique" (clé i18n `gift.code_validity`)

**Convention ajoutée**
- `display: "block"` obligatoire sur les `<button>` avec contenu structuré (labels, prix, listes)

### ✅ Session 42 — Fix gift sans paiement + nav sans animal (2026-06-08)

**Commits** : `3e1ae06`, `18ef79c`

**Bug critique — Gift généré sans paiement**
- `/api/gift/create` créait le coupon Stripe sans aucun paiement → supprimé
- Nouveau flow deux étapes :
  1. `/api/gift/checkout` : crée une Stripe Checkout session one-time avec les données du formulaire en metadata → retourne `{ url }`
  2. `/api/gift/complete` : vérifie `session.payment_status === "paid"`, crée le promo code (idempotent via `idempotencyKey: gift-complete-{sessionId}`), envoie l'email
- `gift/page.tsx` : `handleConfirm` redirige vers Stripe ; `useEffect` au mount détecte `?session_id=` et appelle `complete`
- 4 nouvelles env vars Vercel : `STRIPE_GIFT_PRICE_ID_DIGITAL_EUR/USD` + `STRIPE_GIFT_PRICE_ID_PRINT_EUR/USD` (one-time prices Stripe)

**Bug nav — liens inaccessibles sans animal**
- Sans pet, tous les liens pet-spécifiques (Journal, Histoires IA, Étapes, Livre, Bibliothèque) pointaient vers `/dashboard`
- Fix : fallback vers `/dashboard/pets/new` au lieu de `/dashboard`

### ✅ Session 43 — UI fixes + tests impression + factures livres (2026-06-09)

**Commits** : `8feefc4`, `e29e0cd`, `629d8d0`, `b59c4e2`, `dc42048`, `6070716`, `03c8deb`, `90d452f`

**Renommages UI**
- Onglet "Histoires IA" / "AI Stories" → "Histoires" / "Stories" (i18n + `pets/[id]/page.tsx` + `DashboardNav.tsx`)
- Bouton "Animal introuvable" → CTA "Créer le profil de votre animal" lien `/dashboard/pets/new` (avec texte `not_found` conservé au-dessus)

**Fixes mobile — centrage boutons**
- Cause racine : `globals.css` ligne 174 — `display: inline-flex` sur tous les `<button>` en mobile écrase `textAlign`
- Fix systématique : `display: flex + justifyContent: center` sur signup "Créer un compte", `planCard` upgrade, `btnPrimary` + `btnOutline` settings
- Bouton "Offrir un abonnement" landing : `display: block + textAlign: center` (pleine largeur)
- Bouton "Activer" code cadeau : `width: auto` override (était cassé par `width: 100%` de `btnPrimary`)

**Labels "Généré automatiquement"**
- Dashboard home tuile "prochain chapitre" : sous la date du prochain chapitre
- Pet page onglet Histoires : dans la pill progress `month_progress_days` (i18n)
- Pet page onglet Histoires : sous la date dans la tuile "Prochain chapitre" (layout column)

**Champs obligatoires pets/new**
- Nom : `*` retiré du JSON (était dupliqué — le code l'ajoute), label propre
- Date de naissance : ajout validation `if (!birthdate)` dans `handleCreate`, clé i18n `birthday_error`
- Bouton "Créer le profil" : `textAlign: center`

**Gate livre trop court**
- `order/page.tsx` : extraction `rawPages` avant `Math.max(28, ...)` → `tooFewContent = rounded < 28`
- Bannière rouge + bouton commander désactivé si `tooFewContent`
- Seuil effectif : < 28 stories selectionées produisant < 28 pages de contenu réel

**Factures livres commandés** (`books/page.tsx`)
- Migration : `stripe_receipt_url text`, `stripe_amount_paid integer`, `stripe_currency text` sur `book_configs` (appliquée en prod)
- `book-checkout/route.ts` : `success_url` append `&session_id={CHECKOUT_SESSION_ID}`
- `order/page.tsx` : `stripeSessionId` passé à `/api/gelato/order` au retour Stripe
- `gelato/order/route.ts` : si `stripeSessionId` → `stripe.checkout.sessions.retrieve` (expand `payment_intent.latest_charge`) → `receipt_url` + `amount_total` + `currency` stockés dans `book_config`
- `books/page.tsx` : pour les livres ordered — lien "Voir la facture" + montant si `stripe_receipt_url` ; sinon "Inclus dans votre abonnement Print"

**Scripts SQL de test**
- `supabase/purge_test_data.sql` : purge les 5 comptes yopmail (conserve les comptes auth)
- `supabase/seed_print_multi.sql` : seed ciblé `test-print-multi` — 60 entrées Coco, 24 stories, 3 book_configs (draft Classic/Forest + ordered Ocean)

### ✅ Session 44 — SEO crédibilité + nav ancres + préview email cadeau (2026-06-10)

**Corrections 1–9 (multi-sessions) — récapitulatif final**

**C2 — og:image** : `layout.tsx` + `fr/layout.tsx` — `openGraph.images` + `twitter.images` → `/og-image.png` 1200×630

**C3 — Slugs légaux EN + redirects** :
- `next.config.js` : 3 redirects 301 (`/legal/cgv` → `/terms`, `/legal/confidentialite` → `/privacy`, `/legal/mentions` → `/notices`)
- `src/app/legal/terms/page.tsx`, `privacy/page.tsx`, `notices/page.tsx` : pages EN créées
- `PublicFooter.tsx` : liens légaux mis à jour vers `/legal/terms|privacy|notices`

**C1 — Cadeau paiement unique** : `gift/page.tsx` — suppression `/{period}` sur les prix, sublabels "Accès 1 mois / 1 an inclus", note ℹ️ sur l'écran de confirmation, `no_recurring` sous bouton, step 3 réactif selon plan

**C4 — Signup 2 colonnes desktop** : `auth/signup/page.tsx` — `isDesktop` state, layout flex 860px, panel droit 300px avec bullets valeur, ligne reassurance mobile

**C5 — Compteur entrées free** : `pets/[id]/page.tsx` — pill `{count}/10 entries used` visible à partir de 5 entrées, couleur orange à 9+, lien upgrade

**C6 — Upsell post-story free** : `pets/[id]/page.tsx` — bloc `#FFF3E0` après chaque story card pour les users free

**C7 — Stats sourcées** : `page.tsx` — tableau stats restructuré avec champ `src` par stat. EN : "APPA NPOS, 2023–24" sous chaque stat. FR : "FACCO / Kantar, 2023". Note globale FR supprimée.

**C8 — Liens ancre header desktop** : `PublicNav.tsx` — `isDesktop` state, 3 ancres How/Pricing/FAQ entre logo et CTA (DM Sans 400 14px, hover #C8813A, transition 150ms, gap 24px). `page.tsx` : `id="how"`, `id="pricing"`, `id="faq"` sur les 3 sections correspondantes.

**C9 — Préview email cadeau** : `gift/page.tsx` — `showEmailPreview` state, bouton "Preview email" (dotted underline) inline avec `no_recurring`. Modal overlay `rgba(0,0,0,0.4)`, carte blanche `border-radius: 16px`, header `#3D2B1F` + 🐾, récapitulatif To/From/Plan/Sends + bloc message, bouton fermer.

**Nouvelles clés i18n** (EN + FR) :
- `gift.*` : `price_sublabel_digital/print`, `step3_title/desc_digital/print`, `one_time_note`, `no_recurring`, `preview_button`, `preview_title`, `preview_from/to/plan/sends/message_label/sends_now/close`
- `journal.*` : `entry_counter`, `upgrade_unlimited`
- `stories.*` : `free_upsell_text/cta/refresh`
- `signup.*` : `reassurance_mobile`, `value_title`, `value_bullet_1/2/3/3_print`
- `nav.*` : `how`, `pricing`, `faq`

### ✅ Session 45 — Cron monthly-story (2026-06-10)

**Implémentation complète `/api/cron/monthly-story`**
- `src/lib/story.ts` : logique Anthropic partagée — `buildStoryPrompt()` + `generateAndSaveStory()` (retourne `null` sur violation unique constraint = race silencieuse)
- `supabase/migrations/add_month_key_to_stories_2026_06_10.sql` : `stories.month_key TEXT NULL` + index unique partiel `(pet_id, month_key) WHERE month_key IS NOT NULL` (idempotence cron)
- Route cron : plan gate digital/print, `deceased_at IS NULL`, `email_reminders = true`, ≥ 3 entries dans le mois précédent, `month_key` idempotence
- Email par pet : titre du chapitre + extrait 2 premières phrases + CTA bouton amber → `?tab=stories`, lien désinscription tokenisé, locale EN/FR via `getProfileLocaleById`
- Retourne `{ processed, generated, skipped, errors, monthKey }`
- Migration appliquée en prod ✓

**Tests à exécuter**

```powershell
# Récupérer CRON_SECRET depuis Vercel > Settings > Environment Variables
$env:CRON_SECRET = "valeur_depuis_vercel"

# 1. Sans token → 401
curl https://everypaw.app/api/cron/monthly-story

# 2. Avec token → 200 + JSON { processed, generated, skipped, errors, monthKey }
curl https://everypaw.app/api/cron/monthly-story `
  -H "Authorization: Bearer $env:CRON_SECRET"

# 3. Idempotence — 2ème appel → generated: 0
curl https://everypaw.app/api/cron/monthly-story `
  -H "Authorization: Bearer $env:CRON_SECRET"
```

Données de test en prod (Supabase Table Editor) :
- `test-free@yopmail.com` → skipped (plan free, filtré par la query)
- `test-digital@yopmail.com` avec 2 entries mai 2026 sur un pet → skipped (< 3 entries)
- `test-digital@yopmail.com` avec ≥ 3 entries mai 2026 → generated++
- Idempotence : vérifier `SELECT pet_id, month_key FROM stories WHERE month_key = '2026-05'` — une seule ligne par pet

Note : le cron calcule `month_key = mois précédent`. En juin 2026, `monthKey = "2026-05"`, les entries doivent avoir `entry_date` entre `2026-05-01` et `2026-05-31`.

### ✅ Session 46 — Retention emails D1/D7/D30 (2026-06-10)

**Implémentation `/api/cron/retention-emails` (daily 09:00 UTC)**
- 3 paliers : J+1 (nudge onboarding), J+7 (premier chapitre ou meilleure entrée photo), J+30 (récap free + upsell doux, ou estimation pages pour payants)
- Idempotence via `events_log` (event_types : `retention_d1`, `retention_d7`, `retention_d30`) — même pattern que le webhook Stripe : vérification avant envoi, insertion après succès Resend uniquement
- Échec Resend → pas d'insertion → retry automatique le lendemain
- `estimateBookPages()` réutilisé dans les chemins D7 (story existante) et D30 (payant)
- Index partiel `idx_events_log_retention` sur `events_log` (migration appliquée en prod ✓)
- `BookProgressWidget` : carte book progress visible pour tous les plans sur le dashboard
- `book.ts` : `estimateBookPages(petId)` ajouté après `calcPageCount()`
- i18n : section `retention_emails` dans `messages/en.json` + `messages/fr.json`
- Retourne `{ d1: {sent, skipped, errors}, d7: {...}, d30: {...} }`

**Fenêtres de temps (cron à 09:00 UTC)**

| Palier | Window `created_at` |
|---|---|
| D1 | `[now-48h, now-24h)` |
| D7 | `[now-8d, now-7d)` |
| D30 | `[now-31d, now-30d)` |

**Tests à réaliser**

```powershell
# Récupérer CRON_SECRET depuis Vercel > Settings > Environment Variables
$env:CRON_SECRET = "valeur_depuis_vercel"

# 1. Premier appel → envoie les emails pour les users dans les fenêtres
curl https://everypaw.app/api/cron/retention-emails `
  -H "Authorization: Bearer $env:CRON_SECRET"
# → { d1: {sent:N, skipped:0, errors:0}, ... }

# 2. Idempotence — 2ème appel immédiat → 0 doublon (events_log bloque)
curl https://everypaw.app/api/cron/retention-emails `
  -H "Authorization: Bearer $env:CRON_SECRET"
# → { d1: {sent:0, skipped:N, errors:0}, ... }

# 3. Opt-out : créer un profil test avec email_reminders=false dans la fenêtre D1
# → skipped (jamais envoyé)

# 4. Simulation échec Resend : couper temporairement RESEND_API_KEY dans Vercel
# → errors++ mais pas d'insertion events_log → retry le lendemain

# 5. Vérifier en Supabase SQL Editor
SELECT user_id, event_type, created_at, metadata
FROM events_log
WHERE event_type LIKE 'retention_%'
ORDER BY created_at DESC;
```

Pour créer un utilisateur de test dans la fenêtre D1 (signup simulé il y a ~30h) :
insérer directement dans `profiles` avec `created_at = now() - interval '30 hours'` via Supabase Table Editor.

### ✅ Session 47 — Share card Instagram (2026-06-10)

**Route `/api/share-card` (edge runtime)**
- `@vercel/og` ^0.11.1 installé
- Auth : `createServerClient` + cookies request — fail-closed 401 si pas de session
- Ownership : `stories.user_id === userId` — 403 sinon
- 2 formats : `square` (1080×1080) et `story` (1080×1920) via `?format=`
- Photo pet fetchée + convertie en data URL base64 (boucle byte-by-byte, edge-safe, pas de `Buffer`)
- Design : fond `#FAF6F0`, photo ronde avec bordure amber, titre chapitre, extrait 200 chars en italique, coins décoratifs, branding 🐾 everypaw discret en bas
- `Cache-Control: no-store`

**UI `pets/[id]/page.tsx`**
- Nouveau bouton "Partager ce moment" / "Share this moment" dans la section actions de chaque story card (à côté de l'existant "Partager ce chapitre")
- 4 nouveaux états : `shareCardStory`, `shareCardFormat`, `shareCardLoading`, `shareCardError`
- Fonctions : `openShareCard(story)` + `downloadShareCard()` — Web Share API avec fichier PNG si disponible, sinon anchor download
- Modal : format picker (square/story), preview live `<img>` vers la route, bouton Partager/Télécharger + Fermer

**i18n** — 7 nouvelles clés dans `stories.*` (EN + FR) : `share_card_open`, `share_card_modal_title`, `share_card_format_square`, `share_card_format_story`, `share_card_download`, `share_card_share`, `share_card_close`

**Tests à réaliser**

```powershell
# 1. Sans session → 401
curl https://everypaw.app/api/share-card?story_id=<uuid>

# 2. Avec session cookie valide, story appartenant à l'user → PNG 200
# Tester dans le navigateur : aller sur /dashboard/pets/[id]?tab=stories
# → clic "Partager ce moment" → modal s'ouvre + preview visible

# 3. Format story (9:16)
curl "https://everypaw.app/api/share-card?story_id=<uuid>&format=story" --cookie "..."
# → image 1080×1920

# 4. Story d'un autre user → 403
# Récupérer un story_id d'un autre compte test et tester avec session A

# 5. Web Share API (mobile) — bouton "Partager" → share sheet natif avec PNG
# 6. Desktop — bouton "Partager" → téléchargement PNG
```

### ✅ Session 48 — Origins onboarding + Weekly interview + Memorial tributes + Household members (2026-06-11)

**PR #72 (squash merge → main)**

---

**Origins onboarding** (`src/components/onboarding/OriginsFlow.tsx`, `/api/generate-origins`)
- Overlay 3 questions après onboarding si animal adulte sans chapitre existant : "Comment vous êtes-vous rencontré·e·s ?", "Souvenir marquant ?", "En quelques mots, qui est {nom} ?"
- Génère un chapitre "Comment tout a commencé" avec `story_type = 'origins'` — **ne consomme pas le quota Free**
- Dashboard card "Raconter ses débuts" si le flow a été sauté
- Migration : `add_story_type_2026_06_10.sql` — colonne `story_type` + contrainte unique `(pet_id, story_type) WHERE story_type IS NOT NULL`

**Weekly interview question** (`src/lib/interview.ts`, dashboard card)
- 52 questions rotatives (ISO week) EN+FR — `getWeeklyQuestion(locale)`
- Dashboard card avec textarea inline → entrée taguée `interview`
- Email weekly-reminder : question comme objet + corps centré

---

**Memorial tributes** (`/api/memorial/tributes`, `/api/memorial/tributes/[id]/approve|reject`)
- Table `memorial_tributes` (id, pet_id, author_name 1–100, message 1–1000, status pending/approved/rejected)
- GET public (approved + pet décédé) / GET owner (tous statuts) / POST public (rate limit 3/h IP, honeypot)
- Notification email owner max 1/24h/pet via `events_log`
- Onglet "Hommages" dans la page animal (owner: approve/reject) ; composant `TributeSection` sur `/memorial/[id]`
- **Intégration livre** : `calcPageCount(..., hasTributes?)` → `book-pdf` + `preview-pdf` + `gelato/order` acceptent `includeTributes`
- Migration : `add_memorial_tributes_2026_06_10.sql`

---

**Household Members — Shared journal** (`/api/pet-members`, `/api/invite/[token]`, `/invite/[token]`)
- Table `pet_members` (pending/accepted/revoked, token 64 hex, TTL 7j)
- **Plan gate** : `canInviteMembers(userId)` — digital/print uniquement
- **Max 5 membres** par animal, re-invitation idempotente
- Email invite via Resend avec lien `https://everypaw.app/invite/{token}`
- Page `/invite/[token]` — tous les états : auth_required → sign-in/signup avec `?next=` ; email_mismatch ; expired ; revoked ; already_accepted ; accepted + redirect
- Onglet "Foyer / Household" dans la page animal (owners only) : liste membres + statuts + invite form + revoke-avec-confirm + upsell pour free
- Pill "Ajouté par {nom}" sur les entrées contributeurs dans le journal
- **RLS mis à jour** (voir tableau ci-dessous)
- Migration : `add_pet_members_2026_06_11.sql`
- Migration cleanup : `drop_legacy_all_policies_2026_06_11.sql` — supprime les legacy `ALL` policies ORées qui court-circuitaient les nouvelles

**Diff RLS (session 48)**

| Table | Policy supprimée | Policy ajoutée | Justification |
|---|---|---|---|
| `pets` | `pets_public_read` (`USING true`) + legacy `ALL` | `pets_owner_or_member_select` | Pages publiques → service role ; dashboard → owner + membres acceptés |
| `entries` SELECT | `entries_owner_read` + legacy `ALL` | `entries_owner_or_member_read` | Owner voit toutes les entrées ; contributeurs voient le journal |
| `entries` INSERT | `entries_owner_insert` + legacy `ALL` | `entries_owner_or_member_insert` | Contributeurs peuvent ajouter (`user_id = auth.uid()` obligatoire) |
| `entries` UPDATE | `entries_owner_update` + legacy `ALL` | `entries_owner_or_pet_owner_update` | Owner peut éditer n'importe quelle entrée (modération) |
| `entries` DELETE | `entries_owner_delete` + legacy `ALL` | `entries_owner_or_pet_owner_delete` | Owner peut supprimer n'importe quelle entrée |
| `stories` | `stories_public_read` (`USING true`) + legacy `ALL` | `stories_owner_or_member_select` | Pages publiques → service role ; contributeurs lisent les histoires |
| `milestones` | inchangé | inchangé | Spec : aucune modification |

**Trigger `enforce_free_entry_limit` mis à jour** : si `pet.user_id ≠ entry.user_id` (entrée contributeur) → pas de vérification de quota. Le quota Free ne s'applique qu'aux entrées sur ses propres animaux.

---

**Conventions de code mises à jour (session 48)**
- **`canInviteMembers(userId)`** dans `src/lib/plan.ts` — digital/print uniquement. Toujours appeler avant tout INSERT dans `pet_members`.
- **`pet_members`** : aucun INSERT/UPDATE/DELETE client direct. Toutes les mutations via routes serveur utilisant `getServiceSupabase()`.
- **RLS stories/pets** : plus de `USING (true)` — les pages publiques utilisent toujours `getServiceSupabase()`.
- **Quota Free contributeur** : le trigger `enforce_free_entry_limit` exclut les entrées sur les animaux d'autrui — ne pas réintroduire l'ancienne version.
- **Legacy ALL policies** : les policies nommées `"Users can/manage own …"` sont toutes supprimées. Utiliser exclusivement les policies granulaires par commande (SELECT/INSERT/UPDATE/DELETE).

### ✅ Session 49 — Fix fonts Gelato + CRON_SECRET prod cassé (2026-06-11)

**Fonts PDF embarquées** (commit `14ba0e7`) — Gelato refusait : "Font not embedded". @react-pdf/renderer référençait les polices base-14 (`Times-Bold/Italic`, `Helvetica/-Bold`) sans les embarquer (viole PDF/X). Fix : TTF clones métriques `public/fonts/` (`Tinos`=Times, `Lato`=sans), `Font.register` via URL `${origin}/fonts/*.ttf` dans `book-pdf/route.tsx`. Commande Gelato acceptée ✓.

**Fix build** (commit `db662d6`) — `BookProgressWidget` (client) importait `calcPageCount` depuis `book.ts` → chaîne statique vers `supabase/server.ts` (`next/headers`) → build cassé. `calcPageCount` extrait dans `src/lib/book-pages.ts` (pur). Pattern : un composant client ne doit jamais importer un module dont la chaîne statique touche `next/headers`.

**CRON_SECRET vide en prod (bug critique 35j)** — `CRON_SECRET=""` dans Vercel prod → `verifyCronRoute` (exige ≥32 chars) renvoyait `500` → **les 4 crons planifiés échouaient à chaque exécution**. Fix : secret hex 48 chars set en Production + Preview, redeploy. Tests validés :
- `monthly-story` : 401 sans token / 200 `{generated:1}` / idempotence `generated:0` ✓
- `retention-emails` : 200 / 401 / idempotence ✓ (fenêtres D1/D7/D30 vides au moment du test)
- ⚠️ Posé en `--no-sensitive` pour les tests — repasser en sensitive dans le dashboard Vercel quand voulu (reste valide).

**🔴 RLS récursion infinie pets ↔ pet_members (bug critique, commit `acacb69`)** — découvert en testant share-card. Session 48 a créé deux policies mutuellement récursives : `pets_owner_or_member_select` lit `pet_members`, et `pet_members_owner_select` lit `pets` → `ERROR 42P17 infinite recursion detected in policy for relation "pets"` → **depuis le deploy session 48, AUCUN user connecté ne pouvait lire ses pets** (dashboard "Animal introuvable" / liste vide pour tout le monde). Fix : `migrations/fix_pets_members_rls_recursion_2026_06_11.sql` — lookups déplacés dans fonctions `SECURITY DEFINER` (`user_owns_pet`, `user_is_accepted_member`) qui s'exécutent en owner et bypass RLS, cassant le cycle. **Migration appliquée prod ✓**. Pattern : jamais 2 policies RLS qui se lisent mutuellement ; utiliser `SECURITY DEFINER` pour les checks cross-table.

**share-card `@vercel/og` crash (commit `acacb69`)** — route `/api/share-card` (session 47, jamais testée) renvoyait `200` + PNG 0 octet → modal "Impossible de créer la carte". Cause (logs Vercel) : `Error: Expected <div> to have explicit "display: flex" ... if it has more than one child node` — la div citation rendait `"{quote}"` = 3 nœuds (2 guillemets littéraux + expression) sans `display:flex`. Fix : `{`"${quote}"`}` (nœud unique). Pattern Satori : toute `<div>` à >1 enfant doit avoir `display:flex`/`none`.

**share-card `navigator.share` user-activation (commits `beac5ec` + `dc5ba2b`)** — `downloadShareCard` faisait `await fetch(...)` avant `navigator.share()` → l'await consomme la transient user-activation que `share()` exige → échec silencieux sur mobile. Fix : blob pré-fetché en state via `useEffect` sur `[shareCardStory, shareCardFormat]`, puis `share()`/download déclenchés **sans await** au clic (bouton disabled tant que `shareCardBlob` null). Aussi : `URL.revokeObjectURL` différé en `setTimeout(…, 1000)` (revoke synchrone après `a.click()` annulait le download).

**share-card — tests live (Chrome, seed test-print-multi)** : sans session → 401 ✓ ; preview square (1:1) ✓ ; story (9:16) ✓ ; story d'un autre user → 403 ✓ ; download desktop → PNG 1080×1080 rendu correct ✓. Branche `navigator.share` non testable en automatisation (pas de vraie user-activation desktop) mais code corrigé.

**🔴 Colonne `profiles.language` inexistante (bug critique, commit `c50bffc`)** — `profiles.language` ET `profiles.locale` n'existaient nulle part en prod (aucune migration), pourtant ~11 chemins serveur faisaient `.select("locale, language")` → PostgREST 400 → résultat null → **tous les emails localisés cassés** : 6 crons (weekly-reminder, birthday-check, daily-prompts, on-this-day, streak-alert, retention-emails) renvoyaient `sent:0` à chaque run, + langue email dunning Stripe en fallback. Fix : migration `add_profiles_language_2026_06_11.sql` (`profiles.language text` nullable, appliquée prod ✓), retrait de `locale` des 11 selects (langue basée sur `profiles.language` seul), signup écrit la langue dans `user_metadata`, `/auth/callback` la persiste sur le profil (si null). Testé live : weekly-reminder `sent:1` + email FR reçu yopmail ✓. Pattern : ne jamais `.select()` une colonne non garantie en prod — PostgREST échoue toute la requête.

**~~TODO email (note Julien 2026-06-11)~~ ✅ fait session 51** : emails transactionnels/crons harmonisés via `src/lib/email-templates.ts`.

### ✅ Session 50 — Fixes UI/UX + typographie em-dash (2026-06-11)

**Invitation membre — auto-clear message** (`pets/[id]/page.tsx`) — le message "✓ Invitation envoyée !" (et les erreurs) restaient affichés indéfiniment. Ajout `setTimeout(() => setInviteResult(null), 10000)` après succès ET après erreur → disparaît au bout de 10s.

**Bug visuel menu journal coupé** (`pets/[id]/page.tsx`) — la carte entry avait `overflow: hidden` (pour arrondir les photos) → coupait le dropdown "Modifier/Supprimer" qui déborde sous la carte. Fix : `overflow: hidden` retiré de la carte, déplacé sur la grille photos (`borderRadius: "0 0 16px 16px"` + `overflow: hidden`). Le header est toujours au-dessus des photos donc seul l'arrondi bas est nécessaire.

**Dashboard pluriel** (`dashboard/page.tsx`) — "X moments ce mois" → "X moment(s) ce mois".

**Gate livre incohérent** (`pets/[id]/order/page.tsx`) — message "minimum 7 chapitres requis" mais `tooFewContent` testait `rounded < 28` pages (≈1 page/chapitre) → 24 chapitres = 24 pages < 28 → bloqué à tort. Fix : `tooFewContent: selected.length < 7` (aligné sur le message). `estimatedPages` garde son floor 28 pour le pricing.

**Compteur suggestion** (`DashboardNav.tsx`) — modal suggestion : ajout décompte `{n} / 2000` sous la textarea (rouge à 2000). Max serveur = 2000 chars (`api/suggestion/route.ts`, déjà en place).

**Label brouillons** (`pets/[id]/books/page.tsx`) — "2/15" → "2/15 brouillons maximums" (EN "drafts maximum").

**🔤 Typographie globale — espace avant virgule** — 63 occurrences ` ,` (espace-virgule) supprimées sur 13 fichiers (messages fr/en + pages/layouts/legal/api). Piège géré : `r*_author` utilisait ` , ` comme séparateur pour le split nom/rôle des témoignages → format devenu `"Camille D., Maman…, Lyon"` et `authorStr.split(" , ")` → `split(", ")` (page.tsx + fr/page.tsx). Noms intacts.

**🔤 Typographie globale — em-dash (—)** — sur demande Julien : bannir le caractère `—` (tell IA).
- **Texte humain (UI/emails/landing)** : 216 em-dashes remplacés par virgule sur 65 fichiers (regex `\s*—\s*` → `, `). messages fr/en = 0 em-dash restant.
- **Texte généré par l'IA (histoires)** : (1) règle ajoutée aux 4 prompts (`NEVER use the em dash character (—)…`), (2) titres fixes origins → virgule, (3) **garantie béton** : helper `stripEmDash()` exporté depuis `src/lib/story.ts`, appliqué sur `title`+`story` à chaque save IA (monthly `generateAndSaveStory`, birthday `generateAndSaveBirthdayLetter`, origins `api/generate-origins`, user `api/generate`). Même si le modèle dérape, l'em-dash est strippé avant insertion DB.
- Pattern : pour bannir un caractère du contenu IA, ne pas se fier au prompt seul — sanitize la sortie avant persistance.

**Gift — bouton aperçu email** (`gift/page.tsx`) — "Aperçu de l'email cadeau →" → " →" retiré (fr+en), passé d'un lien dotted-underline à un **bouton pill outline** (transparent, `#C8813A`, border `rgba(200,129,58,.4)`, radius 100, full-width) placé **au-dessus** du bouton "Envoyer le cadeau". `no_recurring` reste sous le bouton Envoyer.

---

---

### ✅ Session 53 — Audit sécurité/bugs complet + 7 correctifs (2026-07-06)

Audit ciblé de toutes les routes API + libs core. 7 correctifs (3 MEDIUM, 4 LOW). `tsc --noEmit` OK, 16 tests Vitest verts.

**M1 — Cap 10 entrées plan free non appliqué côté serveur** : `canAddEntry()` (`src/lib/plan.ts`) encodait la règle mais n'était appelé nulle part. Les entrées s'insèrent en direct client-side via clé anon + RLS → un user free contournait le cap trivialement. Fix : **trigger DB** `enforce_free_entry_limit` (migration `enforce_free_entry_limit_2026_07_06.sql`, `BEFORE INSERT ON entries`, `SECURITY DEFINER`, `raise exception 'entry_limit'` si plan free ET count ≥ 10). Client `pets/[id]/page.tsx` `addEntry` détecte `error.message` contenant `entry_limit` → ouvre la modale d'upsell. **⚠️ Migration à appliquer en prod (Supabase SQL Editor) — sans elle le cap reste contournable.**

**M2 — `account/delete` : lignes orphelines** : la cascade oubliait `memorial_tributes` et `pet_members`. Fix : suppression de `memorial_tributes` + `pet_members` par `pet_id`, plus les memberships/invites du user (`user_id`, `invited_by`). (Reste non-atomique — inhérent à supabase-js multi-appels ; storage >1000 fichiers toujours best-effort.)

**M3 — `auth-hook` email_change mauvais token** : le lien de confirmation d'email vers la nouvelle adresse utilisait `token_hash` au lieu de `token_hash_new` (variable `tokenHashNew` calculée mais jamais utilisée). Cassé uniquement quand Supabase ne fournit pas `confirmation_url`. Fix : `changeUrl` utilise `tokenHashNew`.

**L1 — `gift/complete` doublon email en concurrence** : idempotence reposait sur le flag PI posé après envoi → deux appels concurrents envoyaient 2 emails. Fix : fresh-read du PaymentIntent + écriture du flag `gift_email_sent` **avant** l'appel Resend (lent), release du flag si l'envoi échoue. (Resend 3.5.0 n'a pas d'`idempotencyKey` natif.)

**L2 — `gift/redeem` : casse email** : `recipientEmail !== user.email` case-sensitive bloquait un destinataire légitime avec casse différente. Fix : comparaison `.toLowerCase()` des deux côtés.

**L3 — `gelato/order` : crédit restauré à tort** : le `catch` restaurait le crédit même après une commande Gelato acceptée (échec du bookkeeping post-commande = livre gratuit). Fix : flag `orderPlaced` posé après `response.ok` ; restore uniquement si `!orderPlaced`.

**L4 — `memorial/tributes` : commentaire RLS trompeur** : disait « RLS enforces pet.deceased_at » alors que le service role bypass RLS. Commentaire corrigé (tributes publics volontairement, n'existent que pour pets décédés via garde du POST).

### ✅ Session 52 — UI fixes + désactivation exit-intent (2026-06-27)

**Exit-intent popup désactivée** : `ExitIntentPopup` retiré de `app/page.tsx` et `app/fr/page.tsx` (import + usage). Composant `src/components/ExitIntentPopup.tsx` conservé pour réactivation future sous conditions à définir.

**Signup — titre centré** : `auth/signup/page.tsx` — le bloc titre (logo + sous-titre) sorti du flex row et placé au-dessus des 2 colonnes dans un wrapper `maxWidth: 860/420`. `marginTop: "3.5rem"` retiré du panel value (plus nécessaire). Résultat : titre centré sur toute la largeur desktop + mobile, 2 colonnes correctement alignées en dessous.

**Google OAuth branding** : configuration effectuée côté Google Cloud Console + OVH DNS pour que l'écran de sélection de compte Google affiche `everypaw.app` au lieu de `yeuppcnalfbjonpefgcx.supabase.co`. Record TXT `google-site-verification` ajouté sur `@` chez OVH. Validation Google Search Console en attente de propagation DNS.

### ✅ Session 51 — Harmonisation templates emails (2026-06-20)

**Nouveau `src/lib/email-templates.ts`** — primitives partagées : `BRAND`, `baseLayout(content, footerExtra?, lang?)` (header marron 🐾 + footer © année auto), `ctaButton`, `ctaButtonOutline`, `emoji`, `eyebrow`, `heading`, `paragraph`, `quote`, `codeBox`, `finePrint`, `unsubscribeLink`. Tous les emails user-facing partagent désormais header/footer/polices/couleurs/bouton identiques.

**Avant** : 2 styles divergents — `auth-emails.ts` (layout brandé, DM Sans) vs ~10 emails crons/transactionnels en `<div>` inline Georgia sans header/footer/logo.

**Migrés vers `baseLayout`** : `auth-emails.ts` (importe le lib partagé, dédupliqué), crons `daily-prompts` / `birthday-check` / `on-this-day` / `streak-alert` / `weekly-reminder` / `monthly-story` / `retention-emails` (helpers locaux `btn/wrap/h1/p` délèguent au lib), `gift/complete` (codeBox conservé), `waitlist` (confirmation), `pet-members` (invitation, avait son propre DOCTYPE).

**`lang` dynamique** : `<html lang>` propagé (`isFR`/`isFrench`/`locale`) — fini le `lang="fr"` codé en dur sur les emails EN. **Année footer** : `new Date().getFullYear()`.

**Non migrés (volontaire)** : emails admin internes (notif waitlist, suggestion, contact, memorial tributes) = texte brut, pas user-facing. `export-data`/`preview-pdf` = exports PDF/HTML, pas des emails.
### ✅ Session 54 — Audit approfondi (13 findings) + refactor qualité (2026-07-06)

Second audit exhaustif (lecture seule d'abord, rapports `AUDIT_REPORT.md` + `AUDIT_REPORT_QUALITY.md` + `AUDIT_PLAN.md` à la racine), puis correctifs. `tsc --noEmit` OK, 16 tests Vitest verts.

**⚠️ 2 migrations SQL à appliquer en prod (Supabase SQL Editor) :**
- `revoke_book_credit_rpc_2026_07_06.sql` — **[CRITIQUE C-1]** `REVOKE EXECUTE` sur `increment_book_credits` / `decrement_book_credits` / `try_consume_book_credit` / `restore_book_credit` depuis `anon`/`authenticated`/`public`. Ces RPC `SECURITY DEFINER` du schéma `public` étaient exposées par PostgREST sans REVOKE → un user authentifié pouvait appeler `POST /rest/v1/rpc/increment_book_credits` avec son uid et s'auto-créditer des livres imprimés gratuits. Seul le service role doit les appeler. `search_path` durci. **À vérifier post-deploy : appel RPC avec JWT `authenticated` doit renvoyer 401/403.**
- `restore_contributor_entry_exemption_2026_07_06.sql` — **[B-1]** réintroduit l'exemption contributeur dans `enforce_free_entry_limit` (les entrées ajoutées à l'animal d'autrui ne comptent pas dans le cap free du contributeur ; la réécriture 07-06 l'avait perdue).

**Findings sécurité/bugs corrigés (code) :**
- **[H-1] Code cadeau réutilisable** (`gift/redeem`) : promo code `max_redemptions:1` jamais consommé (coupon appliqué en direct). Fix : branche schedule → `promotionCodes.update(active:false)` ; branche checkout → `discounts:[{ promotion_code }]` (Stripe consomme à la complétion).
- **[H-2] Pages mémorial cassées pour le public** (`memorial/[id]`) : lisait via clé anon, mais les RLS `owner_or_member` (migration `add_pet_members`) ne permettent plus la lecture publique → « not_found » pour tout visiteur. Fix : `getServiceSupabase()` + garde `deceased_at` (page + `generateMetadata`).
- **[H-3] Crédit livre annuel perdu au renouvellement** (`stripe/webhook`) : garde `daysSinceLast < 365` vs `now()` → off-by-epsilon au renouvellement annuel exact. Fix : tolérance `< 350`.
- **[M-1] `/pets/[id]` exposait tout animal** (service-role sans garde). Décision produit : **restreindre aux animaux décédés** (comme le mémorial). Fix : garde `!pet.deceased_at → not_found` (page + metadata).
- **[M-2] Double souscription Stripe** (`stripe/checkout`) : pas de contrôle d'abo existant + `customer_email` créait un nouveau customer → double facturation + abo orphelin. Fix : rejet `already_subscribed` (409) si abo actif, réutilisation du `customer` existant.
- **[M-3] Fallback plan silencieux** (`stripe/webhook`) : si `priceIdToPlan` renvoie null (env mal nommées), un abonné Print était marqué `digital`. Fix : dérive le plan des metadata du checkout + `log.error`. `.env.local.example` réaligné sur les vrais noms de variables prix.
- **[B-2] Middleware fail-open** : exception → `next()` servait la coquille dashboard. Fix : fail-closed, redirect `/auth/login` sur `/dashboard`.
- **[B-4] `update-password`** : soumis sans session de récupération. Fix : submit gaté sur `sessionReady`.
- **[B-5] `birthday-check` 29 février** : jamais de match les années non bissextiles. Fix : rabattu sur le 28/02.
- **[B-3] `gift/complete`** : laissé tel quel — déjà mitigé (code renvoyé une seule fois via idempotence `gift_email_sent` + binding `recipient_email` au redeem).

**Refactor qualité (dédup / drift) — nouvelles libs partagées :**
- `src/lib/validation.ts` — `UUID_REGEX`, `EMAIL_REGEX`, `isUuid`, `isEmail`, `isSafeRelativePath` (14 defs UUID + 7 email dédupliquées ; redirects relatifs login/signup/callback unifiés).
- `src/lib/stripe.ts` — singleton `stripe` (`apiVersion: '2023-10-16'`), remplace 14 instanciations.
- `src/lib/supabase/service.ts` — `getServiceSupabase()` sans dépendance server-only (importable edge). `plan.ts` le ré-exporte.
- `src/lib/book-shared.ts` — `COVER_THEMES`, `VALID_*` (+types), `MAX_*`, `safeUrl`, `bestStoryIndexForDate()`. `book-pdf` utilise désormais `calcPageCount()` comme `gelato/order` → **page count déclaré Gelato = pages réelles PDF garanti**. `STRINGS` laissés dupliqués (PDF majuscules vs preview titre = style intentionnel).
- `generate/route.ts` utilise `buildStoryPrompt()` de `story.ts` (prompt inline dupliqué supprimé).
- `console.*` → `log.*` (`stripe-helpers`, `pdf-token`, `signup`).

**Reportés délibérément** : Q7 (650 hex → tokens) et Q13 (découpe composants 2084/1625 l.) — cosmétiques/refactors lourds sans couverture de test, à faire incrémentalement. Q6 (`withAuth`) et Q8 (constantes URL/email) reportés aussi.

---

### ✅ Session 57 — i18n hybride : /fr crawlable server-rendered (2026-07-12)

Chantier : rendre la version FR crawlable par Google sans réintroduire next-intl. Audit préalable : `/fr` existait déjà mais en copie manuelle client de 579 l (drift, dette #6) ; `/gift` en `useLocale` navigator (non crawlable FR) ; pas de `/fr/gift` ; aucun redirect auto Accept-Language (rien à retirer). Décision (validée user) : composant client locale-aware partagé + langue **figée par URL**, plutôt que RSC purs + îlots (blast-radius élevé, zéro gain SEO car le FR est déjà en source via `use client` + `force-dynamic`).

**Commit 1 `79c1ca1` (refactor)** : `PublicNav`/`PublicFooter` acceptent une prop `locale` optionnelle (absente → `useLocale`, préserve dashboard + 19 autres pages publiques) + `localeSwitch` (lien crawlable `<a>` footer) ; `home-client.tsx` `<Home locale>` (drop `useLocale`) ; `gift/page.tsx` splitté en `gift-client.tsx` (`<GiftContent locale>`) + wrapper server ; liens nav internes locale-aware.

**Commit 2 `0219982` (routes FR)** : `/fr` réécrit en server component (`<Home locale="fr">` + JSON-LD FR Org/App/FAQPage i18n-driven, **`aggregateRating` factice retiré**) ; nouveau `/fr/gift`. Supprime la copie manuelle de 579 l et corrige le drop de `premium_f5` côté FR.

**Commit 3 `0584eaf` (SEO)** : metadata FR (`/fr` title « Journal animalier IA qui devient un livre imprimé | Everypaw », `/fr/gift` title « Offrir un journal animalier et un livre souvenir | Everypaw »), hreflang **réciproque** sur les 4 routes (canonicals relatives résolues via `metadataBase`), `sitemap.ts` + `/fr/gift`.

**Vérifié** (`next start` + curl) : `/fr` rend du français dans le HTML source ✓ ; `/` reste EN sous `Accept-Language: fr` ✓ ; hreflang réciproques `/`↔`/fr` et `/gift`↔`/fr/gift` ✓ ; sitemap liste `/fr` + `/fr/gift` ✓ ; `npm run build` + `tsc --noEmit` verts. Dashboard `useLocale` intact.

**Bandeau de suggestion de langue** (`LangSuggestBanner`, commit `dfafd65`) : client component monté sur les 4 pages marketing. Lit `navigator.language` **uniquement pour suggérer** (jamais de redirect, ne modifie jamais le contenu rendu). Affiché seulement si mismatch (page EN + navigator fr, ou page FR + navigator non-fr). Lien réel crawlable `<a href>` vers la même page dans l'autre langue. Fixed bottom, dismissible, dismiss mémorisé en `localStorage` (`ep_lang_suggest_dismissed`), rend `null` tant que non monté (pas de mismatch d'hydratation, pas de CLS). ⚠️ Vérifier l'interactivité client sur `next start` (prod) : le preview `next dev` du sandbox n'hydrate pas React.

**Infra blog SEO** (commit `2489c7f`) : cluster de contenu « pet memory ». `src/lib/blog.ts` = registre unique (`BLOG_POSTS[]` : slug, title, description, datePublished, `published`) — pilote l'index `/blog`, l'inclusion sitemap et le noindex par article. Chaque article = `app/blog/<slug>/page.tsx` écrit à la main : metadata (canonical `/blog/<slug>`, `robots` dérivé du flag `published`), JSON-LD Article (author/publisher Organization Everypaw) **émis seulement si publié**, corps H2/H3 dans `<ArticleLayout post>` (`src/components/blog/ArticleLayout.tsx` : fil d'ariane, colonne lecture ~680px, typo Georgia/DM Sans, CTA final discret vers `/`). **Workflow pour ajouter/publier un article** : (1) écrire le corps dans `app/blog/<slug>/page.tsx`, (2) passer `published: true` dans `blog.ts` → l'article entre dans l'index + le sitemap et perd le noindex, le JSON-LD s'active. **Publication différée (commit `312751e`, session 2026-07-23)** : `published: true` seul ne suffit plus si `datePublished` est dans le futur — `getPost`/`getPostFr` calculent `published` réel comme `flag ET date atteinte (comparaison UTC)`, donc index/sitemap/robots/JSON-LD/hreflang réciproque restent tous gelés jusqu'à la date, sans redeploy nécessaire au moment du bascule (pages `ƒ` dynamiques, check fait à chaque requête).

**12 articles publiés** (`published: true`), tous dans le cluster « pet memory » :
1. `pet-journal-prompts` — "50 Pet Journal Prompts to Capture Your Pet's Story" (`16d6a1e`)
2. `dog-memory-book-ideas` — "12 Dog Memory Book Ideas That Go Beyond Photos" (`1493184`)
3. `puppy-first-year-memory-book` — "How to Make a Puppy's First Year Memory Book" (`08a79b1`)
4. `how-to-keep-a-pet-memory-journal` — **pilier** "How to Keep a Pet Memory Journal (and Why It Matters)" (2026-07-21), lie vers les 5 autres articles du cluster + `/memorial`
5. `cat-memory-book` — "Cat Memory Book: How to Capture Your Cat's Quiet Story" (2026-07-21)
6. `pet-loss-keepsake-ideas` — "Pet Loss Keepsake Ideas: 9 Ways to Honor a Pet You've Lost" (2026-07-21, ton sobre deuil, mention Everypaw limitée à la section memorial)
7. `write-your-pets-life-story` — "How to Write Your Pet's Life Story (Even If You're Not a Writer)" (2026-07-22)
8. `kitten-first-year-memory-book` — "Kitten First Year Memory Book: A Month-by-Month Guide" (2026-07-22, guide mémoire pur, aucun conseil vétérinaire/éducation féline)
9. `pet-memorial-gifts` — "Pet Memorial Gifts: 7 Thoughtful Ideas for a Grieving Friend" (2026-07-22, perspective de l'ami qui offre, ton sobre deuil, mention Everypaw limitée au point 7/memorial)
10. `gifts-for-pet-parents` — "Unique Gifts for Pet Parents Who Already Have Everything" (`datePublished` 2026-09-04, timing Q4, commit `2c2e5c8`)
11. `best-pet-journal-app` — "Best Pet Journal Apps in 2026: What They Actually Do (and Don't)" (`datePublished` 2026-09-04, comparatif honnête DogNote/PetDesk/Everypaw/Voyage/notes apps, commit `6d48a67`)
12. `pet-journal-app-vs-photo-book` — "Pet Journal App vs Photo Book Service: Which One Actually Keeps the Memories?" (`datePublished` 2026-09-04, commit `19423e7`)

Maillage : pilier (4) → 5 autres + `/memorial` ; retour 1-3 → 4-6 (commit `e296866`) ; retour 1,3,5,6 → 7,8,9 (commit `e0b67b1`) ; retour 2,4,7,9 → 10,11,12 (commit `7aff546`). Plus de placeholder non publié, plus de lien interne cassé à ce jour. Lien « Blog » dans le footer full (landing).

**Note article 11** : la description de l'app tierce Voyage a été corrigée par rapport au brief initial lors de la rédaction — recherche web (2026-07-22) a montré que Voyage est en réalité une app pet-spécifique ("Voyage: Pet Health & Diary") combinant génération IA de journal ET tracking santé, pas une app généraliste adaptée par les users comme supposé. DogNote et PetDesk confirmés conformes au brief.

**Cluster blog FR** (`/fr/blog`, session 2026-07-22, étendu session 2026-07-23) : les 12 articles ont une édition française sous `/fr/blog/<slug-fr>`, avec des **slugs traduits** (SEO FR), pas les mêmes slugs qu'EN. `src/lib/blog.ts` : `BLOG_POSTS_FR[]` (interface `BlogPostFr` avec `slugEn` pour le mapping hreflang) + `getPublishedPostsFr()`/`getPostFr()`/`getFrSlugForEn()`. `ArticleLayout` accepte désormais `locale?: "en" | "fr"` (défaut `"en"`) : breadcrumb, CTA de clôture et format de date localisés via une table `CHROME`. Chaque article FR = `app/fr/blog/<slug-fr>/page.tsx`, traduction fidèle (même structure H2/H3, vouvoiement), maillage interne identique à la version EN mais entre slugs FR, liens `/memorial` remplacés par `/fr/memorial`. Hreflang réciproque posé des deux côtés (`alternates.languages` sur les 12 pages EN + les 12 pages FR + les deux index `/blog`/`/fr/blog`) — les hreflang FR des 3 nouveaux articles EN se sont peuplés automatiquement dès l'ajout des entrées FR au registre, sans retoucher les pages EN déjà publiées. Sitemap inclut les 12 URLs FR + `/fr/blog`. Mapping slugs EN → FR :
- `pet-journal-prompts` → `prompts-journal-animalier`
- `dog-memory-book-ideas` → `idees-livre-souvenir-chien`
- `puppy-first-year-memory-book` → `livre-souvenir-premiere-annee-chiot`
- `how-to-keep-a-pet-memory-journal` → `comment-tenir-journal-animalier` (pilier)
- `cat-memory-book` → `livre-souvenir-chat`
- `pet-loss-keepsake-ideas` → `idees-souvenirs-deuil-animal`
- `write-your-pets-life-story` → `ecrire-histoire-de-vie-animal`
- `kitten-first-year-memory-book` → `livre-souvenir-premiere-annee-chaton`
- `pet-memorial-gifts` → `cadeaux-deuil-animalier`
- `gifts-for-pet-parents` → `idees-cadeaux-maitres-animaux` (commit `766641a`)
- `best-pet-journal-app` → `meilleure-application-journal-animalier` (commit `aac88ee`)
- `pet-journal-app-vs-photo-book` → `application-journal-vs-livre-photo` (commit `e4b9cc4`)

**Landing mémorial publique** (`/memorial`, commit `e1620ba`) : page marketing SEO « pet memorial book », **server component pur** (pas de `"use client"`, zéro interactivité) — distincte des pages user `/memorial/[id]`. Ton sobre (deuil animalier) : palette cream + sage, pas d'amber criard sur le contenu (le dot logo nav + cookie banner restent en amber = chrome global), aucune image, aucun schema Review, CTA unique discret `/auth/signup`. Textes en `memorial_landing` (en+fr dans `messages/*.json`). Metadata title/description dédiées + canonical `/memorial`, ajouté au sitemap. Carte homepage « A legacy that lasts » (f5) devient un lien descriptif vers `/memorial` (`aria-label`, ancre SEO). **`/fr/memorial` créé (session 2026-07-22)** : réutilise `getTranslations("fr").memorial_landing` (déjà traduit), hreflang réciproque avec `/memorial`, ajouté au sitemap. Les 2 tirets cadratins pré-existants dans `memorial_landing` (fr.json) ont été corrigés à cette occasion.

⚠️ **Tiret cadratin résiduel hors scope** (repéré 2026-07-22, non corrigé) : `messages/fr.json` ligne ~377, clé `step3_desc` (page gift) — `"Le cadeau est activé pour toute la période — un mois de Digital ou un an de Print."`. Pas touché car hors périmètre de la tâche blog FR ; à nettoyer dans une prochaine session dédiée au contenu.

**Suivi Search Console (2026-07-22)** :
- **Sitemap** `everypaw.app/sitemap.xml` : "Opération effectuée", 21 URLs découvertes, dernière lecture 22 juil. (erreur fetch du 07-12 résolue ✓)
- **Pages indexées** (2) : `https://everypaw.app/` (3 juil.), `/auth/login` (28 juin)
- **Pages non-indexées** (2) : `http://everypaw.app/` (redirection 308 HTTP→HTTPS), `https://everypaw.app/fr` (explorée, actuellement non-indexée, 29 juin)
- **Articles blog + pages légales FR** : non crawlés par Google encore (hors GSC)
- **Action** : `/fr` soumis pour indexation manuelle (22 juil.)

**Session 2026-07-22 — Amélioration rendus visuels emails** :
- **Nouvelles primitives** `email-templates.ts` : `divider()`, `card()`, `colorSection()`, `list()`, `heroSection()` → riche structure visuelle sans briser compatibilité
- **Refonte crons** (4 fichiers) :
  - `weekly-reminder` : `heroSection("✍️")` + `colorSection` engagement + divider séparation
  - `monthly-story` : `heroSection("📖")` + section urgence "nouvelle histoire lue cette semaine"
  - `first-story-nudge` : `heroSection("✨")` + section "prêt(e) à voir l'histoire?"
  - `on-this-day` : `heroSection` + colorSection urgence Print "ces souvenirs méritent un livre"
- **Refonte auth emails** (4 types) :
  - Signup confirm : heroSection + colorSection "confirmez votre email"
  - Password reset : heroSection + section timeout (rouge pale)
  - Payment failed : heroSection + section urgence (rouge) + CTA "Mettre à jour"
  - Change email : heroSection + section "confirmer maintenant"
- **Gift email** : heroSection + divider + section CTA urgence
- **Localization** : EN/FR préservée 100% via `locale` param + traductions contextuelles dans colorSections
- **Backlog emails restants** (4 crons + 3 APIs) — reportés : `birthday-check`, `daily-prompts`, `streak-alert`, `retention-emails` + `contact`, `waitlist`, `suggestion`
- **Commits** : `edaea6c` (GSC suivi), `58cdbc0` (email templates), `92849ab` (doc session), `c75ab98` (on-this-day)

---

### ✅ Session 59 — Vérification pages légales FR + Refonte visuelle emails (2026-07-22)

**Problème session 59a** : Pages légales FR manuelles depuis session 56, dérive possible vs version EN.
**Résolution** : 3 pages légales FR vérifées conformes (cgv 100L, confidentialite 57L, mentions 56L) → statut ✓ archivé, hreflang recheck session 57.

**Problème session 59b** : Emails basiques (emoji + heading + paragraph) sans structure visuelle — manque de hiérarchie, appels à l'action peu visibles, messagerie engagement faible.

**Refonte email visual structure** (commits `d3b9cc5` + `0c0e65c`) :
- **Nouvelles primitives `email-templates.ts`** : `heroSection(emoji, heading)` centré + gros titre Georgia ; `colorSection(html, bgColor, textColor)` pour sections d'urgence/CTA ; `divider()` séparation ; `card()` hors scope ; `list()` hors scope.
- **7 emails refactorisés (APIs + crons existants, tous branches prior)** :
  - `contact` (API) : heroSection + quote + colorSection "direct reply"
  - `waitlist` (API) : heroSection + colorSection "welcome early access"
  - `suggestion` (API) : heroSection + quote + colorSection "reply directly"
  - `on-this-day` (cron) : heroSection + colorSection Print urgence "these memories deserve a book"
  - `first-story-nudge` (cron) : heroSection + colorSection "ready to see story?"
- **11 emails refactorisés (session 59, commits dans sessions antérieures)** : auth (4) + gift (1) + crons (4) + on-this-day (1) déjà complétés.
- **Backlog emails (4 crons + 3 APIs, session 60 prochaine)** : `birthday-check`, `daily-prompts`, `streak-alert`, `retention-emails` + `contact`, `waitlist`, `suggestion`.
- **Localization** : FR/EN 100% preserved via `locale` param + colorSection messages contextualisées (2 langues dans les colorSections).
- **Build checks** : `npm run build` ✓ + `git push origin main` ✓.

---

### ✅ Session 60 — Refonte visuelle emails (suite complète) (2026-07-22)

Continuation refonte emails : finaliser les 7 APIs + crons restants (reportés session 59).

**Refactorisés** (commits `d3b9cc5` + `0c0e65c`) :
- **3 APIs** : `contact`, `waitlist`, `suggestion` → heroSection + colorSection + divider, structure cohérente avec le reste
- **4 crons** : `birthday-check`, `daily-prompts`, `streak-alert`, `retention-emails` (3 paliers d1/d7/d30) → heroSection + colorSection urgence/momentum, messages emotivement alignés avec le tone DESIGN.md Georgia (Serif-for-Soul)
- **All primitives use BRAND colors** (no inline hex sauf exceptions DESIGN.md) ; `--ep-brand` (`#C8813A` terracotta) + warmth context.
- **Bilingual emails** : EN/FR 100% via colorSection message tuning (ex d30_free: "Unlock the full power" vs "Déverrouillez le pouvoir complet")
- **Localization path** : `locale` param (basé sur `profile.language` ou `req.locale`) + `getTranslations(locale).key_name` où applicable (retention-emails, first-story-nudge).
- **Testing** : `npm run build` ✓ ; all TypeScript ✓.
- **Commits** : `d3b9cc5` APIs + `0c0e65c` crons ; `git push origin main` ✓.

**Status all email visual improvements** : ✅ COMPLETE.
- ✅ 4 auth emails (signup-confirm, password-reset, payment-failed, change-email)
- ✅ 4 crons email 1st wave (on-this-day, first-story-nudge, weekly-reminder, monthly-story) + 1st wave completeness (session 58+59)
- ✅ 3 APIs (contact, waitlist, suggestion) — session 60
- ✅ 4 crons email 2nd wave (birthday-check, daily-prompts, streak-alert, retention-emails) — session 60
- ✅ 1 gift email (gift/complete)

**Remaining backlog** (large refactors, deferred) — see "Optimisation & dette technique" in CLAUDE.md for current status:
- #4 CDN static landing (root `/[locale]/` restructure for `headers()` removal)
- #8 Dashboards RSC migration (~10 client pages → data at first paint)
- #9 God-components split (in progress, see Session 61)

### ✅ Session 61 — Dédup compressImage + découpe god-components order/settings (2026-08-20)

Suite du chantier #9 (dette technique). Méthode identique à `pets/[id]` (sessions 2026-07-23) : petites PR incrémentales, `tsc`+`npm test` verts avant push, smoke test sur preview Vercel `everypaw-staging` avant merge, jamais de commit direct sur `main`.

**Dédup `compressImage`** (PR [#98](https://github.com/CookServices/everypaw/pull/98)) : dette repérée lors de la découpe `pets/[id]` (2026-07-23), enfin traitée. 4 copies → 1 seule dans `src/lib/image.ts`, importée par `pets/new`, `pets/[id]/edit`, `OriginsFlow`. Comportement identique vérifié : les 2 sites avatar passent toujours un blob cropé fixe 400×400 en entrée, donc `maxSize` 800 vs 1200 ne changeait jamais rien en pratique (branche resize jamais déclenchée) ; `OriginsFlow` avait déjà `maxSize: 1200` identique au canonique.

**`order/page.tsx` — PR1+PR2 (1625 → 1435 l)** :
- PR1 ([#99](https://github.com/CookServices/everypaw/pull/99)) : `constants.ts` (types `Step`/`LayoutType`/`ThemeId`, interfaces `Story`/`Entry`/`Pet`/`Profile`, `PAGE_LAYOUTS`/`SHIPPING_BY_COUNTRY`/`COUNTRIES`/`COVER_THEMES`) + `utils.ts` (3 IIFE dérivées converties en fonctions pures nommées : `estimateOrderPages`, `calcCoverPeriod`, `calcMonthsCount`).
- PR2 ([#100](https://github.com/CookServices/everypaw/pull/100)) : le fichier avait déjà 7 render-closures depuis la refonte session 2026-06-05 (`renderPreviewModal`, `renderStepper`, `renderUpsellBanners`, `renderPreviewStep` 492 l, `renderSuccessStep`, `renderConfirmStep`, `renderAddressStep`). Seuls `renderPreviewModal` → `components/PreviewModal.tsx` et `renderStepper` → `components/Stepper.tsx` extraits : les 4 autres partagent massivement `accentColor`/`textPrimary`/`textMuted`/`isMemorial` calculés une fois dans le parent — extraction prématurée sans bundle "theme props" = signature de props énorme et risque de divergence. **Reste à faire** : concevoir ce bundle avant PR3.

**`settings/page.tsx` — PR1 (964 → 866 l)** ([#101](https://github.com/CookServices/everypaw/pull/101)) : pas de render-closures pré-existantes ici, mais 3 objets style (`inputStyle`/`btnPrimary`/`btnOutline`) sont des littéraux statiques sans dépendance état/props → extraits tels quels dans `constants.ts`. Les 2 modales self-contained (`UpgradeConfirmModal`, `DeleteAccountModal`) extraites en composants avec props typées (`isFR` + callbacks), import direct des styles partagés (pas de prop-threading superflu).

**Vérification** : chaque PR testée en live sur `everypaw-staging-git-*` (compte `test-print-multi@yopmail.com`) avant merge — upload avatar réel (mesuré 400×400 après upload), simulation upload origins 1600×1200 (resize réellement déclenché, vérifié sans erreur), navigation Stepper aller/retour, ouverture/fermeture `PreviewModal` (iframe srcdoc généré), ouverture/saisie/annulation `DeleteAccountModal`. `UpgradeConfirmModal` non testable en live sur ce compte (`/api/stripe/upgrade-preview` → 400 "No active subscription", limite pré-existante des comptes seedés sans vraie souscription Stripe, sans rapport avec la refacto).

**Reste ouvert sur #9** : `renderPreviewStep` (order, 492 l) + le reste de `settings/page.tsx` (encore ~800 l de JSX/handlers) — les deux bloqués sur le même sujet (bundle de props partagées), pas des quick wins.

### ✅ Session 62 — Package `@everypaw/design-system` + sync claude.ai/design (PRs [#104](https://github.com/CookServices/everypaw/pull/104), [#105](https://github.com/CookServices/everypaw/pull/105) mergées) (2026-08-27)

`/design-sync` (feature Claude Code) exige un repo/package buildable de façon isolée pour lire des composants — everypaw (styles inline, pas de lib composants) n'y correspondait pas.

- **Nouveau package** `packages/design-system/` : `private`, buildé via `tsup` (ESM+CJS+d.ts). Tokens (`tokens.ts` + `styles.css`) **dupliqués** depuis `DESIGN.md`/`globals.css` (choix assumé — isolation totale du package, drift risk accepté). 6 composants présentationnels : `Button`, `Card`, `Input`, `Badge`, `NavItem`, `Modal`. Zéro consommateur dans `src/` pour l'instant (scope v1 volontairement minimal).
- **Exception convention** : ce package stylise via `className`+CSS (`:hover`/`:focus-visible`), contrairement à la règle "styles inline partout" ci-dessus — accepté pour ce package isolé exportable. Naming CSS pas encore réconcilié : `.ep-btn-primary` (app) vs `.ep-btn--primary` (package, BEM).
- **Fix tsconfig** : root `tsconfig.json` `include` élargi (`**/*.ts`) absorbait le `node_modules`/`@types/react` isolé du package → 160 erreurs TS fantômes. Fix durable : `include` scopé à `src/**`, `scripts/**`, `vitest.config.ts` (plus besoin d'exclure chaque futur sibling directory par son nom).
- **`/design-sync` exécuté 2×** : upload initial (6 composants) + re-sync après fixes review (Input `useId`/`aria-invalid`/`errorMessage`). Committé un dossier `.design-sync/` (config + previews + notes) — 2e commit direct sur `main` par la session `/design-sync` elle-même (pas par moi).
- **Review complète** (`/code-review`, 8 angles, high effort) : 6 findings confirmés, 4 corrigés (a11y Input + tsconfig), 2 laissés (conventions styles/naming, hors scope demandé).
- Projet claude.ai : https://claude.ai/design/p/dc91647a-d972-409a-adee-c59450239a42

### ✅ Session 64 — 5 bugs critiques trouvés et corrigés en production, audit étendu (2026-08-31)

Partie d'un audit de bug initial sur la confirmation d'inscription, étendu par vérifications successives à tous les flux auth/paiement voisins. Trois bugs sur les flux de confirmation par email (signup, recovery, email_change — les deux premiers partagent la même cause racine PKCE, le troisième est un bug différent de token vide trouvé par cohérence), un bug de redirect sur l'invite flow, et une faille de sécurité financière sur les livres payants à l'unité — trouvée en auditant le flow gift/redeem par contraste.

**1. Signup — confirmation cross-device silencieuse** (PR [#108](https://github.com/CookServices/everypaw/pull/108)) :
Un utilisateur qui confirme son inscription depuis un navigateur/appareil différent de celui utilisé pour s'inscrire (cas par défaut sur trafic Instagram mobile : clic depuis le webview de l'app mail) était redirigé silencieusement vers `/auth/login`, sans message, sans session ouverte — alors que Supabase avait bien marqué son email comme confirmé. Confirmé en prod : `randy.figueroa`, `email_confirmed_at` renseigné, `last_sign_in_at` NULL, jamais revenu.
Cause : `signup/page.tsx` déclenche `supabase.auth.signUp()` via `createBrowserClient` (`@supabase/ssr`), flow PKCE par défaut — `code_verifier` stocké côté navigateur au moment de l'inscription. Le `confirmation_url` fourni par Supabase (PKCE, `token=pkce_...`) était systématiquement préféré au lien `token_hash`. Ouvert depuis un autre navigateur, le `code_verifier` est absent : l'échange de code échoue côté `/auth/callback`, dont l'erreur retournée par `exchangeCodeForSession` n'était **jamais capturée** — la route redirigeait quand même vers `/dashboard`, où le middleware (sans session) rebondissait silencieusement vers `/auth/login`.
Fix : `auth/callback/route.ts` capture et logue l'erreur, redirect `/auth/login?auth_error=exchange_failed` au lieu du bounce silencieux. Nouvelle route `src/app/auth/confirm/route.ts` : vérifie `token_hash` côté serveur via `supabase.auth.verifyOtp()` — aucun état navigateur requis. `auth-hook/route.ts` construit désormais le lien signup vers cette route, ignore `confirmation_url`. `login/page.tsx` affiche un bandeau distinct (ton neutre, bouton "Renvoyer le lien") pour `auth_error=confirm_failed` (clé i18n `auth.confirm_link_invalid`). Suppression de `src/app/api/emails/{confirm-signup,change-email,reset-password}/route.ts` (code mort, jamais appelé depuis la bascule vers `auth-hook`).
Validé en prod : signup navigateur A, clic du lien dans navigateur B storage vierge → session ouverte, `last_sign_in_at` renseigné.

**2. Recovery — même bug PKCE cross-device** (PR [#109](https://github.com/CookServices/everypaw/pull/109)) :
`forgot-password` envoie `redirectTo` vers `/auth/update-password` (PKCE aussi), et `update-password/page.tsx` n'a jamais appelé `exchangeCodeForSession` explicitement — ça ne marchait que par effet de bord de la détection automatique d'URL du client browser (`detectSessionInUrl`), qui a besoin du `code_verifier` local. Vérifié en prod avant correction : même navigateur → marche (silencieusement) ; navigateur différent (storage vierge) → coincé sur `?code=` jamais échangé, "Lien de réinitialisation invalide ou expiré" alors que le lien était frais.
Fix : `/auth/confirm` généralisé à `type=signup|recovery`, `auth-hook` construit le lien recovery vers cette route (au lieu de `confirmation_url` PKCE), `update-password/page.tsx` affiche le message d'erreur existant proactivement sur `auth_error=confirm_failed` au lieu d'attendre un submit raté.
Validé en prod bout-en-bout : reset demandé, lien ouvert dans un navigateur storage vierge → session ouverte, nouveau mot de passe soumis avec succès, redirect `/dashboard`.
Le bug de substitution preview→prod documenté dans Preview Limitations (ci-dessus) est indépendant et reste réel, mais devient sans effet pratique : le lien pointe désormais toujours vers `${APP_URL}/auth/confirm`, jamais une origine preview.

**3. Email change — totalement cassé, pas juste cross-device** (PR [#110](https://github.com/CookServices/everypaw/pull/110)) :
Découvert en vérifiant ce troisième flux par cohérence avec les deux précédents. Le lien de confirmation envoyé à la nouvelle adresse avait `token=` **vide** (`.../auth/v1/verify?token=&type=email_change&...`) → Supabase répondait `400 validation_failed "Verify requires a token or a token hash"` à chaque tentative, pour tout le monde, peu importe l'appareil. Personne n'a jamais pu confirmer un changement d'email sur Everypaw en cliquant le lien reçu.
Cause : "Secure email change" est **désactivé** dans Supabase Auth (Providers → Email) — une seule confirmation, sur la nouvelle adresse. Sous ce mode, Supabase renvoie `token_hash_new` comme chaîne vide plutôt que de l'omettre ; l'ancien code faisait `token_hash_new ?? tokenHash` (`??` ne rattrape que `null`/`undefined`, pas une chaîne vide) → `tokenHashNew` restait `""`. La construction manuelle utilisait aussi le mauvais nom de paramètre (`token=` au lieu de `token_hash=`), bug resté invisible tant que `confirmationUrl` (jamais fourni par Supabase pour ce type d'action ici) prenait toujours le dessus.
Fix : `tokenHashNew = token_hash_new || tokenHash` (`||`, pas `??`), lien construit vers `/auth/confirm?type=email_change` (`/auth/confirm` généralisé à `signup|recovery|email_change`), `dashboard/settings` affiche l'erreur proactivement sur `auth_error=confirm_failed`. `confirmationUrl`/`SUPABASE_URL` devenus orphelins dans `auth-hook.ts` (plus aucune branche ne les utilise) — supprimés.
Validé en prod bout-en-bout : changement d'email déclenché, lien ouvert → email réellement mis à jour (`Adresse actuelle : ...` reflète la nouvelle adresse).

**4. Login — `?next=` de l'invite flow ignoré** (PR [#112](https://github.com/CookServices/everypaw/pull/112)) :
Trouvé en auditant le flow invite/pet_members. `invite/[token]/page.tsx` envoie les utilisateurs existants vers `/auth/login?next=/invite/{token}` pour le CTA "Se connecter pour accepter", mais `login/page.tsx` ne lisait jamais que `?redirect=` (le paramètre du flow gift). `signup/page.tsx` avait déjà le fix (`next ?? redirect`, commentaire explicite) — jamais reporté sur login. Pas une faille de sécurité, juste un paramètre perdu : l'utilisateur atterrissait sur `/dashboard` au lieu de revenir sur la page d'invitation, laissant l'invitation non acceptée jusqu'à ce qu'il re-clique le lien email.
Validé en prod : connexion avec `?next=%2Fgift` atterrissait sur `/dashboard` avant fix, sur `/gift` après.

**5. `stripe/book-checkout` — prix calculé depuis un `pageCount` client, paiement contournable** (PR [#115](https://github.com/CookServices/everypaw/pull/115)) :
Trouvé en auditant le flow gift/redeem puis les routes Stripe voisines. Le prix du livre supplémentaire payant se calculait depuis un `pageCount` envoyé par le client (`calcGelatoBookPrice(pageCount)`, seule validation `28 ≤ pageCount ≤ 500`). `/api/gelato/order` recalcule le vrai `pageCount` **indépendamment** côté serveur à partir du contenu réel du pet, sans jamais le comparer au prix payé — et `book_credits` est un jeton fongible (1 crédit = 1 commande autorisée) sans notion de prix attaché. N'importe quel utilisateur connecté pouvait déclarer `pageCount: 28` via un simple appel `fetch` (devtools, aucun accès spécial requis) pour payer le minimum (~28€/$) tout en recevant un livre à la taille réelle de son contenu (jusqu'à ~121€/$ au plafond de 500 pages). Perte financière directe et non plafonnée, par commande.
Fix : `book-checkout` vérifie désormais l'ownership du pet et calcule le prix côté serveur au **pire cas** (`calcPageCount` sur toutes les stories du pet, dédicace/photos orphelines/tributs supposés présents) au lieu de faire confiance au client. `calcPageCount` est monotone sur chaque paramètre → le prix calculé est prouvablement toujours ≥ ce que `gelato/order` calculera réellement pour n'importe quel sous-ensemble filtré du même contenu (jamais de sous-facturation ; parfois une légère sur-facturation si l'utilisateur filtre son livre). Le prix affiché sur la page order avant paiement utilise désormais la même formule pire-cas, pour que ce qui est montré corresponde à ce qui sera réellement facturé sur Stripe.

**Reste à faire côté Julien** :
- Vérifier dans Supabase Dashboard → Auth → URL Configuration que `<APP_URL>/auth/confirm` est bien couvert par les **Redirect URLs** autorisées — déjà confirmé ✓ via le wildcard `https://everypaw.app/**` existant, rien à changer.
- Aucune nouvelle variable d'environnement Vercel requise (la route réutilise `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`NEXT_PUBLIC_APP_URL` déjà en place).
- Les scénarios de validation prod (1, 2, 3, 4) ont été rejoués et confirmés dans cette session — rien à retester, sauf si régression suspectée. Le point 5 n'a été vérifié qu'en lecture de code + tests/build, pas en commande réelle — un test manuel (commander un livre avec filtre année/histoires, comparer prix affiché vs montant Stripe réel) reste à faire.
- **Limite connue, non corrigeable par du code** (signup/recovery) : certains scanners de sécurité email d'entreprise (Microsoft Defender Safe Links, Google Workspace) pré-cliquent automatiquement les liens avant l'utilisateur, consommant le token single-use. Le symptôme (`auth_error=confirm_failed`) sera désormais visible au lieu d'être silencieux, mais la cause sera différente du bug PKCE corrigé ici.
- **Backlog #12** (voir section Optimisation & dette technique) : interaction non vérifiée entre `stripe/cancel`/`reactivate` et `stripe/upgrade` — trouvé pendant cet audit, pas corrigé, juste consigné.

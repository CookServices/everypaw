# CLAUDE.md — Everypaw

> Fichier de contexte projet pour Claude Code. Maintenu à la racine du repo.

---

## Instructions pour Claude

En fin de session, si des décisions importantes ont été prises ou du code significatif a été produit :
1. Ajoute une entrée session dans "Historique des sessions" (en bas) et déplace la plus ancienne des 2 vers `docs/SESSIONS.md` — CLAUDE.md ne garde que les 2 dernières
2. Mets à jour "État actuel" si une fonctionnalité majeure a changé
3. Note les décisions d'architecture dans "Conventions de code"
4. Mets à jour la date de dernière session

Ne demande pas confirmation — fais-le directement avant de clore. Garder ce fichier < 700 lignes : tout historique détaillé va dans `docs/SESSIONS.md`.

**Chantier en cours : conversion vers le plan Print.** Roadmap et décisions dans `docs/print/roadmap.md`, les dix specs exécutables dans `docs/print/specs.md`. Une spec = une PR.

Toujours auditer les fichiers existants avant de modifier quoi que ce soit. Suivre l'ordre d'implémentation recommandé pour toute nouvelle feature (voir section dédiée).

---

## Présentation du projet

**Everypaw** est une application web pour pet parents (chiens, chats) permettant de tenir un journal IA de leur animal et de le transformer en livre imprimé annuel.

- **URL** : https://everypaw.app
- **GitHub** : CookServices/everypaw (branch `main`)
- **Domaine** : everypaw.app (OVH → Vercel)
- **Statut** : MVP live, early-access — Stripe en mode **Live** depuis 2026-07-07 (paiements réels)
- **Cible** : pet parents US (marché principal) + France (marché secondaire, route `/fr/`)
- **Différenciateur** : seule app combinant journal IA + livre imprimé physique

---

## Design Context (impeccable)

Contexte design à la racine, à lire avant tout travail UI :

- **`PRODUCT.md`** — stratégie : register (`product`, override `brand` pour la landing `/`, `/fr`), users, anti-références (pas de dashboard SaaS, pas d'outil véto), 5 principes design.
- **`DESIGN.md`** — système visuel : North Star « The Hearthside Journal ». Tokens — terracotta `#C8813A`, fonds sable `#F7F2EA`/ivoire `#FDFAF5`, ink cocoa `#3D2B1F`, paire Georgia (display) + DM Sans (body), boutons pill, ombres cocoa chaudes.
- **`.impeccable/design.json`** — sidecar : rampes tonales, tokens ombres/motion, snippets composants.

Règles clés : terracotta = seul accent (One Voice) · texte émotionnel en Georgia italique (Serif-for-Soul) · body DM Sans 300 mais ≥4.5:1 contraste (Contrast Floor) · ombres toujours cocoa, jamais grises (Warm-Shadow) · pas d'eyebrow uppercase tracked au-dessus de chaque section (la hiérarchie passe par Georgia).

### Tokens couleur (`globals.css` `:root`) — utiliser `var(--ep-*)`, jamais de hex inline

- Base : `--ep-bg` `#F7F2EA` · `--ep-bg-card` `#FDFAF5` · `--ep-brand` `#C8813A` · `--ep-brand-dark` `#B5712E` · `--ep-text` `#3D2B1F` · `--ep-text-muted` `#7A5C44` · `--ep-text-faint` `#9A8070` (décor seulement, échoue le contraste body).
- Erreur : `--ep-error-bg` `#FEF2F2` · `--ep-error-border` `#FCA5A5` · `--ep-error-ink` `#991B1B` · `--ep-alert` `#A32D2D`.
- Statut commande Gelato : `--ep-status-print` `#5880B8` (imprimé/transit) · `--ep-status-ship` `#6A9E78` (expédié/livré) · `--ep-status-ship-ink` `#3A6A48`.
- Mémorial : `--ep-memorial` `#8B6B4A`.
- **Exception** (hex inline tolérés) : palettes produit — les 5 thèmes de couverture livre (order), couleurs mood/milestone (pets), ombres `rgba(0,0,0,…)`. Ce sont des données design, pas des tokens.

**Surfaces déjà passées à la chaîne impeccable** (skill `/impeccable <command>`, snapshots sous `.impeccable/critique/`) : landing hero (`/`+`/fr`), `/dashboard`, et les 5 pages animal (`pets/[id]` Journal/Histoires/Étapes, `order` Livre, `books` Bibliothèque) — eyebrows supprimés, héros agrandis (Georgia), couleurs tokenisées, progress bars en `transform: scaleX` (pas `width`).

---

## Stack technique

| Couche | Techno | Notes |
|---|---|---|
| Framework | Next.js 14.2 (App Router) | Pas de `output: standalone` dans next.config.js |
| Base de données | Supabase (PostgreSQL) | Auth + DB + Storage photos |
| Auth | Supabase Auth | Google OAuth + email/password — Google OAuth **en production** ✅ |
| Paiements | Stripe | Webhooks dans `/api/stripe/webhook` |
| IA | Anthropic Claude API | Modèle : `claude-sonnet-4-6` pour la génération de stories |
| Impression | Gelato | Print-on-demand livres |
| Emails | Resend | 3 000/mois gratuit |
| Hébergement | Vercel | Cron jobs configurés dans `vercel.json` |
| Langage | TypeScript | |
| Style | Inline styles | Tailwind installé mais non utilisé en pratique |

**Coût infra mois 1-2 : ~30-50€/mois** (Anthropic API principal poste)

---

## Commandes

```bash
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build (also validates TypeScript)
npx tsc --noEmit   # Type-check without building
npm test           # Run Vitest unit tests (vitest run)
```

Pas de lint script. Tests unitaires via **Vitest** (`npm test`) sur la logique pure critique (`src/lib/*.test.ts`). Type-checker avec `npx tsc --noEmit` avant tout commit.

Déploiement sur **Vercel** — push sur `main` = auto-deploy. Les variables d'environnement (Supabase, Stripe, Gelato, Resend) vivent sur Vercel. En local : `npx vercel env pull .env.local` récupère les noms, mais les vars "Sensitive" reviennent **vides** (write-only) — les renseigner à la main si besoin (clé test Stripe recommandée en local).

---

## Deployment & Staging

**Architecture : deux projets Vercel, un seul repo (plan Hobby)**

Le plan Hobby n'autorise pas un environnement Preview séparé à côté de Production sur un même
projet, donc le repo est connecté à **deux** projets :

| Projet | Rôle | URL |
| --- | --- | --- |
| `everypaw` | Production | `everypaw.app` |
| `everypaw-staging` | Preview (par PR) | `everypaw-staging-git-<branche>-*.vercel.app` |

**Les deux pointent vers la même base Supabase** — `everypaw-staging` est un projet *Vercel*
distinct, pas une base distincte. Le nom induit en erreur : il n'existe aucune donnée de staging
isolée.

Workflow : branche de feature → push → PR → tester sur l'URL de preview `everypaw-staging` → review
et approbation → merge sur `main`, qui déploie la production. La PR affiche **aussi** une preview du
projet `everypaw` : l'ignorer, ce projet est configuré en Production seule et ses previews renvoient
500 sur toute route service-role.

Ruleset `main-protection` sur `main` : review de PR obligatoire, force-push bloqué, aucun status check
requis (TODO : en ajouter un une fois le build Vercel remonté). Aucune exception, pas même un commit
docs-only du propriétaire du repo.

### Ce qu'une preview prouve, et ce qu'elle ne prouve pas

`everypaw-staging` ne porte que **trois** variables, les trois Supabase : toute route lisant un autre
secret (Stripe, Gelato, Anthropic, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`) échoue en preview sur un
**500 à corps vide**, un throw non rattrapé qui ressemble à un bug de code sans en être un. Y ajouter
la `STRIPE_SECRET_KEY` live n'est pas un fix gratuit, les previews sont publiquement joignables.

Une preview prouve donc l'UI, les lectures Supabase et **quel** endpoint un bouton appelle, jamais ce
que fait cet endpoint : tout ce qui est derrière un paiement ou une commande d'impression se vérifie
en production. Les crons, eux, ne tournent pas sur une preview (test manuel, ou prod).

**Aucun flux email ne peut non plus s'y terminer** : `validateRedirectTo`
([lib/auth.ts](src/lib/auth.ts)) remplace tout hostname qui ne matche pas `NEXT_PUBLIC_APP_URL` par
l'URL de prod (garde anti-open-redirect), donc le lien reçu atterrit sur `everypaw.app`. Terminer le
flux sur la prod puis se connecter sur la preview, les deux partagent la même base. Depuis la Session
64, signup/recovery/email_change passent de toute façon par `${APP_URL}/auth/confirm`.

### Variables d'environnement : scope et pièges

Vercel fige les variables au build et les scope par environnement **et par projet**. En ajouter une
à un projet ne fait rien pour l'autre, et un déploiement existant ne récupère jamais une variable
ajoutée après coup — il faut redéployer. Auditer les scopes sans lire aucune valeur, une fois par
projet (la colonne `environments` doit afficher Preview, pas seulement Production) :

```bash
npx vercel link --yes --project everypaw-staging
npx vercel env ls          # noms + environnements, jamais les valeurs
```

Trois pièges :

- Dans le dashboard, le scope Preview simple vit sous **Environments** et fonctionne en Hobby.
  **Preview Branches**, juste à côté, est du per-branch et est réservé au plan Pro : y buter ne veut
  pas dire que le scope Preview est indisponible.
- Une variable de type Secret ne peut pas devenir Config (« Saved secrets are write-only ») et son
  champ Value est vide à l'édition. Pour lui ajouter un scope sans risquer la valeur de production,
  créer une **entrée séparée** ciblant le nouvel environnement et laisser l'originale intacte.
- `vercel env add <clé> preview --value <v>` est inutilisable en non-interactif (le CLI exige une
  branche). Passer par le dashboard.

Sonde pour savoir si un déploiement a bien la clé service : ouvrir une page publique `/pets/<id>`,
elle appelle `getServiceSupabase()` sans auth. Ne **pas** sonder avec une route API qui vérifie
l'auth d'abord, elle renvoie 401 dans les deux cas et n'apprend rien.

### Discipline données de test

Les previews écrivent dans la base de **production** (pas de staging DB, contrainte du free tier) :
comptes de test yopmail uniquement, jamais de données utilisateur de production committées ou
poussées, entrées de test nettoyées après usage.

**Ne pas se fier à une liste de comptes écrite, la requêter** — celle qui vivait ici pointait cinq
comptes supprimés depuis :

```sql
SELECT id, email, plan, book_credits FROM profiles
WHERE email LIKE '%@yopmail.com' ORDER BY email;
```

⚠️ `supabase/seed_print_multi.sql` et `purge_test_data.sql` sont périmés (UUID codés en dur de
comptes disparus) et le seed **désactive** `trg_enforce_free_entry_limit`, qu'il laisse désactivé en
production s'il échoue au milieu. Préférer un script qui résout l'identifiant depuis l'email et lève
une exception explicite s'il est absent.

Vraie recette, le jour où le besoin se présente (base isolée, crons qui tournent, webhooks
testables) : Supabase Pro (~25 $/mois) débloque les preview branches, puis branche `staging` →
projet Supabase séparé → variables dédiées. Non implémenté, arbitrage coût/complexité. Historique
des pannes de cet environnement (clé service absente des previews pendant 119 jours, projet staging
cassé, Deployment Protection activée mais non appliquée) : `docs/SESSIONS.md`.

---

## Variables d'environnement (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

ANTHROPIC_API_KEY

# Stripe — 11 vars exactement (mode LIVE ; catalogue : 2 produits, prix EUR/USD sous le même produit)
STRIPE_SECRET_KEY              # sk_live_... depuis 2026-07-07
STRIPE_WEBHOOK_SECRET          # endpoint live we_1TqHQkRmAiDTHhpuLkV9Udz4 (6 events, dont invoice.payment_succeeded)
STRIPE_PRICE_ID_DIGITAL_EUR / _USD      # abonnement digital 4,99 €/mois · $4.99/mo
STRIPE_PRICE_PRINT_ANNUAL_EUR / _USD    # abonnement print annuel 79 €/an · $79/year
STRIPE_GIFT_PRICE_ID_DIGITAL_EUR / _USD # gift one-time, 1 mois Digital offert
STRIPE_GIFT_PRICE_ID_PRINT_EUR / _USD   # gift one-time, 1 an Print offert
STRIPE_GIFT_COUPON_ID          # coupon 100% off, duration "once" (1ère facture gratuite)

RESEND_API_KEY
WAITLIST_TO_EMAIL              # email destinataire waitlist (optionnel — warn si absent)

GELATO_API_KEY                  # print-on-demand — requis par /api/gelato/order et /api/gelato/status/[orderId]

NEXT_PUBLIC_APP_URL             # base URL utilisée pour les liens absolus (emails, redirects Stripe/Gelato)
PDF_ACCESS_SECRET              # signe le token HMAC de /api/book-pdf ; fallback sur SUPABASE_SERVICE_ROLE_KEY si absent
CRON_SECRET                    # protège les routes /api/cron/*
GA_API_SECRET / META_CAPI_TOKEN # événements d'achat serveur (P0-1), Production seule, sans donnée utilisateur

# Auth Hook (Supabase → /api/emails/auth-hook)
SUPABASE_HOOK_SECRET           # "v1,whsec_<base64>", depuis Supabase > Auth > Hooks > Send Email > Reveal ; absent = 401 du hook, 500 au signup
```

Liste tenue à jour depuis `.env.local.example` (source de vérité — vérifier ce fichier en cas de doute, il est plus facile à garder synchrone que ce tableau).

---

## Schéma base de données (Supabase)

```sql
-- profiles (liée à auth.users)
profiles: id, email, full_name, avatar_url,
          plan,              -- 'free' | 'digital' | 'print' | 'book_only'
          is_premium,        -- boolean (legacy, dériver de plan)
          book_credits,      -- integer — livres dus à l'utilisateur
          stripe_customer_id,
          email_reminders,   -- boolean — consentement emails hebdomadaires
          onboarding_completed,  -- boolean — true seulement si l'utilisateur a créé un animal (set dans pets/new)
          onboarding_dismissed,  -- boolean — true si le modal a été fermé/terminé (Passer, ou fin du flow) ; pilote l'affichage du modal, indépendamment de onboarding_completed
          payment_past_due,  -- boolean — set par invoice.payment_failed, cleared par invoice.payment_succeeded
          created_at

-- pets
pets: id, user_id, name, species, breed, birthdate, photo_url, bio,
      deceased_at,           -- date nullable — active le mode mémorial
      memorial_message,      -- text nullable
      memorial_photo_url,    -- text nullable — photo affichée sur la page mémorial
      created_at

-- entries (journal)
entries: id, pet_id, user_id, content, photo_urls[], mood, tags[], entry_date, created_at

-- stories (chapitres IA)
stories: id, pet_id, user_id, title, content, cover_url,
         status,             -- 'draft' | 'ready' | 'ordered'
         created_at

-- milestones
milestones: id, pet_id, user_id, type, title, achieved_at, entry_id, created_at

-- book_configs (brouillons et commandes de livres)
book_configs: id, user_id, pet_id, name, status ('draft'|'ordered'),
              theme, custom_title, year_filter, selected_story_ids (jsonb),
              cover_photo_url, story_layouts (jsonb), dedication_text,
              gelato_order_id, ordered_at, page_count,
              created_at, updated_at
-- RLS : owner uniquement (select/insert/update/delete)
-- Max 15 drafts par utilisateur (enforced API)
-- updated_at auto via trigger book_configs_updated_at

-- milestone_definitions (extensibilité sans déploiement)
milestone_definitions: id, key (unique), name_fr, name_en, keywords text[], icon, order_index
-- RLS : SELECT public, pas d'écriture client
-- Utilisée en priorité par detectMilestones() et translateMilestone() ; fallback sur MILESTONE_TYPES hardcodé
-- Clé spéciale "first_memory" : déclenche sur existingEntries.length === 0

-- gift_deliveries (cadeaux achetés pour une date future)
gift_deliveries: id, checkout_session_id (unique), promo_code, recipient_email,
                 sender_name, message, locale, deliver_on (date), sent_at, created_at
-- RLS on, aucune policy : service role seul. Le cron réclame la ligne en écrivant
-- sent_at AVANT l'envoi et ne lit que sent_at IS NULL, donc jamais deux envois.

-- memorial_tributes (hommages publics sur pages mémorial)
memorial_tributes: id, pet_id, author_name (1–100), message (1–1000),
                   status ('pending'|'approved'|'rejected'), created_at
-- RLS : tributes_public_read (approved + pet décédé), tributes_owner_read (owner voit tout)
-- Écriture client uniquement via POST route API (rate limit 3/h IP + honeypot)

-- pet_members (journal partagé foyer)
pet_members: id, pet_id, user_id (null jusqu'à acceptation), invited_email,
             invited_by, role ('contributor'), status ('pending'|'accepted'|'revoked'),
             invite_token (64 hex, unique), invite_token_expires_at, accepted_at, created_at
-- RLS : pet_members_owner_select (owner voit ses membres), pet_members_self_select (membre voit sa propre ligne)
-- Aucun INSERT/UPDATE/DELETE client — service role uniquement via routes API
-- Max 5 membres non-révoqués par animal (enforced API) ; token TTL 7 jours
```

SQL migrations dans `supabase/migrations/`. Toujours utiliser `IF NOT EXISTS` et blocs `DO $$ … $$` pour rester idempotent.

---

## Plans & monétisation

Système **3 plans strict** (depuis 2026-07-07) :

| Plan | Prix | Accès |
|---|---|---|
| **Free** | $0 | 10 entrées max, 1 génération IA, 1 profil animal |
| **Premium Digital** | 4,99 €/mois · $4.99/mo | IA illimitée, multi-profils, pas de livre inclus |
| **Premium Print** | 79 €/an · $79/yr (annuel uniquement) | Tout le digital + 1 livre hardcover annuel |

Livre supplémentaire (tout plan payant) : prix **dynamique** selon le nombre de pages (`calcGelatoBookPrice`, minimum 28 €/$28) — pas de Price ID Stripe. Les plans supprimés (`digital_annual`, `print_monthly`, livre à la carte à prix fixe) n'existent plus ni dans le code ni dans Stripe.

### Guards d'accès

```ts
getUserPlan(userId)          // retourne le plan actuel — src/lib/plan.ts
canGenerateStory(userId)     // Free: max 1 | autres: illimité — src/lib/plan-guards.ts
canAddEntry(userId)          // Free: max 10 | autres: illimité — src/lib/plan-guards.ts
canOrderBook(userId)         // Digital: non | Print: oui (1/an) | Book: oui (1 crédit) — src/lib/plan-guards.ts
```

**`src/lib/plan-guards.ts`** (session 58) : guards purs (`canAddEntry`, `canGenerateStory`, `canOrderBook`, `priceIdToPlan`, types `Plan`/`PlanInfo`), **zéro import**. Extraits de `plan.ts` pour rester importables depuis un module utilisé par un composant `"use client"` (voir règle client/server ci-dessous). `plan.ts` fait `export * from "./plan-guards"` — tous les imports existants `from "@/lib/plan"` continuent de fonctionner sans changement.

`priceIdToPlan()` mappe les Stripe price IDs (depuis env vars) aux plans.  
Book credits : incrémentés via RPC `increment_book_credits`, consommés atomiquement via `try_consume_book_credit` (verrou `FOR UPDATE`) **avant** l'appel Gelato, restaurés via `restore_book_credit` en cas d'échec Gelato. Prévient les race conditions sur les commandes simultanées.

Le webhook (`/api/stripe/webhook`) gère :
- `checkout.session.completed`
- `customer.subscription.deleted` — downgrade plan free + clear `payment_past_due`
- `customer.subscription.updated`
- `invoice.payment_succeeded` — source unique pour les book credits Print (ajouté 2026-05-28) ; remet `payment_past_due: false` en tête de handler pour **tout** paiement réussi (avant les gates Print/365j qui return early)
- `invoice.payment_failed` — set `payment_past_due: true` + log `events_log` (type `stripe_payment_failed`, idempotent par `stripe_event_id`) + email Resend avec lien billing portal Stripe (`return_url` → `/dashboard/settings`) **uniquement à la 1ère tentative** (`attempt_count <= 1`, les retries dunning Stripe ne re-spamment pas) ; ne downgrade pas (Stripe gère les retries, `customer.subscription.deleted` gère le downgrade final). Note : `invoice.payment_failed` doit être activé dans la config webhook Stripe (fait 2026-06-11, migration appliquée). Côté UI, le dashboard (`/dashboard`) lit `payment_past_due` et affiche une bannière rouge bilingue (clés i18n `dashboard.payment_issue_*`) avec lien vers `/dashboard/settings`.

  **Test du webhook en local via Stripe CLI** : procédure complète et résultats archivés dans
  `docs/SESSIONS.md`. Niveau 1 validé (signature vérifiée fail-closed, 200, zéro write) ; niveau 2
  non exécuté, il exigerait une `sk_test` et un profil de test dédié.

**Idempotence webhook (2026-05-22)** : protection contre les retries Stripe.
- Abonnement : compare `stripe_subscription_id` en DB avant d'agir — skip si déjà activé.
- Achat livre : vérifie `events_log` via `metadata @> { stripe_event_id }` avant d'incrémenter les crédits ; insère une trace après succès.
- `subscription.updated` : loggé dans `events_log` (plan change + cancellation) depuis Round 2.
- `invoice.payment_succeeded` : idem — vérifie `events_log` par `stripe_event_id` avant `increment_book_credits`.
- Tous les événements loggent le Stripe event ID dès réception (`[webhook] event: evt_xxx …`).

**Book credits Print — source unique (2026-05-28)** : `invoice.payment_succeeded` est la seule source d'attribution des crédits livre pour les abonnés Print. `checkout.session.completed` n'attribue plus de crédit Print (race condition corrigée 2026-06-01). Conditions : `billing_reason === "subscription_create"` (1ère souscription) OU `"subscription_cycle"` (renouvellement) + price ID Print annuel (EUR/USD). Note : `invoice.payment_succeeded` doit être activé dans la config webhook Stripe.

**Prix livre dynamique (2026-06-01)** : `src/lib/gelato-pricing.ts` — `calcGelatoBookPrice(pageCount)` : `15.46 + max(0, (pages-30)/2) × 0.395 + 12€ marge fixe`. Même valeur EUR/USD. Utilisé par `/api/stripe/book-checkout` (achat one-time avec `price_data` Stripe) et affiché dans les encarts upsell de la page order.

---

## Architecture

**Next.js 14 App Router** — toutes les pages dans `src/app/`. Toutes les pages dashboard sont `"use client"` ; elles fetchent les données dans `useEffect` via le client Supabase browser.

### Supabase — trois clients

- `src/lib/supabase/client.ts` — client browser, utilisé dans toutes les pages `"use client"`
- `src/lib/supabase/server.ts` — client serveur (anon key + cookie auth), utilisé dans les routes API et le middleware
- `getServiceSupabase()` dans `src/lib/supabase/service.ts` (ré-exporté par `src/lib/plan.ts` pour compat) — client service role (bypass RLS) — utilisé dans le webhook Stripe, les cron jobs, gelato/order, preview-pdf (GET), les pages publiques `/pets/[id]` et `/memorial/[id]` (toutes deux restreintes aux animaux décédés). `service.ts` n'a aucune dépendance server-only → importable en edge runtime.

**Règle** : ne jamais instancier `createClient` depuis `@supabase/supabase-js` directement dans une route. Importer `getServiceSupabase()` (`@/lib/supabase/service` ou `@/lib/plan`) pour le service role. Pour Stripe, importer le singleton `stripe` de `@/lib/stripe` (jamais `new Stripe(...)` en ligne) ; pour le `PRICE_MAP` (digital/print_annual → price ID par devise) et `resolveSubscriptionId()`, importer depuis `@/lib/stripe-helpers` — source unique, ne pas redéfinir un mapping price ID → plan ailleurs que `priceIdToPlan()` (`plan-guards.ts`). Pour les regex UUID/email et redirects relatifs sûrs, utiliser `@/lib/validation`.

`src/middleware.ts` fait **quatre choses**, pas seulement l'auth — à connaître avant d'y toucher :
1. Auth guard : non authentifié sur `/dashboard/*` → redirect `/auth/login` ; authentifié sur `/auth/login` ou `/auth/signup` → redirect `/dashboard`.
2. Legacy redirect : `/app` et `/app/*` → `/dashboard` (authentifié) ou `/auth/login` (non authentifié).
3. **Fail-closed** : si `supabase.auth.getUser()` throw, les routes `/dashboard/*` redirigent vers `/auth/login` par défaut (on ne sait pas si l'utilisateur est authentifié → on refuse) ; les autres routes passent (`NextResponse.next`).
4. Pose le header `x-pathname` sur **toute** requête matchée (y compris `/fr/:path*`) — **c'est ce qui permet au root `layout.tsx` de fixer `<html lang="fr"|"en">`**. Le supprimer casse le `lang` HTML sans erreur visible ailleurs.

`matcher` actuel : `/app`, `/app/:path*`, `/dashboard/:path*`, `/auth/:path*`, `/fr/:path*`, `/fr`, `/invite/:path*`. Étendre le matcher à une nouvelle route = vérifier qu'elle a bien besoin d'une de ces 4 responsabilités (sinon le middleware ajoute une requête Supabase inutile sur chaque hit).

### i18n

Messages dans `messages/en.json` et `messages/fr.json`. `src/lib/i18n.ts` charge les deux au build. `src/hooks/useLocale.ts` détecte `navigator.language` côté client et expose `{ t, locale }` — **plus de cookie locale, plus de `setLocale`**.

- FR si `navigator.language.startsWith("fr")`, EN sinon — détection automatique, pas de switcher manuel.
- `CookieBanner` suit la même logique pour afficher FR ou EN automatiquement.
- L'ancien mécanisme cookie (`/api/locale` + `LanguageSwitcher.tsx`) a été entièrement supprimé — ne pas le réintroduire.

**Règle** : toujours ajouter les nouvelles clés dans les **deux** fichiers JSON.

**Architecture i18n hybride (Session 57) — server pour le marketing, client pour l'app :**
- **Pages marketing** (`/`, `/fr`, `/gift`, `/fr/gift`) : langue **figée par URL**, jamais par `navigator.language`. Un seul composant client locale-aware par page (`home-client.tsx` = `<Home locale>`, `gift/gift-client.tsx` = `<GiftContent locale>`) piloté par une prop `locale`, textes lus via `getTranslations(locale)`. Les routes serveur (`page.tsx`) exportent metadata + JSON-LD et rendent le composant avec `locale="en"` ou `"fr"`. Le FR est dans le HTML source (SSR sous `force-dynamic`), donc crawlable. **Plus de `useLocale` sur ces pages.**
- **Dashboard + autres pages publiques** (contact, redeem, unsubscribe, memorial, legal…) : gardent `useLocale()` (détection `navigator.language`). `PublicNav`/`PublicFooter` acceptent une prop `locale` **optionnelle** : fournie → déterministe (marketing), absente → `useLocale` (le reste).
- **Switch de langue** : lien crawlable `<a href>` dans le footer marketing (`PublicFooter localeSwitch={{ href, label }}`), pas de toggle client. `/`↔`/fr`, `/gift`↔`/fr/gift`.
- **Jamais de redirect auto basé sur `Accept-Language`** (chaque URL = une langue stable pour les crawlers). Un bandeau de suggestion client (lien réel `<a>`, dismissible) reste acceptable mais ne modifie jamais le contenu rendu.
- **Devise ≠ langue** : `getCurrencyFromCountry()` (géoloc `x-vercel-ip-country`) reste indépendant de la locale. Un visiteur FR sur `/` voit la page EN avec prix EUR — voulu.

### Dashboard layout & navigation

`src/app/dashboard/layout.tsx` rend `<DashboardNav>` (sidebar fixe desktop, header + drawer mobile) + `{children}`.

`src/components/DashboardNav.tsx` — composant central de navigation :
- **PetSelector** : liste tous les pets + "Tous mes animaux". Persiste le dernier pet visité dans `localStorage` (`lastPetId`)
- `showAll` state : `true` quand on est sur `/dashboard` (vue globale)
- Navigation tab-aware : les liens sidebar utilisent `?tab=journal|stories|milestones`
- Le switch de pet préserve l'onglet actif
- **Sidebar desktop** (≥768px) : sélecteur animal → nav 6 items → bouton Suggestion → section secondaire (Paramètres, Déconnexion)
- **Mobile** : header fixe en haut (burger gauche + logo centré) + drawer slide-in depuis la gauche contenant PetSelector + 6 items nav + Suggestion + Paramètres + Déconnexion. Pas de bottom nav ni de FAB.
- Drawer : `aria-hidden` + `inert` quand fermé, `body.overflow = hidden` quand ouvert, `padding safe-area-inset-top` pour les notches, tap targets 44×44px sur burger et bouton X.

### Labels de navigation (nommage définitif)

| Ancien | Actuel |
|---|---|
| Commander | Livre |
| Histoires | Histoires IA |

### Pet page tabs

`/dashboard/pets/[id]` utilise `?tab=journal|stories|milestones` (pas de tab = journal).  
Le tab est lu depuis `useSearchParams()` — **dérivé de l'URL, pas un state local** (correction importante : un state local avec `useEffect` vide ne se mettait pas à jour sur navigation client-side).

---

## Routes API

| Route | Rôle |
|---|---|
| `/api/generate` | Génération histoire IA — gate plan server-side via `getUserPlan()` + rate limit 10/jour/user (UTC) |
| `/api/stripe/checkout` | Checkout abonnement (accepte `{ plan: "digital" \| "print_annual" }`) |
| `/api/stripe/book-checkout` | Achat livre one-time — prix dynamique via `calcGelatoBookPrice(pageCount)` + `price_data` Stripe, accepte `{ petId, pageCount }` |
| `/api/stripe/webhook` | Webhook Stripe (doit utiliser le client Supabase service role) |
| `/api/gelato/order` | Envoi commande à Gelato — sauvegarde/met à jour `book_configs` (status→ordered) après succès, accepte `bookConfigId` optionnel |
| `/api/gelato/status/[orderId]` | Proxy statut commande Gelato — ownership vérifié via `book_configs.gelato_order_id` |
| `/api/book-configs` | GET (liste par petId) + POST (create/update, max 15 drafts) |
| `/api/book-configs/[id]` | DELETE (owner-only) |
| `/api/share-card` | Génération image PNG partage Instagram — edge runtime, auth session + ownership, `?story_id=&format=square\|story` |
| `/api/cron/monthly-story` | Auto-génération chapitre mensuel IA (actif) — voir règles d'éligibilité dans Conventions ; `maxDuration=60` (plan Vercel Hobby), réponse `{ processed, generated, skipped, failed, durationMs, monthKey }` |
| `/api/cron/weekly-reminder` | Rappels email via Resend |
| `/api/gift/create`, `/api/gift/redeem` | Flow carte cadeau |
| `/api/currency` | Retourne `{ currency: "EUR"\|"USD" }` via `x-vercel-ip-country` (le champ `country` a été supprimé — privacy) |
| `/api/book-pdf` | **Génération PDF réel** (200×200mm, `application/pdf`) — `GET` pour Gelato (token HMAC signé requis), `@react-pdf/renderer`, même params que `preview-pdf` |
| `/api/preview-pdf` | Preview PDF HTML — `POST` pour l'aperçu in-app (session utilisateur requise, vérifie ownership du pet). `GET` (anciennement pour Gelato) remplacé par `book-pdf` |
| `/api/events/book-preview` | Marque `book_preview_opened` dans `events_log` (unique par utilisateur et animal, un rejeu n'est pas une erreur) — session requise, propriétaire de l'animal uniquement |
| `/api/export-data` | Export RGPD — `GET` (session requise) retourne JSON avec toutes les données utilisateur : profil, pets, entrées, histoires, milestones, book_configs |

---

## Pages clés

| Route | Description |
|---|---|
| `/dashboard/pets/[id]` | Profil animal + journal (tabs: journal / histoires IA / étapes) |
| `/dashboard/pets/[id]/order` | Commande livre — bouton "Sauvegarder cette config" (brouillon), chargement config via `?configId=`, CTA redirige vers Stripe si `plan=print && book_credits=0` |
| `/dashboard/pets/[id]/books` | Historique livres & brouillons — liste `book_configs`, statut Gelato temps réel, tracking, reprendre/recommander/supprimer |
| `/pets/[id]` | Profil public animal |
| `/memorial/[id]` | Page mémorial publique ✅ — design dark, photo, message, histoires IA, OG meta |
| `/memorial` | Landing marketing publique « pet memorial book » (server component, ton sobre, palette cream+sage) — distincte des pages user `/memorial/[id]` |
| `/blog` | Index blog SEO (cluster « pet memory ») — cards des articles publiés, empty state si aucun |
| `/blog/[slug]` | Article : 1 `page.tsx` écrit à la main par slug, via `ArticleLayout` + JSON-LD Article |
| `/fr/blog` | Index blog FR — mêmes 12 articles, slugs traduits |
| `/fr/blog/[slug-fr]` | Article FR : `page.tsx` par slug FR, `ArticleLayout locale="fr"`, hreflang réciproque vers l'article EN |
| `/fr/memorial` | Landing mémorial FR, réutilise `getTranslations("fr").memorial_landing`, hreflang réciproque avec `/memorial` |
| `/gift` | Page cadeau |
| `/unsubscribe` | Désinscription emails (token) |

---

## Cron jobs (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/weekly-reminder", "schedule": "0 8 * * 1" },
    { "path": "/api/cron/monthly-story",   "schedule": "0 8 1 * *" },
    { "path": "/api/cron/on-this-day",     "schedule": "0 9 * * *" },
    { "path": "/api/cron/streak-alert",    "schedule": "0 17 * * *" },
    { "path": "/api/cron/birthday-check",  "schedule": "0 8 * * *" },
    { "path": "/api/cron/daily-prompts",     "schedule": "0 7 * * *" },
    { "path": "/api/cron/retention-emails", "schedule": "0 9 * * *" },
    { "path": "/api/cron/first-story-nudge", "schedule": "0 10 * * *" },
    { "path": "/api/cron/gift-deliveries",   "schedule": "0 6 * * *" }
  ]
}
```

Toutes les routes cron protégées par `Authorization: Bearer CRON_SECRET`.

Les 9 routes existent (`on-this-day`/`streak-alert`/`birthday-check` en session 24 ; `first-story-nudge` en session 58 ; `gift-deliveries` en session 68, elle envoie les cadeaux datés).

---

## Gelato — Configuration livre

```ts
productUid: "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver"
pageCount: 28   // OBLIGATOIRE — sans ça Gelato retourne BAD_REQUEST
currency: "USD"
```

**Pricing livre dynamique** : `calcGelatoBookPrice(pageCount)` dans `src/lib/gelato-pricing.ts`. COGS Gelato : `15.46 + max(0,(n-30)/2)×0.395`. Marge fixe : +12€/USD. Résultat passé par `Math.ceil` → prix minimum (28 pages) = **28€/$28** (pas 27,46 — le COGS brut est 27.46, le prix affiché/facturé est arrondi au-dessus). Cohérent avec le tableau des plans plus haut.

**pageCount** : calculé par `paginateBook()` dans `src/lib/book-pages.ts` (P1-3), seule source du
nombre de pages. Un chapitre par page, **2 photos orphelines par page** (plafond 30 pages, soit 60
photos), **8 étapes par page**, plus dédicace et hommages s'ils existent ; les pages blanches ne sont
plus que le complément final au multiple de 4, minimum 28. `gelato/order` et `book-pdf` doivent
déclarer et rendre exactement le même nombre (mêmes helpers : `collectOrphanPhotoUrls` pour les
photos non rattachées, `chunk` pour la pagination), sans quoi Gelato refuse le fichier. Seuil de
commande : `MIN_FILLED_PAGES_TO_ORDER` (14 pages **remplies**, pas 7 chapitres).

---

## Design system

Palette : « Design Context » en tête de fichier, les tokens `--ep-*` de `globals.css` sont la seule source.

### Typographie

- **Titres** : `Georgia, serif` (ou Playfair Display) — 400 & 600
- **Corps** : `'DM Sans', sans-serif` — 300 / 400 / 500
- Style éditorial et chaleureux — évoque le papier, la mémoire, le vivant

### Border-radius

- 8px → petits éléments (badges, inputs)
- 10–12px → nav items, dropdowns
- 14–16px → cartes moyennes
- 20px → grandes cartes
- 100px → pills, boutons principaux

### Règles de design

- Ne jamais partir dans une direction SaaS bleue générique
- Toujours conserver la palette beige/crème/marron/orange
- Border-radius généreux, ombres douces
- Tous les styles sont **inline** (`style={{}}`), pas de classes Tailwind
- Hover states via `onMouseEnter` / `onMouseLeave` handlers React
- Media queries dans `src/app/globals.css` (`.ep-sidebar`, `.ep-mobile-header`, `.ep-dashboard-main`) — `.ep-bottom-nav` et `.ep-fab` supprimés

---

## État actuel (résumé des fonctionnalités)

> Détail complet de chaque session/feature : [docs/SESSIONS.md](docs/SESSIONS.md)

**Journal** : entrées + photos (compression canvas), moods, tags, filtres année/mois, entrées antidatées, timeline par mois, limite 10 entrées plan free (trigger Postgres), journal partagé foyer (`pet_members`, invitations token 7j, max 5 membres).

**Histoires IA** : génération gated par plan (`getUserPlan`), rate limit 10/jour/user (count DB), client Anthropic unique `src/lib/anthropic.ts` (`callClaude`, `claude-sonnet-4-6`), prompts protégés injection (balises XML + `escapeXml`), cron mensuel auto, onboarding "origins", interview hebdo.

**Milestones** : détection auto à la création d'entrée (`src/lib/milestones.ts`), définitions extensibles en DB (`milestone_definitions`), fallback hardcodé.

**Livre imprimé** : page order avec personnalisations (5 thèmes couverture, titre custom, dédicace, sélection chapitres, filtre année, photo couverture custom, 4 layouts/chapitre), brouillons `book_configs` (max 15), aperçu HTML (`preview-pdf` POST session) + PDF réel Gelato (`book-pdf`, `@react-pdf/renderer`, token HMAC), commande Gelato (devise dynamique, pageCount calculé), crédits livre atomiques (RPC `try_consume_book_credit` verrou FOR UPDATE avant Gelato, `restore_book_credit` si échec), statut commande temps réel, historique/duplication/re-commande (`books`).

**Monétisation** : checkout + upgrade avec proration preview, webhook idempotent (dedup `events_log` par `stripe_event_id`), achat livre one-time à prix dynamique, flow cadeau complet (achat one-time → code promo → redeem avec coupon 100%, schedule si déjà abonné), factures, réactivation, changement de plan fin de période, gestion `payment_past_due` (bannière + email dunning 1ère tentative). Détail : « Plans & monétisation ».

**Emails** (Resend) : templates harmonisés `src/lib/email-templates.ts` (`baseLayout`), auth hook Supabase (Standard Webhooks, HMAC fail-closed), unsubscribe tokenisé, et 8 crons listés dans « Cron jobs ».

**Pages publiques** : profil animal `/pets/[id]`, mémorial `/memorial/[id]` (dark, OG meta, hommages modérés rate-limités), share card Instagram (`/api/share-card`, edge, PNG square/story). i18n hybride (marketing figé par URL, reste en `useLocale`) : voir « Architecture › i18n ».

**SEO / RGPD** : canonicals par page (relatives, résolues via `metadataBase`), `app/robots.ts` + `app/sitemap.ts` (routes metadata Next), noindex sur login/signup, metas dédiées gift/legal, homepage optimisée "ai pet journal" / "pet memory book" (title + H2 hero + H2 livre + CTA gift), JSON-LD homepage dans le server `page.tsx` : Organization + SoftwareApplication (sans aggregateRating — placeholders interdits) + FAQPage construit dynamiquement depuis `messages/en.json` `faq.q1..q6/a1..a6` (zéro drift schema/contenu), hreflang réciproque sur les 4 routes marketing (`/`↔`/fr`, `/gift`↔`/fr/gift`), cookie banner, export données JSON, suppression de compte complète. `aggregateRating` factice retiré partout (Session 57).

**Sécurité** : 13 rounds de review (détail dans docs/SESSIONS.md) — les règles qui en découlent sont codifiées dans « Conventions de code » ci-dessous. Un audit indépendant plus récent (2026-07-06, `docs/AUDIT_REPORT.md` + `docs/AUDIT_PLAN.md` + `docs/AUDIT_REPORT_QUALITY.md`) a trouvé 13 findings dont 1 CRITIQUE (RPC crédits-livre exposées à tout utilisateur authentifié, self-crediting possible) ; 12/13 corrigés le jour même, dont le critique via `revoke_book_credit_rpc_2026_07_06.sql`. **Avant tout nouveau round de sécurité, lire ces 3 fichiers** — ils documentent aussi les zones volontairement non auditées (composants client Z8, scripts one-shot).

**Qualité** : logs gatés (`src/lib/log.ts`, `DEBUG_LOGS=1`), rate-limit persistant Postgres (`checkRateLimitDb`), tests Vitest (plan guards, priceIdToPlan, paginateBook, parseStoryResponse), hook SessionStart `npm install`.

**Mesure** : GA4 + Meta Pixel, tous deux gatés au consentement cookie (`src/components/Trackers.tsx`, `src/lib/consent.ts`). Événements Pixel custom via `src/lib/pixel.ts` : `CompleteRegistration` (signup), `ViewContent` (landing). Les achats sont rapportés **côté serveur** depuis le webhook Stripe (`src/lib/analytics-server.ts`, spec P0-1), sans aucune donnée utilisateur : les identifiants exigés par GA4 et Meta sont dérivés de l'identifiant d'événement Stripe, donc uniques par achat et non rattachables à un compte. Dédup par `events_log` (`analytics_purchase`), envoi jamais bloquant, bloc ignoré si `GA_API_SECRET` et `META_CAPI_TOKEN` sont absents.

---

## Les six nombres du tunnel

Requête hebdomadaire à lancer dans l'éditeur SQL Supabase : `supabase/analytics/funnel.sql`
(jeu d'essai `funnel.fixture.sql`). Un nombre dont la définition bouge d'une semaine à l'autre
ne vaut rien, donc les définitions vivent ici et la requête s'y conforme, jamais l'inverse.

**Cohorte** = les comptes dont `profiles.created_at` tombe dans la fenêtre (début inclus, fin
exclue), hors `@yopmail.com`. Les cinq marches suivantes se mesurent **à ce jour, sans limite de
temps**, ce qui garde le même dénominateur d'un bout à l'autre du tunnel ; corollaire, une
fenêtre récente n'a pas fini de mûrir.

| Nombre | Définition exacte |
|---|---|
| `signups` | Comptes de la cohorte. C'est le dénominateur des cinq autres. |
| `with_pet` | Au moins une ligne `pets`. Un animal supprimé depuis ne compte plus. |
| `with_3_entries` | Au moins trois lignes `entries`, toutes dates confondues, tous animaux confondus. Trois entrées = le seuil d'éligibilité du chapitre mensuel, pas un chiffre rond arbitraire. |
| `with_story` | Au moins une ligne `stories`, **quel que soit son type** : une histoire générée par le cron mensuel compte comme une histoire demandée à la main. |
| `with_book_preview` | Au moins une ligne `events_log` de type `book_preview_opened`, posée par `POST /api/events/book-preview` quand l'aperçu s'ouvre. L'événement n'existe que depuis le 2026-09-03 : une fenêtre antérieure rend 0, ce n'est pas un bug. |
| `print_subscribers` | `profiles.plan = 'print'` **à l'instant de la requête**, pas au moment de la souscription. Un abonné de la cohorte qui a résilié depuis n'y est plus : ce nombre mesure le stock converti et survivant, pas le flux. |

---

## Conventions de code

### Ordre d'implémentation pour toute nouvelle feature

1. Lire `package.json` + fichiers de layout existants
2. Lire le schéma Supabase actuel
3. Proposer la migration SQL si nécessaire
4. Implémenter la logique métier
5. Implémenter l'UI en dernier

### Règles critiques

- Routes API dans `/app/api/`
- Webhook Stripe : `/api/stripe/webhook` — **ne jamais déplacer**
- Auth middleware : vérifier via Supabase server client uniquement
- Ne jamais supprimer un ancien Price ID Stripe avant que le nouveau soit testé en Live
- Tab actif dans la pet page : **lire depuis `useSearchParams()`**, jamais un `useState` avec `useEffect` vide (ne se met pas à jour sur navigation client-side)
- Toujours ajouter les nouvelles clés i18n dans `messages/en.json` ET `messages/fr.json`
- **Milestones** : utiliser `localTitle` directement dans l'affichage — ne pas découper par espaces pour retirer l'emoji (l'icône est rendue séparément via le champ `icon`)
- **Auth sécurité** : tout changement de mot de passe doit vérifier le mot de passe actuel via `signInWithPassword` avant `updateUser`
- **Devise** : utiliser `getCurrencyFromCountry` + `formatPrice` de `src/lib/currency.ts` pour tout affichage de prix. Ne jamais utiliser `isFR` comme proxy de devise — langue ≠ pays. Les routes Stripe lisent `x-vercel-ip-country` (checkout) ou `subscription.currency` (upgrade).
- **Webhooks entrants** (Supabase auth hook) : Supabase suit le spec **Standard Webhooks**. Headers à lire : `webhook-id`, `webhook-timestamp`, `webhook-signature`. Contenu signé : `{id}.{timestamp}.{body}`. Secret : strip le préfixe `v1,whsec_` (ou `v1,` ou `whsec_`) puis `Buffer.from(rest, "base64")` comme clé HMAC-SHA256. Signature = `v1,<base64_hmac>`. Fail-closed : si `SUPABASE_HOOK_SECRET` absent → 401 immédiat. Comparer avec `timingSafeEqual` sur les buffers. Voir `src/app/api/emails/auth-hook/route.ts` pour l'implémentation de référence.
- **Confirmation email** (`/auth/confirm`, `type=signup|recovery|email_change`) : vérifie `token_hash` côté serveur via `supabase.auth.verifyOtp({ type })` — jamais via le `confirmation_url` PKCE fourni par Supabase, qui exige le `code_verifier` du navigateur d'origine (absent si le lien est ouvert ailleurs, cause du bug production du 2026-08-31, voir Session 64). `email_change` a en plus un bug distinct (token vide, voir Session 64) : "Secure email change" étant désactivé, `token_hash_new` arrive en chaîne vide plutôt qu'absent → toujours utiliser `||` pour retomber sur `token_hash`, jamais `??`. Les anciennes routes `confirm-signup`/`change-email`/`reset-password` (auth Bearer simple, jamais appelées depuis la bascule vers `auth-hook`) ont été supprimées à cette occasion.
- **`/api/generate`** : ne jamais faire confiance aux données du body client (petName, species, bio, entries). Re-fetcher depuis la DB après vérification de l'ownership du pet.
- **`/api/gelato/order`** : toujours filtrer les updates de stories par `user_id` (même avec service role). Consommer les crédits via `try_consume_book_credit` **avant** l'appel Gelato, et restaurer via `restore_book_credit` en cas d'échec.
- **Prix Stripe jamais depuis le client** : `/api/stripe/book-checkout` calculait le prix depuis un `pageCount` envoyé par le client (juste validé `28-500`), et `/api/gelato/order` ne comparait jamais le livre commandé au montant payé : n'importe qui pouvait payer le minimum et recevoir un livre à la taille réelle de son contenu (faille Session 64, PR #115). Le dispositif actuel tient en trois morceaux **indissociables** : (1) le checkout accepte une *déclaration* (`storyIds`, `year`) qui ne sert qu'à **sélectionner des lignes en base**, jamais à fixer un prix, et retombe sur le pire cas si elle est absente ou invalide ; (2) le nombre de pages facturé part dans `metadata.page_count` de la session Stripe et le webhook l'inscrit dans la ligne `events_log` `stripe_book_checkout` ; (3) `gelato/order` relit ces achats et **refuse** (`book_larger_than_paid`, 403, avant toute consommation de crédit) un livre plus grand que les pages payées, puis marque l'achat consommé. Le plafond ne s'applique que si **tous** les crédits détenus viennent d'un achat, sinon un abonné Print serait bridé sur son livre inclus, qui n'a pas de prix à la page. Règle générale : **tout montant facturé doit être recalculé côté serveur à partir de données de confiance** — et si le prix dépend d'une déclaration du client, il faut un plafond côté fulfillment, sans quoi la faille revient.
- **`/api/preview-pdf`** : l'accès GET (Gelato) nécessite un token HMAC signé généré par `gelato/order`. L'accès POST (in-app) nécessite une session + vérification de l'ownership du pet. Ne jamais exposer le contenu du livre sans authentification. Les URLs insérées dans du CSS (`url('...')`) doivent être passées par `safeCssUrl()` qui échappe les apostrophes.
- **Client vs server-only imports** : ne jamais faire importer, par un module utilisé dans un composant `"use client"`, un fichier dont la chaîne d'imports statique touche `supabase/server.ts` / `next/headers` (ex. `plan.ts`, `book.ts` avant son split). Casse le build (« importing a component that needs next/headers ... not supported in pages/ »). Pattern de fix : extraire la logique pure (zéro import) dans un module frère (`book-pages.ts`, `plan-guards.ts`) et faire réexporter par l'original pour compat. Un `import type { ... }` est toujours sûr (effacé à la compilation) — seuls les imports de valeurs/fonctions posent problème.
- **Helpers partagés** : pour escaper du HTML → `escapeHtml()` dans `src/lib/html.ts`. Pour escaper du XML dans les prompts IA → `escapeXml()` dans `src/lib/html.ts`. Pour détecter la locale d'un profil → `src/lib/locale.ts` (utilise `getServiceSupabase()` — pas de session requise). Pour le calcul du nombre de pages → `src/lib/book.ts`. Pour les tokens PDF → `src/lib/pdf-token.ts`. Pour mapper les erreurs Supabase Auth → messages FR/EN → `src/lib/auth-errors.ts` (`getSignupError`). Pour `verifyBearer` (Bearer token constant-time) et `validateRedirectTo` (open redirect guard) → `src/lib/auth.ts`. Ne pas réimplémenter ces fonctions inline.
- **Rate limiting** : le rate limiter in-memory (`src/lib/rate-limit.ts`) n'est PAS fiable sur Vercel serverless (cold start = reset, pas de partage entre instances). Pour les limites critiques, utiliser un count DB (voir `/api/generate`) ou Upstash Redis.
- **Comparaisons de secrets** : toujours utiliser `timingSafeEqual` de `node:crypto` pour comparer des tokens/secrets (Bearer, HMAC, etc.). Ne jamais utiliser `===` pour ces comparaisons — vulnérable aux attaques par timing.
- **Validation dates** : les paramètres `periodStart`/`periodEnd` reçus du client doivent être validés comme `YYYY-MM-DD` avant usage comme filtre DB.
- **Cookies** : tout cookie sensible posé via API doit avoir `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`. (Il n'existe actuellement aucun cookie de préférence côté app — la locale est détectée via `navigator.language`, sans cookie.)
- **Prompts IA avec données utilisateur** : isoler les données dans des balises XML (`<pet_details>`, `<journal_entries>`) pour prévenir les injections de prompt ET appliquer `escapeXml()` sur chaque valeur insérée dans les balises. Voir `cron/monthly-story` et `/api/generate` pour le pattern.
- **Cron chapitre mensuel** (`/api/cron/monthly-story`, actif — sched `0 8 1 * *`) : génère le chapitre du **mois écoulé** (le cron fire le 1er). Éligibilité d'un pet = **TOUTES** : `deceased_at IS NULL` + owner plan ∈ `digital`/`print` (jamais free/book_only) + **≥3 entrées** avec `entry_date` dans le mois écoulé + **aucune story existante pour (pet, month_key)**. Idempotence garantie au niveau DB par l'index unique `stories_pet_id_story_type_month_key_unique` (+ gestion `23505` dans `generateAndSaveStory`) → un retry Vercel ne produit **aucun doublon**. **`email_reminders` n'est PAS un critère d'éligibilité** : un payant qui a coupé les emails obtient quand même son chapitre in-app ; seul l'email de notification respecte l'opt-out. Génération via le service partagé `generateAndSaveStory` (`src/lib/story.ts`, même prompt/modèle que la génération manuelle — ne jamais dupliquer la logique IA). try/catch **par pet** (une erreur loggue et continue, ne fait pas échouer le batch). `maxDuration=60` (plafond du plan Vercel Hobby actuel — repasser à 300 seulement après upgrade Pro confirmé, et mettre à jour cette ligne en même temps que le code).
- **Réponses API erreurs** : ne jamais retourner des détails d'erreurs internes (Stripe, Gelato, Anthropic) au client — les logger côté serveur et retourner uniquement un message générique.
- **Copie visible utilisateur** : pas de caractère flèche (`→`, `->`) dans les textes affichés (titres, boutons, emails, i18n) — convention établie session 58 (commit `cc72a8b`), appliquée rétroactivement à tout le texte existant. Les flèches restent acceptables dans le code/commentaires/CLAUDE.md.
- **UUID validation** : toujours valider `petId`, `storyId` et tout autre identifiant reçu du client via `UUID_REGEX` avant usage en DB ou en URL. La route `gelato/order` et `preview-pdf` font référence.
- **`/auth/callback` redirect** : `next` doit commencer par `/` ET ne pas commencer par `//` pour bloquer les redirects protocol-relative vers des domaines externes.
- **SEO / metadata** : ne jamais mettre de `alternates.canonical` ni `openGraph.url` dans le root layout — hérités par toutes les pages (bug duplicata homepage, corrigé session 56). Canonicals **relatives** (`/gift`), résolues via `metadataBase`. Le merge metadata Next est **shallow par clé top-level** : une page qui définit `openGraph` remplace **tout** l'objet og du layout → toujours fournir un og complet (title/url/siteName/type) quand on override. Pages `"use client"` : metadata via `layout.tsx` de segment (gift, auth) ou wrapper server `page.tsx` + composant client séparé (homepage → `home-client.tsx`). Jamais de `public/robots.txt` — conflit avec `app/robots.ts`.

---

## Definition of Done

Une tâche (feature, fix, refacto) n'est **pas terminée** tant que les checks ci-dessous n'ont pas tous été faits — indépendamment de qui l'écrit.

### Checks à exécuter avant de déclarer un travail fini

1. `npx tsc --noEmit` → zéro erreur.
2. `npm test` → tous les tests verts, pas seulement ceux du fichier touché (couvre les guards de plan, `priceIdToPlan`, `paginateBook`, `parseStoryResponse`, `evaluateFirstStoryNudge`).
3. `npm run build` avant tout push sur `main` ou toute PR — attrape les erreurs que `tsc --noEmit` seul ne voit pas (imports client/server incompatibles, edge runtime).
4. Nouvelles clés i18n → présentes dans `messages/en.json` **et** `messages/fr.json` (jamais une seule).
5. Route API nouvelle/modifiée → ownership vérifié (le `petId`/`storyId` du body/params appartient à l'utilisateur authentifié), identifiants validés via `UUID_REGEX`, aucun détail d'erreur interne (Stripe/Gelato/Anthropic) renvoyé au client.
6. Migration SQL nouvelle → `IF NOT EXISTS` / bloc `DO $$ … $$` (idempotente, un ré-run ne doit rien casser), nommée `<description>_YYYY_MM_DD.sql`.
7. Comparaison de secret/token → `timingSafeEqual`, jamais `===`.
8. Texte visible utilisateur nouveau/modifié → pas de caractère flèche, i18n dans les 2 fichiers, ton conforme à DESIGN.md (pas de SaaS bleu générique, Georgia pour l'émotionnel, tokens `--ep-*` plutôt que hex inline hors exceptions listées plus haut).
9. Changement UI/frontend → `npm run dev`, ouvrir la page dans un navigateur, tester le golden path + au moins un edge case, avant de dire que c'est fait. Si l'environnement ne permet pas de driver un navigateur, le dire explicitement plutôt que de prétendre avoir vérifié visuellement.
10. CLAUDE.md mis à jour si la tâche a changé une convention, un schéma, une route, une variable d'env, ou le nombre de tests/migrations — voir « Instructions pour Claude » en tête de fichier.

### Zones à ne jamais casser silencieusement

Un bug ici est soit un bug financier, soit un doublon visible côté client — vérifier explicitement qu'aucune régression n'a été introduite :
- Guards de plan (`canAddEntry` / `canGenerateStory` / `canOrderBook`) et leur exclusion des stories `origins`/`birthday` du quota.
- Idempotence webhook Stripe (dedup `events_log` par `stripe_event_id`) et source unique des book credits Print (`invoice.payment_succeeded`). Plusieurs lignes `events_log` portent désormais le **même** `stripe_event_id` (le crédit livre et l'événement d'achat serveur) : toute recherche de dedup doit filtrer sur `event_type` en plus, sans quoi une ligne d'analytics fait passer un crédit livre pour déjà attribué.
- Cohérence `pageCount` entre `gelato/order` et `book-pdf` : les deux passent par `paginateBook` et `collectOrphanPhotoUrls`, un écart fait refuser le fichier par Gelato alors que le crédit est déjà consommé. Cohérence du prix livre (`calcGelatoBookPrice`) avec le tableau des plans, et **le pire cas affiché sur la page order doit rester celui que `stripe/book-checkout` facture**.
- `x-pathname` posé par `src/middleware.ts` (utilisé par le root layout pour `<html lang>`).

---

## Checklist avant mise en production

Tout est coché sauf un point (le détail des items faits est archivé dans `docs/SESSIONS.md`) :

- [ ] **Tester le webhook Stripe en mode Live avec un vrai paiement** — la page de paiement est
  validée depuis le 2026-07-07, l'activation du plan **après** un paiement réel ne l'est toujours
  pas.

---

## Contexte marché

Cible : pet parents US/UK, très attachés émotionnellement. Différenciateur : seule app combinant journal IA et livre imprimé physique (11Pets, PetNoter et DogNote n'impriment rien). Acquisition : Reddit, X, groupes Facebook de pet parents, Product Hunt, validation organique avant toute publicité payante. Positionnement et principes produit détaillés : `PRODUCT.md`.

---

---

## Optimisation & dette technique

Backlog numéroté, ouvert par l'audit Pareto du 2026-06-18 puis alimenté session après session.
**Clos : #1, #2, #3, #5, #6, #7, #9, #10, #11, #12, #13, #14, #15, #16, #17, #18, #19, #20** — cause,
fix et vérification de chacun dans `docs/SESSIONS.md` → « Backlog dette technique, items clos ».

**Ouvert :**

- **#4 Rendu statique CDN de la landing** — bloqué par construction : le root `layout.tsx` lit
  `headers()` (`x-pathname`) uniquement pour fixer `<html lang>`, ce qui force **tout** le site en
  dynamique. Fix = restructuration en `/[locale]/`, avec un risque SEO réel sur le hreflang.
- **#8 Dashboards client → Server Components** — ~10 pages font `getUser()` + `Promise.all` dans un
  `useEffect` (waterfall, requêtes exposées côté client). Gros blast-radius, gain utilisateur faible.
**Ne pas re-tenter — #2 `select("*")` → colonnes explicites** : analysé, aucun gain réel. Les
occurrences restantes sont soit `select("*", { count, head: true })` (zéro ligne transférée), soit
des selects dont toutes les colonnes servent. Le seul candidat cassait le type `Entry`.

*Dernière mise à jour : 2026-09-02 (Session 68 : #12, #19 et #20 clos, restent #4 et #8)*

---

## Historique des sessions

Historique complet : **[docs/SESSIONS.md](docs/SESSIONS.md)**. Seules les 2 dernières sessions restent ici, à chaque nouvelle session déplacer la plus ancienne vers l'archive.

### ✅ Session 68 — Backlog vidé, onglet journal extrait, chantier emails (2026-09-02)

Backlog #19, #20 et #12(b) clos : 85 clés i18n mortes retirées, `stripe/cancel` libère le schedule
avant de poser `cancel_at_period_end`. Phase 2b de la découpe (PR #136) : `useEntryComposer` puis
`JournalTab`, `pets/[id]/page.tsx` de 1035 à 764 lignes. Emails en trois lots (PR #137 à #139) :
`px`, version texte, `List-Unsubscribe`, visuels PNG, registre FR vouvoyé tenu par un test. Cadeaux
datés (PR #140) : Resend plafonne sa planification à 30 jours, d'où `gift_deliveries` et son cron.
Détail complet dans `docs/SESSIONS.md`.

### ✅ Session 69 — Chantier Print, phases 0 et 1 (2026-09-03)

Cinq specs, cinq PR empilées ([#145](https://github.com/CookServices/everypaw/pull/145) à
[#149](https://github.com/CookServices/everypaw/pull/149)). Détail dans les PR, seuls les pièges
durables sont ici.

**P0-1** : `src/lib/analytics-server.ts` rapporte souscriptions, renouvellements et achats de livre à
GA4 et Meta depuis le webhook, sans donnée utilisateur. Les abonnements partent de
`invoice.payment_succeeded`, pas de `checkout.session.completed` qui fire pour le même achat, et
au-dessus du gate Print, sinon une facture Digital `return` avant d'être comptée. Piège : le dedup du
crédit livre cherchait `events_log` par `stripe_event_id` sans filtrer `event_type`.

**P0-2** : `supabase/analytics/funnel.sql`, définitions ci-dessus, validé sur un Postgres jetable via
`funnel.fixture.sql`.

**P1-1** : `BookPreviewCard` en tête de l'onglet Histoires, aperçu ouvert sur tous les plans,
commande fermée avec son motif en plan gratuit. `CoverArt` extrait de `BookCover` plutôt que
redessiné. `POST /api/events/book-preview` pose l'événement qui remplace l'approximation de P0-2.

**P1-2** : `src/lib/story-backfill.ts` liste les mois ayant trois entrées et aucun chapitre qui
chevauche, `BackfillCard` les génère un par un. Séquentiel obligatoire, `/api/generate` compte les
générations du jour ; le plafond de dix est une fin normale. Le mois en cours reste au cron.

**P1-3** : `paginateBook` remplace `calcPageCount` et devient la source unique des six appelants.
Photos non rattachées 2 par page (plafond 30 pages), étapes 8 par page, pages blanches réduites au
complément final, seuil de commande passé de 7 chapitres à 14 pages remplies. Le pire cas facturé
par `stripe/book-checkout` compte désormais photos et étapes, et reste celui qu'affiche la page
order. Invariant testé sur trois compositions : pages déclarées = pages rendues. Dans la foulée, le
prix d'un livre supplémentaire est passé du pire cas au prix de la **sélection réellement commandée**
(jusqu'à 5 € d'écart depuis que les photos pèsent des pages), ce qui a imposé le plafond en trois
morceaux décrit dans « Prix Stripe jamais depuis le client » et la survie de la sélection à la
redirection Stripe (`ep_order_<id>_sel` en sessionStorage, sans quoi la commande automatique du
retour repartait sur tous les chapitres et se faisait refuser).

**P2-1, campagne cadeau de fin d'année** : `isGiftCampaignActive` (`lib/gift-campaign.ts`, pur,
récurrent du 15 novembre au 24 décembre) pilote `GiftCampaignCard` sur le tableau de bord, en plan
gratuit seulement. Dates en dur dans le module et non en variable d'environnement : l'encart doit
s'éteindre sans déploiement, et une variable Vercel est figée au build de toute façon. Les six
articles cadeaux (trois EN, trois FR) renvoient enfin vers `/gift`, qu'aucun ne liait. La mise en
file d'un cadeau daté, deuxième critère d'acceptation, est désormais couverte par un test de route.

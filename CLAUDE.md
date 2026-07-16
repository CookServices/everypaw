# CLAUDE.md — Everypaw

> Fichier de contexte projet pour Claude Code. Maintenu à la racine du repo.
> Objectif : un agent qui n'a **que ce fichier** doit pouvoir travailler au niveau attendu, sans connaissance implicite du projet.

---

## Instructions pour Claude

### En début de tâche (obligatoire)

1. Lire `package.json` et les fichiers que tu vas toucher **avant** de modifier quoi que ce soit.
2. Avant d'écrire un helper (escape, validation, auth, formatting…), vérifier qu'il n'existe pas déjà : `grep` dans `src/lib/` d'abord. La liste des helpers canoniques est dans « Conventions de code › Helpers partagés ».
3. Pour toute nouvelle feature, suivre l'ordre : schéma DB → migration SQL → logique métier (`src/lib/`) → route API → UI. Jamais l'UI d'abord.
4. Pour tout travail UI, lire d'abord `PRODUCT.md` + `DESIGN.md` (voir « Design Context »).

### Definition of Done — checks avant de déclarer un travail terminé

Un changement n'est **pas fini** tant que tout ceci n'est pas vrai :

| # | Check | Commande / critère |
|---|---|---|
| 1 | Type-check vert | `npx tsc --noEmit` — zéro erreur |
| 2 | Tests unitaires verts | `npm test` — actuellement 21 tests, aucun ne doit casser |
| 3 | Build vert si le changement est structurel | `npm run build` obligatoire si : nouvelle route/page, changement de chaîne d'imports (risque client/server, voir règle dédiée), changement metadata/SEO, nouveau package |
| 4 | i18n complet | Toute nouvelle clé existe dans `messages/en.json` **ET** `messages/fr.json` |
| 5 | Migration livrée ET signalée | Fichier dans `supabase/migrations/`, idempotent (`IF NOT EXISTS`, `DO $$`), et **dire explicitement à l'utilisateur qu'il doit l'exécuter à la main dans Supabase** — rien n'applique les migrations automatiquement |
| 6 | Sécurité de route respectée | Toute nouvelle route API suit la « Checklist nouvelle route API » ci-dessous |
| 7 | Logique pure testée | Toute nouvelle fonction pure dans `src/lib/` avec de la logique non triviale a un test dans `src/lib/<module>.test.ts` |
| 8 | Pas de vérification navigateur possible en sandbox ? Le dire | Si le test manuel nécessite un vrai compte / Stripe live / emails, l'écrire explicitement dans le résumé (« non testé en navigateur, à valider : … ») au lieu de laisser croire que c'est validé |

**Ce qui ne compte PAS comme vérification** : « le code a l'air correct », un build lancé mais pas terminé, un test manuel non fait mais supposé passer.

### En fin de session

Si des décisions importantes ont été prises ou du code significatif produit :

1. Ajouter une entrée dans « Historique des sessions » (en bas) et déplacer la plus ancienne des 2 vers `docs/SESSIONS.md` — CLAUDE.md ne garde que les 2 dernières.
2. Mettre à jour « État actuel » si une fonctionnalité majeure a changé.
3. Codifier les décisions d'architecture dans « Conventions de code » (une règle = une ligne actionnable, pas un récit).
4. Mettre à jour la date de dernière session (fin de section « Optimisation & dette technique »).

Ne pas demander confirmation — le faire directement avant de clore. Garder ce fichier **< 700 lignes** : tout historique détaillé va dans `docs/SESSIONS.md`.

### Git & déploiement — règles de travail

- **`git push` sur `main` = déploiement production immédiat** (Vercel auto-deploy, Stripe en mode Live, vrais clients). Pas d'environnement de staging.
- Pour tout changement risqué (paiements, webhook, auth, migrations) : travailler sur une branche + PR, ne merger qu'après review.
- Ne jamais committer `.env.local`, ni aucune clé/secret.
- Messages de commit : préfixe conventionnel (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`), impératif, en anglais (convention observée dans l'historique).

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
- **`DESIGN.md`** — système visuel : North Star « The Hearthside Journal ». Paire Georgia (display) + DM Sans (body), boutons pill, ombres cocoa chaudes.
- **`.impeccable/design.json`** — sidecar : rampes tonales, tokens ombres/motion, snippets composants.

Règles clés : terracotta = seul accent (One Voice) · texte émotionnel en Georgia italique (Serif-for-Soul) · body DM Sans 300 mais ≥4.5:1 contraste (Contrast Floor) · ombres toujours cocoa (`rgba(61,43,31,…)`), jamais grises (Warm-Shadow) · pas d'eyebrow uppercase tracked au-dessus des sections (la hiérarchie passe par Georgia).

### Tokens CSS (`globals.css` `:root`) — utiliser `var(--ep-*)`, jamais de hex inline

Source de vérité : le bloc `:root` de `src/app/globals.css`. Tokens disponibles :

- **Couleurs base** : `--ep-bg` `#F7F2EA` (fond) · `--ep-bg-card` `#FDFAF5` (cartes/sidebar) · `--ep-brand` `#C8813A` (terracotta, accent/CTA) · `--ep-brand-dark` `#B5712E` (hover) · `--ep-text` `#3D2B1F` (ink cocoa) · `--ep-text-muted` `#7A5C44` · `--ep-text-faint` `#9A8070` (décor seulement — échoue le contraste body) · `--ep-border` `rgba(61,43,31,.1)`.
- **Erreur** : `--ep-error-bg` `#FEF2F2` · `--ep-error-border` `#FCA5A5` · `--ep-error-ink` `#991B1B` · `--ep-alert` `#A32D2D`.
- **Statut commande Gelato** : `--ep-status-print` `#5880B8` (imprimé/transit) · `--ep-status-ship` `#6A9E78` (expédié/livré) · `--ep-status-ship-ink` `#3A6A48`.
- **Mémorial** : `--ep-memorial` `#8B6B4A`.
- **Radius** : `--ep-radius-sm` 8px (badges, inputs) · `--ep-radius-md` 14px (cartes moyennes) · `--ep-radius-lg` 20px (grandes cartes) · `--ep-radius-pill` 100px (boutons, pills).
- **Ombres/motion** : `--ep-shadow-sm/md/lg` (toutes cocoa) · `--ep-transition` 150ms ease.

**Exception** (hex inline tolérés) : palettes produit — les 5 thèmes de couverture livre (order), couleurs mood/milestone (pets), ombres `rgba(0,0,0,…)`. Ce sont des données design, pas des tokens. Le vert sage `#6B7B5E` (accents ponctuels, landing mémorial) est aussi une donnée design, pas un token.

### Règles d'implémentation UI

- Tous les styles sont **inline** (`style={{}}`) — Tailwind est installé mais **non utilisé** ; ne pas introduire de classes Tailwind.
- Hover states via `onMouseEnter` / `onMouseLeave` (handlers React), pas de `:hover` CSS sauf dans `globals.css`.
- Media queries : uniquement dans `src/app/globals.css` via classes `.ep-*` (`.ep-sidebar`, `.ep-mobile-header`, `.ep-dashboard-main`).
- Progress bars animées : `transform: scaleX(…)`, jamais `width` (perf).
- Titres : `Georgia, serif` (400 & 600). Corps : `'DM Sans', sans-serif` (300/400/500). Ne jamais partir dans une direction SaaS bleue générique.

### Surfaces passées à la chaîne impeccable

Landing hero (`/`+`/fr`), `/dashboard`, et les 5 pages animal (`pets/[id]` Journal/Histoires/Étapes, `order` Livre, `books` Bibliothèque). Skill `/impeccable <command>` pour critique/audit/polish/live. Snapshots sous `.impeccable/critique/`.

---

## Stack technique

| Couche | Techno | Notes |
|---|---|---|
| Framework | Next.js 14.2 (App Router) | Pas de `output: standalone` ; `serverExternalPackages: ["@react-pdf/renderer"]` |
| Base de données | Supabase (PostgreSQL) | Auth + DB + Storage photos |
| Auth | Supabase Auth | Google OAuth + email/password — Google OAuth **en production** ✅ |
| Paiements | Stripe | Webhooks dans `/api/stripe/webhook` |
| IA | Anthropic Claude API | Modèle : `claude-sonnet-4-6`, défini **une seule fois** dans `src/lib/anthropic.ts` (`ANTHROPIC_MODEL`) |
| Impression | Gelato | Print-on-demand livres |
| Emails | Resend | 3 000/mois gratuit |
| Hébergement | Vercel | Cron jobs configurés dans `vercel.json` |
| Langage | TypeScript | |
| Style | Inline styles | Tailwind installé mais non utilisé en pratique |

**CSP stricte dans `next.config.js`** : `connect-src` limité à self + Supabase + Anthropic + Stripe ; scripts externes bloqués. **Tout ajout de ressource externe (script, font, API tierce) exige de mettre à jour la CSP**, sinon ça casse silencieusement en prod. Redirects permanents : `/en/*` → `/*`, anciennes URLs legal FR → EN.

**Coût infra mois 1-2 : ~30-50€/mois** (Anthropic API principal poste)

---

## Commandes

```bash
npm run dev        # Dev server localhost:3000 (⚠️ prend le 1er port libre, souvent 3001)
npm run build      # Production build (valide aussi TypeScript)
npx tsc --noEmit   # Type-check sans build
npm test           # Vitest (vitest run) — 21 tests sur la logique pure src/lib/*.test.ts
```

Pas de script lint. Fichiers de test existants : `plan.test.ts`, `book-pages.test.ts`, `anthropic.test.ts`, `story.test.ts`.

Déploiement sur **Vercel** — push sur `main` = auto-deploy prod. Les variables d'environnement vivent sur Vercel. En local : `npx vercel env pull .env.local` récupère les noms, mais les vars « Sensitive » reviennent **vides** (write-only) — les renseigner à la main (clé test Stripe recommandée en local). Astuce : les valeurs `NEXT_PUBLIC_*` sont publiques par design → récupérables depuis le bundle JS prod si besoin.

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
STRIPE_PRICE_ID_DIGITAL_EUR    # plan digital 4,99 €/mois (Europe)
STRIPE_PRICE_ID_DIGITAL_USD    # plan digital $4.99/mo (reste du monde)
STRIPE_PRICE_PRINT_ANNUAL_EUR  # plan print annuel EUR (79 €/an)
STRIPE_PRICE_PRINT_ANNUAL_USD  # plan print annuel USD ($79/year)
STRIPE_GIFT_PRICE_ID_DIGITAL_EUR   # gift one-time 4,99 € (1 mois Digital offert)
STRIPE_GIFT_PRICE_ID_DIGITAL_USD   # gift one-time $4.99
STRIPE_GIFT_PRICE_ID_PRINT_EUR     # gift one-time 79 € (1 an Print offert)
STRIPE_GIFT_PRICE_ID_PRINT_USD     # gift one-time $79
STRIPE_GIFT_COUPON_ID          # coupon 100% off, duration "once" (1ère facture gratuite)

RESEND_API_KEY
WAITLIST_TO_EMAIL              # email destinataire waitlist (optionnel — warn si absent)

CRON_SECRET                    # protège les routes /api/cron/*

# Auth Hook (Supabase → /api/emails/auth-hook)
SUPABASE_HOOK_SECRET           # format "v1,whsec_<base64>" — copier depuis Supabase > Auth > Hooks > Send Email > Reveal
                               # Si absent → hook retourne 401 → Supabase retourne 500 sur signup/reset

DEBUG_LOGS                     # optionnel — "1" active log.debug/log.info (src/lib/log.ts)
```

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
          onboarding_completed,
          payment_past_due,  -- boolean — set par invoice.payment_failed, cleared par invoice.payment_succeeded
          language,          -- locale préférée pour les emails (détection via src/lib/locale.ts)
          created_at

-- pets
pets: id, user_id, name, species, breed, birthdate, photo_url, bio,
      deceased_at,           -- date nullable — active le mode mémorial
      memorial_message,      -- text nullable
      memorial_photo_url,    -- text nullable — photo affichée sur la page mémorial
      created_at

-- entries (journal)
entries: id, pet_id, user_id, content, photo_urls[], mood, tags[], entry_date, created_at
-- Limite 10 entrées plan free enforced par trigger Postgres (enforce_free_entry_limit)

-- stories (chapitres IA)
stories: id, pet_id, user_id, title, content, cover_url,
         status,             -- 'draft' | 'ready' | 'ordered'
         story_type, month_key,  -- index unique (pet_id, story_type, month_key) = idempotence cron
         created_at

-- milestones
milestones: id, pet_id, user_id, type, title, achieved_at, entry_id, created_at

-- book_configs (brouillons et commandes de livres)
book_configs: id, user_id, pet_id, name, status ('draft'|'ordered'),
              theme, custom_title, year_filter, selected_story_ids (jsonb),
              cover_photo_url, story_layouts (jsonb), dedication_text,
              gelato_order_id, ordered_at, page_count,
              created_at, updated_at
-- RLS : owner uniquement · Max 15 drafts/user (enforced API) · updated_at auto via trigger

-- milestone_definitions (extensibilité sans déploiement)
milestone_definitions: id, key (unique), name_fr, name_en, keywords text[], icon, order_index
-- RLS : SELECT public, pas d'écriture client
-- Utilisée en priorité par detectMilestones() et translateMilestone() ; fallback MILESTONE_TYPES hardcodé
-- Clé spéciale "first_memory" : déclenche sur existingEntries.length === 0

-- memorial_tributes (hommages publics sur pages mémorial)
memorial_tributes: id, pet_id, author_name (1–100), message (1–1000),
                   status ('pending'|'approved'|'rejected'), created_at
-- RLS : lecture publique (approved + pet décédé), owner voit tout
-- Écriture client uniquement via POST route API (rate limit 3/h IP + honeypot)

-- pet_members (journal partagé foyer)
pet_members: id, pet_id, user_id (null jusqu'à acceptation), invited_email,
             invited_by, role ('contributor'), status ('pending'|'accepted'|'revoked'),
             invite_token (64 hex, unique), invite_token_expires_at, accepted_at, created_at
-- RLS : owner voit ses membres, membre voit sa propre ligne
-- Aucun INSERT/UPDATE/DELETE client — service role uniquement via routes API
-- Max 5 membres non-révoqués par animal (enforced API) ; token TTL 7 jours

-- events_log : trace d'idempotence (stripe_event_id, nudges…) — contrainte unique (user_id, pet_id, event_type)
-- rate_limits : compteurs persistants pour checkRateLimitDb (RPC check_rate_limit, SECURITY DEFINER, fail-open)
```

### Règles migrations

- Fichiers dans `supabase/migrations/`, nommés `<description>_YYYY_MM_DD.sql` (convention observée).
- Toujours idempotent : `IF NOT EXISTS`, blocs `DO $$ … $$`, `CREATE OR REPLACE`.
- **Aucune migration ne s'applique automatiquement** : l'utilisateur les exécute à la main dans le SQL editor Supabase. Toujours le signaler explicitement en livrant une migration.

---

## Plans & monétisation

Système **3 plans strict** (depuis 2026-07-07) :

| Plan | Prix | Accès |
|---|---|---|
| **Free** | $0 | 10 entrées max, 1 génération IA, 1 profil animal |
| **Premium Digital** | 4,99 €/mois · $4.99/mo | IA illimitée, multi-profils, pas de livre inclus |
| **Premium Print** | 79 €/an · $79/yr (annuel uniquement) | Tout le digital + 1 livre hardcover annuel |

Livre supplémentaire (tout plan payant) : prix **dynamique** selon le nombre de pages (`calcGelatoBookPrice`, minimum ~28 €/$28) — pas de Price ID Stripe. Les plans supprimés (`digital_annual`, `print_monthly`, livre à la carte à prix fixe) n'existent plus ni dans le code ni dans Stripe.

### Guards d'accès

```ts
getUserPlan(userId)          // retourne le plan actuel — src/lib/plan.ts (server-only)
canGenerateStory(userId)     // Free: max 1 | autres: illimité — src/lib/plan-guards.ts (pur, zéro import)
canAddEntry(userId)          // Free: max 10 | autres: illimité — src/lib/plan-guards.ts
canOrderBook(userId)         // Digital: non | Print: oui (1/an) | Book: oui (1 crédit) — src/lib/plan-guards.ts
```

**`src/lib/plan-guards.ts`** : guards purs (`canAddEntry`, `canGenerateStory`, `canOrderBook`, `priceIdToPlan`, types `Plan`/`PlanInfo`), **zéro import** — importable depuis des composants `"use client"` (voir règle client/server). `plan.ts` fait `export * from "./plan-guards"` : les imports existants `from "@/lib/plan"` fonctionnent sans changement.

`priceIdToPlan()` mappe les Stripe price IDs (depuis env vars) aux plans.
Book credits : incrémentés via RPC `increment_book_credits`, consommés atomiquement via `try_consume_book_credit` (verrou `FOR UPDATE`) **avant** l'appel Gelato, restaurés via `restore_book_credit` en cas d'échec Gelato. Prévient les race conditions sur les commandes simultanées.

### Webhook Stripe (`/api/stripe/webhook`)

Events gérés :
- `checkout.session.completed`
- `customer.subscription.deleted` — downgrade plan free + clear `payment_past_due`
- `customer.subscription.updated`
- `invoice.payment_succeeded` — **source unique** des book credits Print (conditions : `billing_reason` ∈ `subscription_create`/`subscription_cycle` + price ID Print annuel). `checkout.session.completed` n'attribue **plus** de crédit Print (race condition corrigée 2026-06-01). Remet `payment_past_due: false` en tête de handler pour **tout** paiement réussi (avant les gates Print/365j qui return early).
- `invoice.payment_failed` — set `payment_past_due: true` + log `events_log` (idempotent par `stripe_event_id`) + email Resend avec lien billing portal (**uniquement 1ère tentative**, `attempt_count <= 1`). Ne downgrade pas (Stripe gère les retries ; `customer.subscription.deleted` gère le downgrade final). Côté UI : bannière rouge bilingue sur `/dashboard` (clés `dashboard.payment_issue_*`).

**Idempotence** : abonnement → compare `stripe_subscription_id` en DB avant d'agir ; crédits livre → vérifie `events_log` via `metadata @> { stripe_event_id }` avant d'incrémenter ; tous les événements loggent le Stripe event ID dès réception.

**Test local via Stripe CLI** (procédure validée 2026-07-13) : `stripe login` (compte `acct_...RmAiDTHhpu`) → `.env.local` avec `SUPABASE_SERVICE_ROLE_KEY` + `STRIPE_WEBHOOK_SECRET` = le `whsec_` de `stripe listen` (stable par compte) → `npm run dev` (vérifier le **port réel**) → `stripe listen --forward-to localhost:<port>/api/stripe/webhook` → `stripe trigger invoice.payment_failed`. ⚠️ En local, `NEXT_PUBLIC_SUPABASE_URL` pointe la **prod** : rester au « Niveau 1 » (événements dont le customer ne matche aucun profil → 0 write DB). Ne jamais déclencher d'events qui écriraient sur un profil prod sans projet Supabase de test dédié.

**Prix livre dynamique** : `src/lib/gelato-pricing.ts` — `calcGelatoBookPrice(pageCount)` = `15.46 + max(0, (pages-30)/2) × 0.395 + 12` (COGS Gelato + 12 €/USD de marge fixe, même valeur EUR/USD). Utilisé par `/api/stripe/book-checkout` (one-time avec `price_data`) et affiché dans les encarts upsell de la page order.

---

## Architecture

**Next.js 14 App Router** — toutes les pages dans `src/app/`. Toutes les pages dashboard sont `"use client"` ; elles fetchent les données dans `useEffect` via le client Supabase browser.

### Supabase — trois clients (ne jamais en créer un quatrième)

| Client | Fichier | Usage |
|---|---|---|
| Browser | `src/lib/supabase/client.ts` (singleton) | Pages `"use client"` |
| Server (anon + cookies) | `src/lib/supabase/server.ts` | Routes API avec session utilisateur, middleware |
| Service role (bypass RLS) | `getServiceSupabase()` dans `src/lib/supabase/service.ts` (ré-exporté par `plan.ts`) | Webhook Stripe, crons, gelato/order, book-pdf, pages publiques `/pets/[id]` et `/memorial/[id]`. Zéro dépendance server-only → importable en edge runtime |

**Règle** : ne jamais instancier `createClient` de `@supabase/supabase-js` directement dans une route. Pour Stripe, importer le singleton `stripe` de `@/lib/stripe` (jamais `new Stripe(...)` inline).

Auth enforced dans `src/middleware.ts` (matcher : `/dashboard/*`, `/auth/*`, `/fr/*`, `/invite/*`) : non-authentifié sur `/dashboard/*` → redirect `/auth/login`.

### i18n — architecture hybride (Session 57)

Messages dans `messages/en.json` et `messages/fr.json`, chargés au build par `src/lib/i18n.ts`.

- **Pages marketing** (`/`, `/fr`, `/gift`, `/fr/gift`) : langue **figée par URL**, jamais par `navigator.language`. Un composant client locale-aware partagé par page (`home-client.tsx` = `<Home locale>`, `gift/gift-client.tsx` = `<GiftContent locale>`) piloté par une prop `locale`, textes via `getTranslations(locale)`. Les `page.tsx` serveur exportent metadata + JSON-LD et rendent avec `locale="en"|"fr"`. **Jamais de `useLocale` sur ces pages.**
- **Dashboard + autres pages publiques** (contact, redeem, unsubscribe, memorial, legal…) : `useLocale()` de `src/hooks/useLocale.ts` — détection `navigator.language` au mount, FR si commence par `fr`, EN sinon. Pas de cookie, pas de `setLocale`, pas de switcher manuel.
- `PublicNav`/`PublicFooter` acceptent une prop `locale` **optionnelle** : fournie → déterministe (marketing), absente → `useLocale` (le reste).
- **Switch de langue** : lien crawlable `<a href>` dans le footer marketing (`PublicFooter localeSwitch={{ href, label }}`). `/`↔`/fr`, `/gift`↔`/fr/gift`. `LangSuggestBanner` (4 pages marketing) suggère l'autre langue si mismatch navigator — lien réel, jamais de redirect, ne modifie jamais le contenu rendu.
- **Jamais de redirect auto basé sur `Accept-Language`** (chaque URL = une langue stable pour les crawlers).
- **Devise ≠ langue** : `getCurrencyFromCountry()` (géoloc `x-vercel-ip-country`) est indépendant de la locale. Un visiteur FR sur `/` voit la page EN avec prix EUR — voulu.
- L'ancien mécanisme cookie (`/api/locale` + `LanguageSwitcher.tsx`) a été entièrement supprimé — ne pas le réintroduire.

**Règle** : toujours ajouter les nouvelles clés dans les **deux** fichiers JSON, au même chemin.

### Dashboard layout & navigation

`src/app/dashboard/layout.tsx` rend `<DashboardNav>` (sidebar fixe desktop, header + drawer mobile) + `{children}`.

`src/components/DashboardNav.tsx` — composant central :
- **PetSelector** : liste les pets + « Tous mes animaux ». Persiste le dernier pet visité dans `localStorage` (`lastPetId`).
- `showAll` state : `true` sur `/dashboard` (vue globale).
- Navigation tab-aware : liens sidebar avec `?tab=journal|stories|milestones` ; le switch de pet préserve l'onglet actif.
- **Desktop** (≥768px) : sélecteur animal → nav 6 items → Suggestion → section secondaire (Paramètres, Déconnexion).
- **Mobile** : header fixe (burger + logo) + drawer slide-in gauche. Pas de bottom nav ni de FAB. Drawer : `aria-hidden` + `inert` fermé, `body.overflow = hidden` ouvert, safe-area-inset-top, tap targets 44×44px.

Labels de navigation définitifs : « Livre » (ex-Commander), « Histoires IA » (ex-Histoires).

### Pet page tabs

`/dashboard/pets/[id]` utilise `?tab=journal|stories|milestones` (pas de tab = journal). Le tab est lu depuis `useSearchParams()` — **dérivé de l'URL, jamais un state local** (un state local + `useEffect` vide ne se met pas à jour sur navigation client-side).

---

## Routes API (exhaustif au 2026-07-16)

| Route | Rôle | Auth |
|---|---|---|
| `/api/generate` | Génération histoire IA — re-fetch DB après ownership check, rate limit 10/jour/user (count DB, UTC) | Session + gate plan |
| `/api/generate-origins` | Génération histoire « origins » (onboarding) | Session + ownership |
| `/api/stripe/checkout` | Checkout abonnement (`{ plan: "digital" \| "print_annual" }`) | Session |
| `/api/stripe/book-checkout` | Achat livre one-time — `calcGelatoBookPrice(pageCount)` + `price_data`, accepte `{ petId, pageCount }` | Session |
| `/api/stripe/webhook` | Webhook Stripe — **ne jamais déplacer** | Signature Stripe |
| `/api/stripe/upgrade`, `/upgrade-preview` | Changement de plan + preview proration | Session |
| `/api/stripe/cancel`, `/reactivate`, `/subscription`, `/invoices` | Gestion abonnement + factures | Session |
| `/api/gelato/order` | Commande Gelato — met à jour `book_configs` (status→ordered), accepte `bookConfigId` optionnel | Session + crédits atomiques |
| `/api/gelato/status/[orderId]` | Proxy statut Gelato — ownership via `book_configs.gelato_order_id` | Session |
| `/api/book-configs` (+`/[id]`) | GET liste par petId, POST create/update (max 15 drafts), DELETE owner-only | Session |
| `/api/book-pdf` | **PDF réel** Gelato (200×200mm) — `@react-pdf/renderer` | Token HMAC (`src/lib/pdf-token.ts`) |
| `/api/book-pdf-link` | Génère le lien signé vers book-pdf | Session |
| `/api/preview-pdf` | Preview HTML in-app (POST) | Session + ownership pet |
| `/api/share-card` | PNG partage Instagram — edge runtime, `?story_id=&format=square\|story` | Session + ownership |
| `/api/cron/*` (8 routes) | Voir section Cron jobs | `verifyCronRoute` (Bearer CRON_SECRET) |
| `/api/gift/checkout`, `/complete`, `/redeem` | Flow carte cadeau (achat one-time → code → redeem coupon 100%) | Selon route : session ou post-Stripe |
| `/api/pet-members` (+`/[id]`), `/api/invite/[token]` | Journal partagé foyer — invitations, accept/revoke | Session ; écriture via service role uniquement |
| `/api/memorial/tributes` | POST hommage public — rate limit 3/h IP + honeypot | Public (rate-limité) |
| `/api/emails/auth-hook` | Hook Supabase Send Email — Standard Webhooks HMAC fail-closed | `SUPABASE_HOOK_SECRET` |
| `/api/emails/confirm-signup`, `/change-email`, `/reset-password` | Envoi emails auth | `Bearer SUPABASE_HOOK_SECRET` fail-closed |
| `/api/account/delete` | Suppression complète de compte (RGPD) | Session |
| `/api/export-data` | Export RGPD JSON (profil, pets, entries, stories, milestones, book_configs) | Session |
| `/api/contact`, `/api/waitlist`, `/api/suggestion` | Formulaires publics | Rate limit DB |
| `/api/unsubscribe` | Désinscription emails | Token |
| `/api/currency` | `{ currency: "EUR"\|"USD" }` via `x-vercel-ip-country` (pas de champ `country` — privacy) | Public |

### Checklist nouvelle route API (obligatoire)

1. **Choisir le modèle d'auth** : session utilisateur (`supabase/server.ts`) / cron (`verifyCronRoute`) / webhook signé (HMAC fail-closed) / public rate-limité. Une route sans auth doit être une décision explicite, justifiée.
2. **Valider tout identifiant client** (`petId`, `storyId`…) via `isUuid`/`UUID_REGEX` de `@/lib/validation` **avant** usage en DB ou URL.
3. **Vérifier l'ownership** de la ressource (le pet appartient-il au user ?) même quand la RLS protégerait — les routes service role bypassent la RLS.
4. **Ne jamais faire confiance au body client** pour des données qui existent en DB : re-fetcher après l'ownership check (référence : `/api/generate`).
5. **Rate limit** : `checkRateLimitDb()` (Postgres, fiable) pour tout endpoint public ou coûteux. Le limiter in-memory (`checkRateLimit`) n'est **pas fiable** sur Vercel serverless (cold start = reset, pas de partage entre instances).
6. **Erreurs** : logger le détail côté serveur (`log.error`), retourner un message **générique** au client — jamais de détails Stripe/Gelato/Anthropic.
7. **Logs** : `log.*` de `src/lib/log.ts`, jamais `console.*` (fuite d'ids/payloads en prod).

---

## Pages clés

| Route | Description |
|---|---|
| `/` , `/fr` | Landing (langue figée par URL, server-rendered) |
| `/auth/signup`, `/auth/login` | Auth (noindex) |
| `/dashboard` | Dashboard principal (bannière `payment_past_due` le cas échéant) |
| `/dashboard/pets/[id]` | Profil animal + journal (tabs journal / histoires IA / étapes) |
| `/dashboard/pets/[id]/order` | Commande livre — brouillons (`?configId=`), CTA → Stripe si `plan=print && book_credits=0` |
| `/dashboard/pets/[id]/books` | Historique livres & brouillons — statut Gelato temps réel, tracking, reprendre/recommander/supprimer |
| `/dashboard/settings`, `/dashboard/upgrade` | Préférences / changement de plan |
| `/pets/[id]` | Profil public animal (restreint aux animaux décédés) |
| `/memorial/[id]` | Page mémorial publique — dark, photo, message, histoires, OG meta, hommages modérés |
| `/memorial` | Landing marketing SEO « pet memorial book » — server component pur, palette cream+sage |
| `/blog`, `/blog/[slug]` | Blog SEO — registre `src/lib/blog.ts` (voir workflow ci-dessous) |
| `/gift`, `/fr/gift` | Page cadeau (langue figée par URL) |
| `/contact`, `/redeem`, `/invite/[token]`, `/unsubscribe`, `/legal/*` | Pages publiques secondaires (`useLocale`) |

**Workflow blog** : (1) écrire le corps dans `app/blog/<slug>/page.tsx` (metadata + JSON-LD Article + `<ArticleLayout post>`), (2) passer `published: true` dans `src/lib/blog.ts` → entre dans l'index + sitemap, perd le noindex, JSON-LD activé. Le registre `BLOG_POSTS[]` est la seule source de vérité.

---

## Cron jobs (`vercel.json` — source de vérité, garder cette table synchronisée)

| Route | Schedule | Rôle |
|---|---|---|
| `/api/cron/weekly-reminder` | `0 8 * * 1` | Rappels email hebdo (Resend) |
| `/api/cron/monthly-story` | `0 8 1 * *` | Chapitre mensuel auto (règles ci-dessous) |
| `/api/cron/streak-alert` | `0 17 * * *` | Alerte streak |
| `/api/cron/birthday-check` | `0 8 * * *` | Anniversaires |
| `/api/cron/daily-prompts` | `0 7 * * *` | Prompts quotidiens |
| `/api/cron/on-this-day` | `0 9 * * *` | « Il y a un an » |
| `/api/cron/retention-emails` | `0 9 * * *` | Rétention D1-D7-D30 |
| `/api/cron/first-story-nudge` | `0 10 * * *` | Relance premier chapitre (J+2-3) |

Toutes protégées par `verifyCronRoute(req)` de `@/lib/auth` (Bearer `CRON_SECRET`, constant-time). **Toute nouvelle route cron doit l'utiliser** et être ajoutée à `vercel.json` ET à cette table.

**Règles `monthly-story`** : génère le chapitre du **mois écoulé** (fire le 1er). Éligibilité pet = TOUTES : `deceased_at IS NULL` + owner plan ∈ `digital`/`print` + ≥3 entrées dans le mois écoulé + aucune story existante pour (pet, month_key). Idempotence DB par index unique `stories_pet_id_story_type_month_key_unique` (+ gestion `23505` dans `generateAndSaveStory`). **`email_reminders` n'est PAS un critère** : un payant qui a coupé les emails obtient son chapitre in-app ; seul l'email respecte l'opt-out. Génération via `generateAndSaveStory` (`src/lib/story.ts` — ne jamais dupliquer la logique IA). try/catch **par pet** (une erreur loggue et continue). `maxDuration=300` (plan Vercel Pro).

---

## Gelato — Configuration livre

```ts
productUid: "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver"
pageCount: 28   // OBLIGATOIRE — sans ça Gelato retourne BAD_REQUEST
currency: "USD"
```

**pageCount** : calculé par `calcPageCount(storiesCount, hasOrphanPhotos, hasDedication)` dans `src/lib/book.ts`. Doit correspondre **exactement** entre `gelato/order` et `book-pdf` (même algo best-match pour `hasOrphanPhotos`). Format Gelato : multiple de 4, minimum 28.

---

## État actuel (résumé des fonctionnalités)

> Détail complet : [docs/SESSIONS.md](docs/SESSIONS.md)

**Journal** : entrées + photos (compression canvas), moods, tags, filtres année/mois, entrées antidatées, timeline par mois, limite 10 entrées free (trigger Postgres), journal partagé foyer (`pet_members`, invitations token 7j, max 5 membres).

**Histoires IA** : génération gated par plan (`getUserPlan`), rate limit 10/jour/user (count DB), client Anthropic unique `src/lib/anthropic.ts` (`callClaude`, timeout 30s, 1 retry 429/5xx), prompts protégés injection (balises XML + `escapeXml`), cron mensuel auto, onboarding « origins », interview hebdo, nudge premier chapitre (carte in-app + email J+2-3).

**Milestones** : détection auto à la création d'entrée (`src/lib/milestones.ts`), définitions extensibles en DB, fallback hardcodé.

**Livre imprimé** : page order (5 thèmes couverture, titre custom, dédicace, sélection chapitres, filtre année, photo couverture, 4 layouts/chapitre), brouillons `book_configs` (max 15), aperçu HTML + PDF réel Gelato, crédits atomiques (RPC FOR UPDATE avant Gelato, restore si échec), statut temps réel, historique/duplication/re-commande.

**Monétisation** : checkout + upgrade avec proration preview, webhook idempotent, achat livre one-time à prix dynamique, flow cadeau complet, factures, réactivation, changement de plan fin de période, `payment_past_due` (bannière + email dunning 1ère tentative).

**Emails** (Resend) : templates harmonisés `src/lib/email-templates.ts` (`baseLayout`), auth hook Supabase (Standard Webhooks, HMAC fail-closed), 8 crons, unsubscribe tokenisé.

**Pages publiques** : profil animal, mémorial (hommages modérés rate-limités), share card Instagram (edge, PNG).

**i18n** : hybride — marketing figé par URL server-rendered, reste en `useLocale` auto.

**SEO / RGPD** : canonicals relatives par page (via `metadataBase`), `app/robots.ts` + `app/sitemap.ts`, noindex login/signup, JSON-LD homepage (Organization + SoftwareApplication sans aggregateRating + FAQPage i18n-driven), hreflang réciproque sur les 4 routes marketing, cookie banner, export données, suppression de compte.

**Sécurité** : 13 rounds de review — les règles qui en découlent sont codifiées dans « Conventions de code ».

**Qualité** : logs gatés (`src/lib/log.ts`), rate-limit persistant Postgres, 21 tests Vitest, hook SessionStart `npm install`.

---

## Conventions de code

### Règles critiques

- Routes API dans `/app/api/`. Webhook Stripe : `/api/stripe/webhook` — **ne jamais déplacer**.
- Ne jamais supprimer un ancien Price ID Stripe avant que le nouveau soit testé en Live.
- Tab actif pet page : **lire depuis `useSearchParams()`**, jamais un `useState` + `useEffect` vide.
- **Milestones** : utiliser `localTitle` directement dans l'affichage — ne pas découper par espaces pour retirer l'emoji (l'icône est rendue séparément via le champ `icon`).
- **Auth sécurité** : tout changement de mot de passe vérifie d'abord le mot de passe actuel via `signInWithPassword` avant `updateUser`.
- **Devise** : `getCurrencyFromCountry` + `formatPrice` de `src/lib/currency.ts` pour tout affichage de prix. Ne jamais utiliser la langue comme proxy de devise. Routes Stripe : `x-vercel-ip-country` (checkout) ou `subscription.currency` (upgrade).
- **Webhooks entrants** (Supabase auth hook) : spec **Standard Webhooks**. Headers `webhook-id`/`webhook-timestamp`/`webhook-signature` ; contenu signé `{id}.{timestamp}.{body}` ; secret : strip `v1,whsec_` puis `Buffer.from(rest, "base64")` comme clé HMAC-SHA256 ; signature `v1,<base64_hmac>`. **Fail-closed** : secret absent → 401 immédiat. Comparaison `timingSafeEqual`. Référence : `src/app/api/emails/auth-hook/route.ts`.
- **Comparaisons de secrets** : toujours `timingSafeEqual` de `node:crypto` — jamais `===` (timing attack).
- **`/api/gelato/order`** : filtrer les updates de stories par `user_id` même avec service role. Crédits : `try_consume_book_credit` **avant** Gelato, `restore_book_credit` si échec.
- **`/api/preview-pdf` / `book-pdf`** : jamais de contenu livre sans auth (token HMAC pour Gelato, session + ownership pour l'aperçu). URLs insérées en CSS → `safeCssUrl()` (échappe les apostrophes).
- **Client vs server-only imports** : un module utilisé par un composant `"use client"` ne doit **jamais** avoir dans sa chaîne d'imports statique `supabase/server.ts` / `next/headers` (ex. `plan.ts`, `book.ts`). Casse le build (« importing a component that needs next/headers »). Fix pattern : extraire la logique pure dans un module frère **zéro import** (`book-pages.ts`, `plan-guards.ts`) et faire réexporter par l'original. Un `import type` est toujours sûr (effacé à la compilation).
- **Validation dates** : `periodStart`/`periodEnd` client validés comme `YYYY-MM-DD` avant usage en filtre DB.
- **Cookies** : tout cookie sensible posé via API → `httpOnly: true`, `secure: NODE_ENV === "production"`, `sameSite: "lax"`. (Il n'existe actuellement aucun cookie de préférence côté app — la locale est détectée via `navigator.language`, sans cookie.)
- **Prompts IA avec données utilisateur** : isoler dans des balises XML (`<pet_details>`, `<journal_entries>`) + `escapeXml()` sur chaque valeur insérée. Références : `cron/monthly-story`, `/api/generate`.
- **`/auth/callback` redirect** : `next` doit commencer par `/` ET pas par `//` (bloque les redirects protocol-relative). Helper : `validateRedirectTo` / `isSafeRelativePath`.
- **SEO / metadata** : jamais de `alternates.canonical` ni `openGraph.url` dans le root layout (hérités partout → duplicata). Canonicals **relatives** (`/gift`) résolues via `metadataBase`. Le merge metadata Next est **shallow par clé top-level** : une page qui définit `openGraph` remplace tout l'objet og du layout → fournir un og complet (title/url/siteName/type). Pages `"use client"` : metadata via `layout.tsx` de segment ou wrapper server `page.tsx` + composant client séparé. Jamais de `public/robots.txt` (conflit `app/robots.ts`). Jamais d'`aggregateRating` factice dans les JSON-LD.

### Helpers partagés — ne jamais réimplémenter inline

| Besoin | Helper | Fichier |
|---|---|---|
| Escape HTML | `escapeHtml()` | `src/lib/html.ts` |
| Escape XML (prompts IA) | `escapeXml()` | `src/lib/html.ts` |
| UUID / email / path relatif sûr | `UUID_REGEX`, `isUuid`, `isEmail`, `isSafeRelativePath` | `src/lib/validation.ts` |
| Bearer token constant-time | `verifyBearer()` | `src/lib/auth.ts` |
| Protection route cron | `verifyCronRoute(req)` | `src/lib/auth.ts` |
| Open redirect guard | `validateRedirectTo()` | `src/lib/auth.ts` |
| Locale d'un profil (emails) | — | `src/lib/locale.ts` (service role, pas de session) |
| Nombre de pages livre | `calcPageCount()` | `src/lib/book.ts` (logique pure : `book-pages.ts`) |
| Tokens PDF signés | — | `src/lib/pdf-token.ts` |
| Erreurs Supabase Auth → FR/EN | `getSignupError()` | `src/lib/auth-errors.ts` |
| Appel Claude + parse | `callClaude()`, `parseStoryResponse()` | `src/lib/anthropic.ts` |
| Génération + save story | `generateAndSaveStory()` | `src/lib/story.ts` |
| Logs gatés | `log.debug/info/warn/error` | `src/lib/log.ts` |
| Rate limit fiable | `checkRateLimitDb()` | `src/lib/rate-limit.ts` |
| Prix livre | `calcGelatoBookPrice()` | `src/lib/gelato-pricing.ts` |
| Devise + format prix | `getCurrencyFromCountry()`, `formatPrice()` | `src/lib/currency.ts` |

---

## Checklist avant mise en production

- [x] `STRIPE_SECRET_KEY` en `sk_live_...` ✅ (2026-07-07)
- [x] `STRIPE_PRICE_ID_*` + `STRIPE_WEBHOOK_SECRET` en mode Live ✅ (endpoint `we_1TqHQk…`, 6 events)
- [x] Google OAuth publié (hors mode Test) ✅
- [ ] Tester le webhook Stripe en Live avec un vrai paiement (page paiement OK 07-07 ; reste à valider l'activation du plan après paiement réel)
- [x] Cron weekly-reminder envoie les emails ✅
- [x] Gelato configuré avec carte de paiement valide ✅
- [x] Migrations sécurité round2/round3 + fix book credits exécutées dans Supabase ✅

---

## Contexte marché

- **Cible** : pet parents US/UK, très attachés émotionnellement à leurs animaux
- **Différenciateur** : seule app combinant journal IA + livre imprimé physique
- **Concurrents directs** : 11Pets, PetNoter, DogNote (aucun ne propose un livre imprimé)
- **Canaux d'acquisition** : Reddit, Twitter/X, groupes Facebook pet parents, Product Hunt
- **Stratégie** : validation organique avant publicité payante

---

## Optimisation & dette technique (audit Pareto 2026-06-18)

**Livré** : #1 logs gatés (`src/lib/log.ts`) · #3 client Anthropic unique (`src/lib/anthropic.ts`) · #5 singleton Supabase browser · #7 rate-limit persistant Postgres (RPC `check_rate_limit`, fail-open, migration appliquée en prod ✓) · #10 tests Vitest (21 tests ; ⚠️ `vitest.config.ts` a un alias `@`→`src` **manuel** — PAS `vite-tsconfig-paths`, ESM-only, casse le config loader CJS).

**Écarté — #2 `select("*")` → colonnes explicites** : analysé, aucun gain réel (occurrences restantes = counts `head:true` ou colonnes toutes consommées). Ne pas re-tenter sans nouveau besoin.

**Reportés — gros refactors (fort blast-radius)** :
- **#4 Rendu statique CDN landing** — bloqué : root `layout.tsx` lit `headers()` (x-pathname) pour `<html lang>` → force tout le site en dynamique. Fix = restructurer en `/[locale]/`. Risque SEO bilingue si bricolé.
- ~~#6 Dédup landing~~ ✅ résolu (Session 57).
- **#8 Dashboards client → Server Components** — ~10 pages font `getUser()` + `Promise.all` en `useEffect` (waterfall).
- **#9 Split god-components** — `pets/[id]/page.tsx` 131 Ko (308 `style={{}}`), `order` 81 Ko, `settings` 54 Ko.

*Dernière mise à jour : 2026-07-16 (Session 59 — refonte CLAUDE.md : definition of done, checklists actionnables, purge des infos obsolètes)*

---

## Historique des sessions

Historique complet (sessions 1 à 57, sprints, audits sécurité, UX) : **[docs/SESSIONS.md](docs/SESSIONS.md)**.
Seules les 2 dernières sessions sont conservées ici ; à chaque nouvelle session, déplacer la plus ancienne vers l'archive.

### ✅ Session 59 — Refonte CLAUDE.md pour agents non-Fable (2026-07-16)

Audit du CLAUDE.md contre l'état réel du repo + réécriture complète (branche `claude/upgrade-claude-md-ofhqli`). Objectif : qu'un modèle moins capable (Opus/Sonnet) produise un travail conforme en suivant le fichier seul.

- **Corrections factuelles** : `/api/gift/create` n'existe pas → `/api/gift/checkout` ; `LanguageSwitcher.tsx` déjà supprimé (la note « safe to delete » traînait) ; exception cookie `locale` obsolète (useLocale ne lit plus aucun cookie, `/api/locale` = dead code) ; « 16 tests » → 21.
- **Nouveau** : section « Definition of Done » (8 checks explicites avant de déclarer un travail fini), « Checklist nouvelle route API » (7 points : modèle d'auth, UUID, ownership, re-fetch DB, rate limit, erreurs génériques, logs), règles migrations (naming + application manuelle Supabase), règles git/deploy (push main = prod immédiate), table « Helpers partagés » exhaustive (dont `verifyCronRoute`, non documenté avant).
- **Dédup** : les deux sections couleurs (tokens `--ep-*` réels vs ancienne palette `--cream/--amber/--sage` qui n'a jamais existé dans `globals.css`) fusionnées en une seule, complétée des tokens radius/shadow/transition/border.
- **Complétude** : table routes API passée de ~15 à ~28 entrées (exhaustive), colonne Auth ajoutée ; table cron synchronisée avec `vercel.json` ; CSP `next.config.js` documentée (ajout de ressource externe = mise à jour CSP obligatoire).
- **Suite (décisions Julien)** : `/api/locale` supprimée (dead code confirmé) ; `AUDIT_PLAN.md`/`AUDIT_REPORT*.md` déplacés vers `docs/` ; item checklist prod « webhook Live avec vrai paiement » toujours ouvert ; règle « jamais de hex inline » s'applique au **nouveau** code (l'existant sera repris avec la dette #9).
- `tsc --noEmit` + 21 tests + `npm run build` verts.

### ✅ Session 58 — Nudge premier chapitre gratuit (2026-07-15)

Problème : un free user qui écrit 3 entrées dès sa 1ère semaine n'a aucun signal poussant à utiliser sa génération IA gratuite incluse (`canGenerateStory`) → risque de churn avant le "wow moment".

**Commit `94bc2e4`** :
- **`src/lib/plan-guards.ts`** (nouveau) : `canAddEntry`/`canGenerateStory`/`canOrderBook`/`priceIdToPlan`/`Plan`/`PlanInfo` extraits de `plan.ts` vers un module **zéro import**. Raison : `plan.ts` importe `supabase/server` (→ `next/headers`) en tête de fichier ; `pets/[id]/page.tsx` est `"use client"`. `plan.ts` fait `export * from "./plan-guards"` : aucun des ~15 call sites existants n'a changé. Même patron que le split `book.ts`/`book-pages.ts`.
- **`src/lib/story.ts`** : `evaluateFirstStoryNudge(conditions)` — pure — et `shouldShowFirstStoryNudge(supabase, userId, petId)` — lookup DB, utilisée par le cron.
- **`pets/[id]/page.tsx`**, onglet Histoires IA : carte nudge au-dessus de l'indicateur « prochain chapitre », éligibilité calculée côté client + count `userTotalStoryCount` (stories hors origins/birthday, tout animal — même filtre que `/api/generate`). CTA = même handler que le bouton « Générer ». Disparaît une fois `stories.length > 0`.
- **`/api/cron/first-story-nudge`** (nouveau, `0 10 * * *`) : email de relance si la carte in-app ignorée 2-3 jours. Dédup via `events_log` (`user_id, pet_id, event_type='first_story_nudge_email'`) — aucune migration nécessaire. Respecte `email_reminders` (il n'y a que l'email, pas de fonctionnalité produit derrière).
- i18n : clés `first_story_nudge.*` (fr+en). Tests : `src/lib/story.test.ts`, 5 cas. `tsc --noEmit` + 21/21 verts.

Non testé en navigateur (nécessite un compte free avec 3 entrées fraîches — laissé à Julien).

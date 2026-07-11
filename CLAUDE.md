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

### Surfaces passées à la chaîne impeccable

Landing hero (`/`+`/fr`), `/dashboard`, et les 5 pages animal (`pets/[id]` Journal/Histoires/Étapes, `order` Livre, `books` Bibliothèque). Conventions appliquées : eyebrows supprimés, héros agrandis (Georgia), couleurs tokenisées, progress bars en `transform: scaleX` (pas `width`).

Skill `/impeccable <command>` pour critique/audit/polish/live. Snapshots de critique sous `.impeccable/critique/`.

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

### Guards d'accès (`src/lib/plan.ts`)

```ts
getUserPlan(userId)          // retourne le plan actuel
canGenerateStory(userId)     // Free: max 1 | autres: illimité
canAddEntry(userId)          // Free: max 10 | autres: illimité
canOrderBook(userId)         // Digital: non | Print: oui (1/an) | Book: oui (1 crédit)
```

`priceIdToPlan()` mappe les Stripe price IDs (depuis env vars) aux plans.  
Book credits : incrémentés via RPC `increment_book_credits`, consommés atomiquement via `try_consume_book_credit` (verrou `FOR UPDATE`) **avant** l'appel Gelato, restaurés via `restore_book_credit` en cas d'échec Gelato. Prévient les race conditions sur les commandes simultanées.

Le webhook (`/api/stripe/webhook`) gère :
- `checkout.session.completed`
- `customer.subscription.deleted` — downgrade plan free + clear `payment_past_due`
- `customer.subscription.updated`
- `invoice.payment_succeeded` — source unique pour les book credits Print (ajouté 2026-05-28) ; remet `payment_past_due: false` en tête de handler pour **tout** paiement réussi (avant les gates Print/365j qui return early)
- `invoice.payment_failed` — set `payment_past_due: true` + log `events_log` (type `stripe_payment_failed`, idempotent par `stripe_event_id`) + email Resend avec lien billing portal Stripe (`return_url` → `/dashboard/settings`) **uniquement à la 1ère tentative** (`attempt_count <= 1`, les retries dunning Stripe ne re-spamment pas) ; ne downgrade pas (Stripe gère les retries, `customer.subscription.deleted` gère le downgrade final). Note : `invoice.payment_failed` doit être activé dans la config webhook Stripe (fait 2026-06-11, migration appliquée). Côté UI, le dashboard (`/dashboard`) lit `payment_past_due` et affiche une bannière rouge bilingue (clés i18n `dashboard.payment_issue_*`) avec lien vers `/dashboard/settings`.

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

**Règle** : ne jamais instancier `createClient` depuis `@supabase/supabase-js` directement dans une route. Importer `getServiceSupabase()` (`@/lib/supabase/service` ou `@/lib/plan`) pour le service role. Pour Stripe, importer le singleton `stripe` de `@/lib/stripe` (jamais `new Stripe(...)` en ligne). Pour les regex UUID/email et redirects relatifs sûrs, utiliser `@/lib/validation`.

Auth enforced dans `src/middleware.ts` : les requêtes non authentifiées vers `/dashboard/*` redirigent vers `/auth/login`.

### i18n

Messages dans `messages/en.json` et `messages/fr.json`. `src/lib/i18n.ts` charge les deux au build. `src/hooks/useLocale.ts` détecte `navigator.language` côté client et expose `{ t, locale }` — **plus de cookie locale, plus de `setLocale`**.

- FR si `navigator.language.startsWith("fr")`, EN sinon — détection automatique, pas de switcher manuel.
- `LanguageSwitcher.tsx` existe encore dans le repo mais n'est plus importé nulle part (safe to delete).
- `CookieBanner` suit la même logique pour afficher FR ou EN automatiquement.
- `/api/locale` existe encore mais n'est plus appelé côté client.

**Règle** : toujours ajouter les nouvelles clés dans les **deux** fichiers JSON.

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
| `/api/cron/monthly-story` | Auto-génération histoires mensuelles |
| `/api/cron/weekly-reminder` | Rappels email via Resend |
| `/api/gift/create`, `/api/gift/redeem` | Flow carte cadeau |
| `/api/currency` | Retourne `{ currency: "EUR"\|"USD" }` via `x-vercel-ip-country` (le champ `country` a été supprimé — privacy) |
| `/api/book-pdf` | **Génération PDF réel** (200×200mm, `application/pdf`) — `GET` pour Gelato (token HMAC signé requis), `@react-pdf/renderer`, même params que `preview-pdf` |
| `/api/preview-pdf` | Preview PDF HTML — `POST` pour l'aperçu in-app (session utilisateur requise, vérifie ownership du pet). `GET` (anciennement pour Gelato) remplacé par `book-pdf` |
| `/api/locale` | Setter cookie i18n |
| `/api/export-data` | Export RGPD — `GET` (session requise) retourne JSON avec toutes les données utilisateur : profil, pets, entrées, histoires, milestones, book_configs |

---

## Pages clés

| Route | Description |
|---|---|
| `/` | Landing page (EN par défaut) |
| `/auth/signup` | Inscription |
| `/dashboard` | Dashboard principal |
| `/dashboard/pets/[id]` | Profil animal + journal (tabs: journal / histoires IA / étapes) |
| `/dashboard/pets/[id]/order` | Commande livre — bouton "Sauvegarder cette config" (brouillon), chargement config via `?configId=`, CTA redirige vers Stripe si `plan=print && book_credits=0` |
| `/dashboard/pets/[id]/books` | Historique livres & brouillons — liste `book_configs`, statut Gelato temps réel, tracking, reprendre/recommander/supprimer |
| `/dashboard/settings` | Préférences utilisateur |
| `/pets/[id]` | Profil public animal |
| `/memorial/[id]` | Page mémorial publique ✅ — design dark, photo, message, histoires IA, OG meta |
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
    { "path": "/api/cron/retention-emails", "schedule": "0 9 * * *" }
  ]
}
```

Toutes les routes cron protégées par `Authorization: Bearer CRON_SECRET`.

Les 7 routes existent (les 3 dernières créées en session 24, PR #51).

---

## Gelato — Configuration livre

```ts
productUid: "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver"
pageCount: 28   // OBLIGATOIRE — sans ça Gelato retourne BAD_REQUEST
currency: "USD"
```

**Pricing livre dynamique** : `calcGelatoBookPrice(pageCount)` dans `src/lib/gelato-pricing.ts`. COGS Gelato : `15.46 + max(0,(n-30)/2)×0.395`. Marge fixe : +12€/USD. Prix minimum (28 pages) : ~27,46€.

**pageCount** : calculé par `calcPageCount(storiesCount, hasOrphanPhotos, hasDedication)` dans `src/lib/book.ts`. Doit correspondre exactement entre `gelato/order` et `book-pdf` (même algo best-match pour `hasOrphanPhotos`). Format Gelato : multiple de 4, minimum 28.

---

## Design system

### Palette de couleurs

```css
--cream:        #F7F2EA   /* fond principal dashboard */
--cream-card:   #FDFAF5   /* fond cartes / sidebar */
--cream-dark:   #EDE5D4   /* fond secondaire */
--brown:        #3D2B1F   /* texte principal */
--brown-mid:    #7A5C44   /* texte secondaire / muted */
--brown-light:  #9A8070   /* très muted */
--amber:        #C8813A   /* accent / CTA / états actifs */
--amber-light:  #E8A96A   /* hover accent */
--sage:         #6B7B5E   /* accents verts */
--error:        #A32D2D   /* erreurs / danger */
```

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

**Monétisation** : checkout + upgrade avec proration preview, webhook idempotent (dedup `events_log` par `stripe_event_id`), achat livre one-time à prix dynamique, flow cadeau complet (achat one-time → code promo → redeem avec coupon 100%, schedule si déjà abonné), factures, réactivation, changement de plan fin de période, gestion `payment_past_due` (bannière + email dunning 1ère tentative).

**Emails** (Resend) : templates harmonisés `src/lib/email-templates.ts` (`baseLayout`), auth hook Supabase (Standard Webhooks, HMAC fail-closed), crons rappel hebdo / histoire mensuelle / on-this-day / anniversaires / streak / prompts quotidiens / rétention D1-D7-D30, unsubscribe tokenisé.

**Pages publiques** : profil animal `/pets/[id]`, mémorial `/memorial/[id]` (dark, OG meta, hommages modérés rate-limités), share card Instagram (`/api/share-card`, edge, PNG square/story).

**i18n** : EN/FR auto via `navigator.language` (pas de switcher), `messages/{en,fr}.json`, landing FR autonome `/fr`.

**SEO / RGPD** : canonicals par page (relatives, résolues via `metadataBase`), `app/robots.ts` + `app/sitemap.ts` (routes metadata Next), noindex sur login/signup, metas dédiées gift/legal, homepage optimisée "ai pet journal" / "pet memory book" (title + H2 hero + H2 livre + CTA gift), JSON-LD homepage dans le server `page.tsx` : Organization + SoftwareApplication (sans aggregateRating — placeholders interdits) + FAQPage construit dynamiquement depuis `messages/en.json` `faq.q1..q6/a1..a6` (zéro drift schema/contenu), hreflang (homepage + /fr), cookie banner, export données JSON, suppression de compte complète. ⚠️ `fr/page.tsx` garde encore un `aggregateRating` factice à retirer (lot FR).

**Sécurité** : 13 rounds de review (détail dans docs/SESSIONS.md) — les règles qui en découlent sont codifiées dans « Conventions de code » ci-dessous.

**Qualité** : logs gatés (`src/lib/log.ts`, `DEBUG_LOGS=1`), rate-limit persistant Postgres (`checkRateLimitDb`), tests Vitest (plan guards, priceIdToPlan, calcPageCount, parseStoryResponse), hook SessionStart `npm install`.

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
- **Routes email hooks** (`confirm-signup`, `change-email`, `reset-password`) : vérification `Bearer ${SUPABASE_HOOK_SECRET}` fail-closed — retourner 401 immédiatement si la variable est absente.
- **`/api/generate`** : ne jamais faire confiance aux données du body client (petName, species, bio, entries). Re-fetcher depuis la DB après vérification de l'ownership du pet.
- **`/api/gelato/order`** : toujours filtrer les updates de stories par `user_id` (même avec service role). Consommer les crédits via `try_consume_book_credit` **avant** l'appel Gelato, et restaurer via `restore_book_credit` en cas d'échec.
- **`/api/preview-pdf`** : l'accès GET (Gelato) nécessite un token HMAC signé généré par `gelato/order`. L'accès POST (in-app) nécessite une session + vérification de l'ownership du pet. Ne jamais exposer le contenu du livre sans authentification. Les URLs insérées dans du CSS (`url('...')`) doivent être passées par `safeCssUrl()` qui échappe les apostrophes.
- **Helpers partagés** : pour escaper du HTML → `escapeHtml()` dans `src/lib/html.ts`. Pour escaper du XML dans les prompts IA → `escapeXml()` dans `src/lib/html.ts`. Pour détecter la locale d'un profil → `src/lib/locale.ts` (utilise `getServiceSupabase()` — pas de session requise). Pour le calcul du nombre de pages → `src/lib/book.ts`. Pour les tokens PDF → `src/lib/pdf-token.ts`. Pour mapper les erreurs Supabase Auth → messages FR/EN → `src/lib/auth-errors.ts` (`getSignupError`). Pour `verifyBearer` (Bearer token constant-time) et `validateRedirectTo` (open redirect guard) → `src/lib/auth.ts`. Ne pas réimplémenter ces fonctions inline.
- **Rate limiting** : le rate limiter in-memory (`src/lib/rate-limit.ts`) n'est PAS fiable sur Vercel serverless (cold start = reset, pas de partage entre instances). Pour les limites critiques, utiliser un count DB (voir `/api/generate`) ou Upstash Redis.
- **Comparaisons de secrets** : toujours utiliser `timingSafeEqual` de `node:crypto` pour comparer des tokens/secrets (Bearer, HMAC, etc.). Ne jamais utiliser `===` pour ces comparaisons — vulnérable aux attaques par timing.
- **Validation dates** : les paramètres `periodStart`/`periodEnd` reçus du client doivent être validés comme `YYYY-MM-DD` avant usage comme filtre DB.
- **Cookies** : tout cookie sensible posé via API doit avoir `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`. **Exception** : le cookie `locale` (préférence de langue) est intentionnellement sans `httpOnly` — il doit être lisible par `document.cookie` dans `useLocale`. La convention ne s'applique qu'aux données sensibles (session, tokens).
- **Prompts IA avec données utilisateur** : isoler les données dans des balises XML (`<pet_details>`, `<journal_entries>`) pour prévenir les injections de prompt ET appliquer `escapeXml()` sur chaque valeur insérée dans les balises. Voir `cron/monthly-story` et `/api/generate` pour le pattern.
- **Réponses API erreurs** : ne jamais retourner des détails d'erreurs internes (Stripe, Gelato, Anthropic) au client — les logger côté serveur et retourner uniquement un message générique.
- **UUID validation** : toujours valider `petId`, `storyId` et tout autre identifiant reçu du client via `UUID_REGEX` avant usage en DB ou en URL. La route `gelato/order` et `preview-pdf` font référence.
- **`/auth/callback` redirect** : `next` doit commencer par `/` ET ne pas commencer par `//` pour bloquer les redirects protocol-relative vers des domaines externes.
- **SEO / metadata** : ne jamais mettre de `alternates.canonical` ni `openGraph.url` dans le root layout — hérités par toutes les pages (bug duplicata homepage, corrigé session 56). Canonicals **relatives** (`/gift`), résolues via `metadataBase`. Le merge metadata Next est **shallow par clé top-level** : une page qui définit `openGraph` remplace **tout** l'objet og du layout → toujours fournir un og complet (title/url/siteName/type) quand on override. Pages `"use client"` : metadata via `layout.tsx` de segment (gift, auth) ou wrapper server `page.tsx` + composant client séparé (homepage → `home-client.tsx`). Jamais de `public/robots.txt` — conflit avec `app/robots.ts`.

---

## Checklist avant mise en production

- [x] Passer `STRIPE_SECRET_KEY` de `sk_test_...` à `sk_live_...` ✅ (2026-07-07, session 55)
- [x] Mettre à jour les `STRIPE_PRICE_ID_*` et `STRIPE_WEBHOOK_SECRET` en mode Live ✅ (2026-07-07 — catalogue live + endpoint webhook live `we_1TqHQk…`, 6 events dont `invoice.payment_succeeded` ajouté après coup, il manquait)
- [x] Publier l'application Google OAuth (retirer le mode Test) ✅
- [ ] Tester le webhook Stripe en mode Live avec un vrai paiement (page paiement OK 07-07 ; reste à valider l'activation du plan après paiement réel)
- [x] Vérifier que le cron weekly-reminder envoie bien les emails ✅ (sent:1 + email FR reçu, après fix `profiles.language` commit `c50bffc`)
- [x] Vérifier que Gelato est configuré avec une carte de paiement valide ✅
- [x] Exécuter `round2_security_fixes_2026_05_23.sql` + `round3_security_fixes_2026_05_26.sql` dans Supabase ✅
- [x] ~~Configurer `STRIPE_PRICE_BOOK_ONCE_EUR` + `STRIPE_PRICE_BOOK_ONCE_USD` dans Vercel~~ (obsolète — prix livre dynamique, vars supprimées)
- [x] Exécuter `fix_book_credits_print_plan_2026_05_27.sql` dans Supabase ✅

---

## Contexte marché

- **Cible** : pet parents US/UK, très attachés émotionnellement à leurs animaux
- **Différenciateur** : seule app combinant journal IA + livre imprimé physique
- **Concurrents directs** : 11Pets, PetNoter, DogNote (aucun ne propose un livre imprimé)
- **Canaux d'acquisition** : Reddit, Twitter/X, groupes Facebook pet parents, Product Hunt
- **Stratégie** : validation organique avant publicité payante

---

---

## Optimisation & dette technique (audit Pareto 2026-06-18)

Audit complet (perf / qualité / sécu / archi / robustesse) + rapport Pareto 10 items.

**Livré (commits sur `main`) :**
- **#1 Logs gatés** — `src/lib/log.ts` : `log.debug/info` silencieux sauf `DEBUG_LOGS=1` ; `warn/error` toujours. `console.*` → `log.*` sur 30 routes API (stop fuite user ids/payloads en logs prod).
- **#3 Client Anthropic unique** — `src/lib/anthropic.ts` : `callClaude()` (model `claude-sonnet-4-6`, version, timeout 30s, 1 retry sur 429/5xx/network) + `parseStoryResponse()`. Refacto des 4 sites (generate, generate-origins, story.ts ×2). Model id défini **une seule fois**.
- **#5 Singleton Supabase browser** — `src/lib/supabase/client.ts` réutilise une instance au lieu d'en créer une par render.
- **#7 Rate-limit persistant** — `checkRateLimitDb()` via RPC Postgres atomique `check_rate_limit` (migration `add_rate_limits_2026_06_18.sql` **appliquée en prod ✓**). Table `rate_limits` RLS-on sans policy, fonction SECURITY DEFINER, **fail-open**. Rewire 7 routes (contact, waitlist, gift-checkout, export-data, memorial tributes, suggestion, unsubscribe). L'ancien limiter in-memory (`checkRateLimit`) reste dispo mais non fiable serverless.
- **#10 Tests Vitest** — `npm test` ; `vitest.config.ts` avec alias `@`→`src` **manuel** (⚠️ PAS `vite-tsconfig-paths` : ESM-only, casse le config loader CJS). 16 tests : plan guards, priceIdToPlan, calcPageCount, parseStoryResponse.

**Écarté — #2 `select("*")` → colonnes explicites :** analysé, **aucun gain réel**, non appliqué. Toutes les occurrences restantes sont soit `select("*", { count, head: true })` (zéro ligne transférée), soit des selects dont **toutes les colonnes sont consommées** (PDF book/preview, gelato/order, book-configs, pet detail). Le seul candidat (5 entries récentes dashboard) gardait `content` (affiché) et cassait le type `Entry` → revert. Ne pas re-tenter sans nouveau besoin.

**Reportés — gros refactors (fort blast-radius) :**
- **#4 Rendu statique CDN landing** — bloqué : root `layout.tsx` lit `headers()` (x-pathname) juste pour fixer `<html lang>` fr/en → force **tout** le site en dynamique. Fix = restructurer en `/[locale]/` (recoupe #6). Risque SEO bilingue (hreflang) si bricolé.
- **#6 Dédup landing** — `/` (725 l) et `/fr` (570 l) = copie traduite manuelle → drift. Cible : 1 composant `<Landing locale>` piloté par `messages/*.json`.
- **#8 Dashboards client → Server Components** — ~10 pages font `getUser()` + `Promise.all` en `useEffect` (waterfall, requêtes exposées client). Migration RSC = data au 1er paint, moins de surface.
- **#9 Split god-components** — `pets/[id]/page.tsx` 131 Ko (308 `style={{}}` inline), `order` 81 Ko, `settings` 54 Ko. Extraire sous-composants + styles hors render.

*Dernière mise à jour : 2026-07-11 (Session 56 — SEO lot 1 : canonicals/robots/sitemap · lot 2 : on-page homepage, JSON-LD i18n-driven)*

---

## Historique des sessions

Historique complet (sessions 1 à 53, sprints, audits sécurité, UX) : **[docs/SESSIONS.md](docs/SESSIONS.md)**.
Seules les 2 dernières sessions sont conservées ici ; à chaque nouvelle session, déplacer la plus ancienne vers l'archive.

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

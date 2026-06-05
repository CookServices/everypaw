# CLAUDE.md — Everypaw

> Fichier de contexte projet pour Claude Code. Maintenu à la racine du repo.

---

## Instructions pour Claude

En fin de session, si des décisions importantes ont été prises ou du code significatif a été produit :
1. Mets à jour la section "État actuel / Fonctionnalités implémentées" avec ce qui a changé
2. Ajoute les nouvelles commandes découvertes
3. Note les décisions d'architecture dans "Conventions de code"
4. Mets à jour la date de dernière session

Ne demande pas confirmation — fais-le directement avant de clore.

Toujours auditer les fichiers existants avant de modifier quoi que ce soit. Suivre l'ordre d'implémentation recommandé pour toute nouvelle feature (voir section dédiée).

---

## Présentation du projet

**Everypaw** est une application web pour pet parents (chiens, chats) permettant de tenir un journal IA de leur animal et de le transformer en livre imprimé annuel.

- **URL** : https://everypaw.app
- **GitHub** : CookServices/everypaw (branch `main`)
- **Domaine** : everypaw.app (OVH → Vercel)
- **Statut** : MVP live, early-access — Stripe en mode **test** (à passer en Live avant lancement public)
- **Cible** : pet parents US (marché principal) + France (marché secondaire, route `/fr/`)
- **Différenciateur** : seule app combinant journal IA + livre imprimé physique

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
```

Pas de lint script ni de test suite configurés. Type-checker avec `npx tsc --noEmit` avant tout commit.

Déploiement sur **Vercel** — push sur `main` = auto-deploy. Les variables d'environnement (Supabase, Stripe, Gelato, Resend) ne vivent que sur Vercel ; pas de `.env.local` en local.

---

## Variables d'environnement (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

ANTHROPIC_API_KEY

STRIPE_SECRET_KEY              # sk_test_51TKay... (mode test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID_DIGITAL_EUR    # plan digital 4,99 €/mois (Europe)
STRIPE_PRICE_ID_DIGITAL_USD    # plan digital $4.99/mo (reste du monde)
STRIPE_PRICE_ID_PRINT_EUR      # plan print 9,99 €/mois (Europe)
STRIPE_PRICE_ID_PRINT_USD      # plan print $9.99/mo (reste du monde)
STRIPE_PRICE_ID_DIGITAL_ANNUAL_EUR  # plan digital annuel EUR (2,99 €/mois · 35,88 €/an)
STRIPE_PRICE_ID_DIGITAL_ANNUAL_USD  # plan digital annuel USD ($2.99/mo · $35.88/year)
STRIPE_PRICE_PRINT_ANNUAL           # plan print annuel legacy (fallback si EUR/USD absents)
STRIPE_PRICE_PRINT_ANNUAL_EUR       # plan print annuel EUR (79 €/an)
STRIPE_PRICE_PRINT_ANNUAL_USD       # plan print annuel USD ($79/year)
STRIPE_WEBHOOK_SECRET
STRIPE_GIFT_COUPON_ID          # coupon 100% off 12 mois

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
```

SQL migrations dans `supabase/migrations/`. Toujours utiliser `IF NOT EXISTS` et blocs `DO $$ … $$` pour rester idempotent.

---

## Plans & monétisation

| Plan | Prix | Accès |
|---|---|---|
| **Free** | $0 | 10 entrées max, 1 génération IA, 1 profil animal |
| **Premium Digital** | $4.99/mois | IA illimitée, multi-profils, pas de livre |
| **Premium Print** | $9.99/mois ou $79/an | Tout le digital + 1 livre hardcover annuel |
| **Livre à la carte** | $29 one-time | 1 livre unique (cadeau), sans accès premium digital |

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
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `invoice.payment_succeeded` — source unique pour les book credits Print (ajouté 2026-05-28)

**Idempotence webhook (2026-05-22)** : protection contre les retries Stripe.
- Abonnement : compare `stripe_subscription_id` en DB avant d'agir — skip si déjà activé.
- Achat livre : vérifie `events_log` via `metadata @> { stripe_event_id }` avant d'incrémenter les crédits ; insère une trace après succès.
- `subscription.updated` : loggé dans `events_log` (plan change + cancellation) depuis Round 2.
- `invoice.payment_succeeded` : idem — vérifie `events_log` par `stripe_event_id` avant `increment_book_credits`.
- Tous les événements loggent le Stripe event ID dès réception (`[webhook] event: evt_xxx …`).

**Book credits Print — source unique (2026-05-28)** : `invoice.payment_succeeded` est la seule source d'attribution des crédits livre pour les abonnés Print. `checkout.session.completed` n'attribue plus de crédit Print (race condition corrigée 2026-06-01). Conditions : `billing_reason === "subscription_create"` (1ère souscription) OU `"subscription_cycle"` (renouvellement) + price ID correspondant à un plan Print (mensuel ou annuel EUR/USD). Note : `invoice.payment_succeeded` doit être activé dans la config webhook Stripe.

**Prix livre dynamique (2026-06-01)** : `src/lib/gelato-pricing.ts` — `calcGelatoBookPrice(pageCount)` : `15.46 + max(0, (pages-30)/2) × 0.395 + 12€ marge fixe`. Même valeur EUR/USD. Utilisé par `/api/stripe/book-checkout` (achat one-time avec `price_data` Stripe) et affiché dans les encarts upsell de la page order.

---

## Architecture

**Next.js 14 App Router** — toutes les pages dans `src/app/`. Toutes les pages dashboard sont `"use client"` ; elles fetchent les données dans `useEffect` via le client Supabase browser.

### Supabase — trois clients

- `src/lib/supabase/client.ts` — client browser, utilisé dans toutes les pages `"use client"`
- `src/lib/supabase/server.ts` — client serveur (anon key + cookie auth), utilisé dans les routes API et le middleware
- `getServiceSupabase()` dans `src/lib/plan.ts` — client service role (bypass RLS) — utilisé dans le webhook Stripe, les cron jobs, gelato/order, preview-pdf (GET), la page publique `/pets/[id]`

**Règle** : ne jamais instancier `createClient` depuis `@supabase/supabase-js` directement dans une route. Utiliser `getServiceSupabase()` de `src/lib/plan.ts` pour le service role.

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
| `/api/stripe/checkout` | Checkout abonnement (accepte `{ plan: "digital" \| "print_monthly" \| "print_annual" }`) |
| `/api/stripe/book-checkout` | Achat livre one-time — prix dynamique via `calcGelatoBookPrice(pageCount)` + `price_data` Stripe, accepte `{ petId, pageCount }` |
| `/api/stripe/webhook` | Webhook Stripe (doit utiliser le client Supabase service role) |
| `/api/gelato/order` | Envoi commande à Gelato — sauvegarde/met à jour `book_configs` (status→ordered) après succès, accepte `bookConfigId` optionnel |
| `/api/gelato/status/[orderId]` | Proxy statut commande Gelato — ownership vérifié via `book_configs.gelato_order_id` |
| `/api/book-configs` | GET (liste par petId) + POST (create/update, max 15 drafts) |
| `/api/book-configs/[id]` | DELETE (owner-only) |
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
    { "path": "/api/cron/daily-prompts",   "schedule": "0 7 * * *" }
  ]
}
```

Toutes les routes cron protégées par `Authorization: Bearer CRON_SECRET`.

**Routes existantes** : `weekly-reminder` ✅, `monthly-story` ✅, `on-this-day` ✅  
**Routes manquantes** (dans vercel.json mais pas de fichier route) : `streak-alert`, `birthday-check`, `daily-prompts`

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
- **EUR/USD** (Point 5) : `STRIPE_PRICE_BOOK_ONCE_EUR` / `STRIPE_PRICE_BOOK_ONCE_USD` selon pays, fallback `STRIPE_PRICE_BOOK_ONCE`

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

---

## Checklist avant mise en production

- [ ] Passer `STRIPE_SECRET_KEY` de `sk_test_...` à `sk_live_...`
- [ ] Mettre à jour `STRIPE_PRICE_ID` et `STRIPE_WEBHOOK_SECRET` en mode Live
- [x] Publier l'application Google OAuth (retirer le mode Test) ✅
- [ ] Tester le webhook Stripe en mode Live avec un vrai paiement
- [ ] Vérifier que le cron weekly-reminder envoie bien les emails
- [ ] Vérifier que Gelato est configuré avec une carte de paiement valide
- [x] Exécuter `round2_security_fixes_2026_05_23.sql` + `round3_security_fixes_2026_05_26.sql` dans Supabase ✅
- [x] Configurer `STRIPE_PRICE_BOOK_ONCE_EUR` + `STRIPE_PRICE_BOOK_ONCE_USD` dans Vercel ✅
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

*Dernière mise à jour : 2026-06-05 (session 30 — password strength + export HTML + wording crédits)*

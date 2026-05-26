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
| Auth | Supabase Auth | Google OAuth + email/password — Google OAuth en mode **Test** (à publier avant lancement) |
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
WAITLIST_TO                    # email destinataire waitlist

CRON_SECRET                    # protège les routes /api/cron/*
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

```typescript
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

**Idempotence webhook (2026-05-22)** : protection contre les retries Stripe.
- Abonnement : compare `stripe_subscription_id` en DB avant d'agir — skip si déjà activé.
- Achat livre : vérifie `events_log` via `metadata @> { stripe_event_id }` avant d'incrémenter les crédits ; insère une trace après succès.
- `subscription.updated` : loggé dans `events_log` (plan change + cancellation) depuis Round 2.
- Tous les événements loggent le Stripe event ID dès réception (`[webhook] event: evt_xxx …`).

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

Messages dans `messages/en.json` et `messages/fr.json`. `src/lib/i18n.ts` charge les deux au build. `src/hooks/useLocale.ts` lit le cookie `locale` côté client et expose `{ t, locale, setLocale }`.

**Règle** : toujours ajouter les nouvelles clés dans les **deux** fichiers JSON.

### Dashboard layout & navigation

`src/app/dashboard/layout.tsx` rend `<DashboardNav>` (sidebar fixe desktop, bottom nav mobile) + `{children}`.

`src/components/DashboardNav.tsx` — composant central de navigation :
- **PetSelector** : liste tous les pets + "Tous mes animaux". Persiste le dernier pet visité dans `localStorage` (`lastPetId`)
- `showAll` state : `true` quand on est sur `/dashboard` (vue globale)
- Navigation tab-aware : les liens sidebar utilisent `?tab=journal|stories|milestones`
- Le switch de pet préserve l'onglet actif
- **Sidebar desktop** (3 zones) : sélecteur animal proéminent → nav principale 5 items → CTA "Ajouter un moment" → section secondaire (Paramètres, langue, déconnexion)
- **Mobile** : bottom nav 5 items + FAB orange flottant

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
| `/api/stripe/book-checkout` | Achat livre one-time |
| `/api/stripe/webhook` | Webhook Stripe (doit utiliser le client Supabase service role) |
| `/api/gelato/order` | Envoi commande à Gelato |
| `/api/cron/monthly-story` | Auto-génération histoires mensuelles |
| `/api/cron/weekly-reminder` | Rappels email via Resend |
| `/api/gift/create`, `/api/gift/redeem` | Flow carte cadeau |
| `/api/currency` | Retourne `{ currency: "EUR"\|"USD" }` via `x-vercel-ip-country` (le champ `country` a été supprimé — privacy) |
| `/api/preview-pdf` | Preview PDF HTML — `GET` pour Gelato (token HMAC signé requis), `POST` pour l'aperçu in-app (session utilisateur requise, vérifie ownership du pet) |
| `/api/locale` | Setter cookie i18n |

---

## Pages clés

| Route | Description |
|---|---|
| `/` | Landing page (EN par défaut) |
| `/auth/signup` | Inscription |
| `/dashboard` | Dashboard principal |
| `/dashboard/pets/[id]` | Profil animal + journal (tabs: journal / histoires IA / étapes) |
| `/dashboard/pets/[id]/order` | Commande livre |
| `/dashboard/settings` | Préférences utilisateur |
| `/pets/[id]` | Profil public animal |
| `/memorial/[id]` | Page mémorial (à implémenter) |
| `/gift` | Page cadeau |
| `/unsubscribe` | Désinscription emails (token) |

---

## Cron jobs (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/cron/weekly-reminder", "schedule": "0 8 * * 1" },
    { "path": "/api/cron/monthly-story",   "schedule": "0 8 1 * *"  }
  ]
}
```

Toutes les routes cron protégées par `Authorization: Bearer CRON_SECRET`.

---

## Gelato — Configuration livre

```typescript
productUid: "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver"
pageCount: 28   // OBLIGATOIRE — sans ça Gelato retourne BAD_REQUEST
currency: "USD"
```

**COGS livre : $15-25 (impression + shipping)** — raison pour laquelle le livre est séparé du plan Digital.

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
- Media queries dans `src/app/globals.css` (`.ep-sidebar`, `.ep-bottom-nav`, `.ep-fab`, `.ep-dashboard-main`)

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

### 🚧 Prochaine étape
- **Exécuter les migrations SQL** dans le dashboard Supabase (`round2_security_fixes_2026_05_23.sql` + précédentes si pas encore fait)
- Passer Stripe en mode **Live**
- Passer Google OAuth en mode **Published**
- Configurer `STRIPE_PRICE_BOOK_ONCE_EUR` et `STRIPE_PRICE_BOOK_ONCE_USD` dans Vercel (book-checkout EUR/USD)

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
- **Webhooks entrants** (Supabase auth hook) : toujours vérifier via HMAC-SHA256 sur le body brut (`req.text()` avant `JSON.parse`), comparer avec `timingSafeEqual`. Fail-closed : si la variable secrète est absente, retourner 401. Ne jamais utiliser une comparaison de chaîne simple ni un `if (secret)` qui laisse passer si la variable est vide.
- **Routes email hooks** (`confirm-signup`, `change-email`, `reset-password`) : vérification `Bearer ${SUPABASE_HOOK_SECRET}` fail-closed — retourner 401 immédiatement si la variable est absente.
- **`/api/generate`** : ne jamais faire confiance aux données du body client (petName, species, bio, entries). Re-fetcher depuis la DB après vérification de l'ownership du pet.
- **`/api/gelato/order`** : toujours filtrer les updates de stories par `user_id` (même avec service role). Consommer les crédits via `try_consume_book_credit` **avant** l'appel Gelato, et restaurer via `restore_book_credit` en cas d'échec.
- **`/api/preview-pdf`** : l'accès GET (Gelato) nécessite un token HMAC signé généré par `gelato/order`. L'accès POST (in-app) nécessite une session + vérification de l'ownership du pet. Ne jamais exposer le contenu du livre sans authentification. Les URLs insérées dans du CSS (`url('...')`) doivent être passées par `safeCssUrl()` qui échappe les apostrophes.
- **Helpers partagés** : pour escaper du HTML → `src/lib/html.ts`. Pour détecter la locale d'un profil → `src/lib/locale.ts` (utilise `getServiceSupabase()` — pas de session requise). Pour le calcul du nombre de pages → `src/lib/book.ts`. Pour les tokens PDF → `src/lib/pdf-token.ts`. Pour mapper les erreurs Supabase Auth → messages FR/EN → `src/lib/auth-errors.ts` (`getSignupError`). Ne pas réimplémenter ces fonctions inline.
- **Rate limiting** : le rate limiter in-memory (`src/lib/rate-limit.ts`) n'est PAS fiable sur Vercel serverless (cold start = reset, pas de partage entre instances). Pour les limites critiques, utiliser un count DB (voir `/api/generate`) ou Upstash Redis.
- **Comparaisons de secrets** : toujours utiliser `timingSafeEqual` de `node:crypto` pour comparer des tokens/secrets (Bearer, HMAC, etc.). Ne jamais utiliser `===` pour ces comparaisons — vulnérable aux attaques par timing.
- **Validation dates** : les paramètres `periodStart`/`periodEnd` reçus du client doivent être validés comme `YYYY-MM-DD` avant usage comme filtre DB.
- **Cookies** : tout cookie sensible posé via API doit avoir `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`. **Exception** : le cookie `locale` (préférence de langue) est intentionnellement sans `httpOnly` — il doit être lisible par `document.cookie` dans `useLocale`. La convention ne s'applique qu'aux données sensibles (session, tokens).
- **Prompts IA avec données utilisateur** : isoler les données dans des balises XML (`<pet_details>`, `<journal_entries>`) pour prévenir les injections de prompt. Voir `cron/monthly-story` pour le pattern.

---

## Checklist avant mise en production

- [ ] Passer `STRIPE_SECRET_KEY` de `sk_test_...` à `sk_live_...`
- [ ] Mettre à jour `STRIPE_PRICE_ID` et `STRIPE_WEBHOOK_SECRET` en mode Live
- [ ] Publier l'application Google OAuth (retirer le mode Test)
- [ ] Tester le webhook Stripe en mode Live avec un vrai paiement
- [ ] Vérifier que le cron weekly-reminder envoie bien les emails
- [ ] Vérifier que Gelato est configuré avec une carte de paiement valide
- [ ] Exécuter `supabase/migrations/round2_security_fixes_2026_05_23.sql` dans le dashboard Supabase (RPCs `try_consume_book_credit` + `restore_book_credit`)

---

## Contexte marché

- **Cible** : pet parents US/UK, très attachés émotionnellement à leurs animaux
- **Différenciateur** : seule app combinant journal IA + livre imprimé physique
- **Concurrents directs** : 11Pets, PetNoter, DogNote (aucun ne propose un livre imprimé)
- **Canaux d'acquisition** : Reddit, Twitter/X, groupes Facebook pet parents, Product Hunt
- **Stratégie** : validation organique avant publicité payante

---

*Dernière mise à jour : 2026-05-26 (session 15 — fix switch langue, PublicNav/Footer partagés, FAQ Q3, bouton Modifier page mémorial + auto-open modal dashboard)*

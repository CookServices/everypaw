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
- **Cible** : pet parents US/UK, très attachés émotionnellement à leurs animaux
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
STRIPE_PRICE_PRINT_ANNUAL      # plan print annuel (partagé EUR/USD jusqu'à séparation)
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
Book credits : incrémentés atomiquement via RPC Postgres `increment_book_credits`.

Le webhook (`/api/stripe/webhook`) gère :
- `checkout.session.completed`
- `customer.subscription.deleted`
- `customer.subscription.updated`

**Idempotence webhook (2026-05-22)** : protection contre les retries Stripe.
- Abonnement : compare `stripe_subscription_id` en DB avant d'agir — skip si déjà activé.
- Achat livre : vérifie `events_log` via `metadata @> { stripe_event_id }` avant d'incrémenter les crédits ; insère une trace après succès.
- Tous les événements loggent le Stripe event ID dès réception (`[webhook] event: evt_xxx …`).

---

## Architecture

**Next.js 14 App Router** — toutes les pages dans `src/app/`. Toutes les pages dashboard sont `"use client"` ; elles fetchent les données dans `useEffect` via le client Supabase browser.

### Supabase — deux clients

- `src/lib/supabase/client.ts` — client browser, utilisé dans toutes les pages `"use client"`
- `src/lib/supabase/server.ts` — client serveur, utilisé dans les routes API et le middleware
- `getServiceSupabase()` dans `src/lib/plan.ts` — client service role (bypass RLS), uniquement dans le webhook Stripe

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
| `/api/currency` | Retourne `{ currency: "EUR"\|"USD", country }` via `x-vercel-ip-country` |
| `/api/preview-pdf` | Preview PDF via `@react-pdf/renderer` |
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
- `GET /api/currency` lit `x-vercel-ip-country`, retourne `{ currency, country }` — fallback USD
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
- Route convertie de POST → **GET** (Gelato fetch le fichier en GET depuis ses serveurs)
- **Service role** : plus d'auth session requise (petId UUID = token implicite)
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

### 🚧 Prochaine étape
- Passer Stripe en mode **Live**
- Passer Google OAuth en mode **Published**
- Chapitre mensuel automatique (cron IA le 1er de chaque mois)
- Page mémorial complète (`/memorial/[id]`)
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

---

## Checklist avant mise en production

- [ ] Passer `STRIPE_SECRET_KEY` de `sk_test_...` à `sk_live_...`
- [ ] Mettre à jour `STRIPE_PRICE_ID` et `STRIPE_WEBHOOK_SECRET` en mode Live
- [ ] Publier l'application Google OAuth (retirer le mode Test)
- [ ] Tester le webhook Stripe en mode Live avec un vrai paiement
- [ ] Vérifier que le cron weekly-reminder envoie bien les emails
- [ ] Vérifier que Gelato est configuré avec une carte de paiement valide

---

## Contexte marché

- **Cible** : pet parents US/UK, très attachés émotionnellement à leurs animaux
- **Différenciateur** : seule app combinant journal IA + livre imprimé physique
- **Concurrents directs** : 11Pets, PetNoter, DogNote (aucun ne propose un livre imprimé)
- **Canaux d'acquisition** : Reddit, Twitter/X, groupes Facebook pet parents, Product Hunt
- **Stratégie** : validation organique avant publicité payante

---

*Dernière mise à jour : 2026-05-23 (session 8 — fix pricing annuel : badge −34%, Digital $2.99/mo en annuel)*

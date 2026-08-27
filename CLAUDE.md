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

## Deployment & Staging

**Architecture: two Vercel projects, one repo (free plan)**

The Hobby plan does not allow a separate Preview environment alongside Production on a single
project, so the repo is connected to **two** Vercel projects:

| Project | Role | URL |
| --- | --- | --- |
| `everypaw` | Production | `everypaw.app` |
| `everypaw-staging` | Preview (per PR) | `everypaw-staging-git-<branch>-*.vercel.app` |

**Both still share the same Supabase project** — `everypaw-staging` is a separate *Vercel* project,
not a separate database. The name is misleading: there is no isolated staging data.

### Workflow

```
1. Feature branch → Push to GitHub
2. Create PR → both projects post a preview URL
3. Test on the everypaw-staging preview URL (shares prod Supabase DB)
4. Review + Approve PR (GitHub ruleset required)
5. Merge main → Auto deploy prod (everypaw.app)
```

A PR comment shows a preview for `everypaw` too. **Ignore it** — that project is configured for
Production only, so its previews 500 on every service-role route (see below).

### Environment Variable Scoping

Vercel bakes env vars at build time and scopes them per environment, **per project**. Adding a
variable to one project does nothing for the other, and an existing deployment never picks up a
newly added variable — it needs a redeploy.

`SUPABASE_SERVICE_ROLE_KEY` must be present on the **Preview** scope of `everypaw-staging`.
Without it, `getServiceSupabase()` throws and **every service-role path 500s**: all 8 crons, the
Stripe webhook and subscription routes, Gelato order, the PDF routes, account deletion,
pet-members, memorial tributes, share-card, plus the public SSR pages `pets/[id]` and
`memorial/[id]`. The app still loads and hydrates (the `NEXT_PUBLIC_*` vars are separate), which
makes the failure look like an application bug rather than a config gap.

To check the current scoping without reading any secret value:

```bash
npx vercel link --yes --project everypaw-staging
npx vercel env ls          # shows name + environments, never values
```

Quick probe for whether a deployment has the service key: open a public pet page
(`/pets/<id>`). It calls `getServiceSupabase()` with no auth, so it renders when the key is
present and returns a server exception when it is missing. Do **not** probe with an API route
that checks auth first — it returns 401 either way and tells you nothing.

### GitHub Branch Protection (`main`)

Ruleset `main-protection` (configured 2026-07-23):
- ✓ Require PR review before merge
- ✓ Block force pushes
- ✓ No status checks required (TODO: add after Vercel build status configured)

### Test Data Discipline

Preview deployments share production Supabase (no separate staging DB = free tier limitation).
This holds despite the `everypaw-staging` project name — every preview writes to real production
data, so the rules below are not optional.

**Rules:**
- Use test accounts only: `test-*@yopmail.com` (password `Test1234!`)
- Never commit/push production user data
- Clean test entries before demo
- Test accounts list maintained in project memory

### Preview Limitations

- Crons (weekly-reminder, monthly-story, etc.) do NOT run on preview — test manually or on prod
- Stripe webhook testing → use Stripe test mode, not preview
- Long-running tasks may timeout (preview cold-starts)
- **Email flows can NOT be completed on a preview** — they always land back on production

#### Why email flows redirect to production

`validateRedirectTo` (`lib/auth.ts`) compares the requested `redirect_to` hostname against
`NEXT_PUBLIC_APP_URL` and falls back to the production URL when it does not match. This is an
open-redirect guard, so it fires for every `*.vercel.app` preview host.

Affected: password reset, signup confirmation, email change.

Concretely, for a password reset requested from a preview:

1. `forgot-password` sends `redirect_to = <preview-origin>/auth/update-password`
2. `validateRedirectTo` rejects the preview hostname and substitutes the production URL
3. The emailed link lands on `everypaw.app/auth/update-password`, so the recovery session
   belongs to the **production** domain
4. Entering the new password back on the preview fails with "Lien de réinitialisation invalide
   ou expiré" — `auth/update-password` only reads the session from the URL hash, and there is
   none on that origin

**Workaround:** finish the email flow on `everypaw.app`, then sign in on the preview. Preview and
production share the same Supabase project, so the credential works on both.

### When You Need Real Staging

If you need isolated test data (persistent staging DB, crons running, webhook testing):
- Upgrade Supabase to Pro (~$25/mo) to unlock preview branches
- Create `staging` branch → separate Supabase project → own env vars in Vercel
- Not currently implemented (cost/complexity trade-off)

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

GELATO_API_KEY                  # print-on-demand — requis par /api/gelato/order et /api/gelato/status/[orderId]

NEXT_PUBLIC_APP_URL             # base URL utilisée pour les liens absolus (emails, redirects Stripe/Gelato)
PDF_ACCESS_SECRET                # signe le token HMAC court-terme de /api/book-pdf — fallback sur SUPABASE_SERVICE_ROLE_KEY si absent (le renseigner explicitement en prod)
CRON_SECRET                    # protège les routes /api/cron/*

# Auth Hook (Supabase → /api/emails/auth-hook)
SUPABASE_HOOK_SECRET           # format "v1,whsec_<base64>" — copier depuis Supabase > Auth > Hooks > Send Email > Reveal
                               # Si absent → hook retourne 401 → Supabase retourne 500 sur signup/reset
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

  **Test webhook via Stripe CLI (2026-07-13)** — procédure locale réutilisable :
  1. `stripe login` (compte Everypaw `acct_...RmAiDTHhpu`). 2. `.env.local` : `SUPABASE_SERVICE_ROLE_KEY` (depuis Supabase → Settings → API `service_role`) + `STRIPE_WEBHOOK_SECRET` = le `whsec_` affiché par `stripe listen`. 3. `npm run dev` (⚠️ prend le 1er port libre, souvent **3001** si 3000 occupé — le `stripe listen --forward-to` doit viser le **bon port**). 4. `stripe listen --forward-to localhost:3001/api/stripe/webhook` (le `whsec_` est **stable par compte**, inchangé entre relances). 5. `stripe trigger invoice.payment_failed` (3e terminal).
  - **Résultat Niveau 1 validé** : event `invoice.payment_failed` → `[200]`, log `[webhook] invoice.payment_failed: no profile for customer: cus_...` → **signature vérifiée fail-closed + 200 + chemin "profil introuvable" sans crash**. Le customer jetable du `trigger` ne matche aucun profil → 0 write DB (retour avant l'insert `events_log`).
  - **Niveau 2 (flag + events_log + email + idempotence par `stripe events resend`) non exécuté** : requiert `STRIPE_SECRET_KEY` en **`sk_test`** (le billing portal du mail cible un customer test — une `sk_live` échoue « No such customer », l'email est capté par le try/catch, non-fatal) + un profil dont `stripe_customer_id` matche l'event (toucherait un profil prod). Le flag/events_log/email reste validé par revue de code + le handler tourne en prod sur les vrais échecs de paiement live.
  - ⚠️ En local, `NEXT_PUBLIC_SUPABASE_URL` pointe la **prod** : rester au Niveau 1 (aucun write) sauf projet Supabase de test dédié.

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
| `/memorial` | Landing marketing publique « pet memorial book » (server component, ton sobre, palette cream+sage) — distincte des pages user `/memorial/[id]` |
| `/blog` | Index blog SEO (cluster « pet memory ») — cards des articles publiés, empty state si aucun |
| `/blog/[slug]` | Article : 1 `page.tsx` écrit à la main par slug, via `ArticleLayout` + JSON-LD Article |
| `/fr/blog` | Index blog FR — mêmes 9 articles, slugs traduits |
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
    { "path": "/api/cron/first-story-nudge", "schedule": "0 10 * * *" }
  ]
}
```

Toutes les routes cron protégées par `Authorization: Bearer CRON_SECRET`.

Les 8 routes existent (les 3 de `on-this-day`/`streak-alert`/`birthday-check` créées en session 24, PR #51 ; `first-story-nudge` ajoutée session 58).

---

## Gelato — Configuration livre

```ts
productUid: "photobooks-hardcover_pf_200x200-mm-8x8-inch_pt_170-gsm-65lb-coated-silk_cl_4-4_ccl_4-4_bt_glued-left_ct_matt-lamination_prt_1-0_cpt_130-gsm-65-lb-cover-coated-silk_ver"
pageCount: 28   // OBLIGATOIRE — sans ça Gelato retourne BAD_REQUEST
currency: "USD"
```

**Pricing livre dynamique** : `calcGelatoBookPrice(pageCount)` dans `src/lib/gelato-pricing.ts`. COGS Gelato : `15.46 + max(0,(n-30)/2)×0.395`. Marge fixe : +12€/USD. Résultat passé par `Math.ceil` → prix minimum (28 pages) = **28€/$28** (pas 27,46 — le COGS brut est 27.46, le prix affiché/facturé est arrondi au-dessus). Cohérent avec le tableau des plans plus haut.

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

**Emails** (Resend) : templates harmonisés `src/lib/email-templates.ts` (`baseLayout`), auth hook Supabase (Standard Webhooks, HMAC fail-closed), crons rappel hebdo / histoire mensuelle / on-this-day / anniversaires / streak / prompts quotidiens / rétention D1-D7-D30 / nudge premier chapitre (J+2-3, `first-story-nudge`), unsubscribe tokenisé.

**Pages publiques** : profil animal `/pets/[id]`, mémorial `/memorial/[id]` (dark, OG meta, hommages modérés rate-limités), share card Instagram (`/api/share-card`, edge, PNG square/story).

**i18n** : hybride (Session 57) — pages marketing (`/`, `/fr`, `/gift`, `/fr/gift`) en langue **figée par URL**, server-rendered, composants client locale-aware partagés (plus de duplication `/fr`) ; dashboard + reste en `useLocale` auto (`navigator.language`). `messages/{en,fr}.json`, lien switch crawlable dans le footer marketing.

**SEO / RGPD** : canonicals par page (relatives, résolues via `metadataBase`), `app/robots.ts` + `app/sitemap.ts` (routes metadata Next), noindex sur login/signup, metas dédiées gift/legal, homepage optimisée "ai pet journal" / "pet memory book" (title + H2 hero + H2 livre + CTA gift), JSON-LD homepage dans le server `page.tsx` : Organization + SoftwareApplication (sans aggregateRating — placeholders interdits) + FAQPage construit dynamiquement depuis `messages/en.json` `faq.q1..q6/a1..a6` (zéro drift schema/contenu), hreflang réciproque sur les 4 routes marketing (`/`↔`/fr`, `/gift`↔`/fr/gift`), cookie banner, export données JSON, suppression de compte complète. `aggregateRating` factice retiré partout (Session 57).

**Sécurité** : 13 rounds de review (détail dans docs/SESSIONS.md) — les règles qui en découlent sont codifiées dans « Conventions de code » ci-dessous. Un audit indépendant plus récent (2026-07-06, `docs/AUDIT_REPORT.md` + `docs/AUDIT_PLAN.md` + `docs/AUDIT_REPORT_QUALITY.md`) a trouvé 13 findings dont 1 CRITIQUE (RPC crédits-livre exposées à tout utilisateur authentifié, self-crediting possible) ; 12/13 corrigés le jour même, dont le critique via `revoke_book_credit_rpc_2026_07_06.sql`. **Avant tout nouveau round de sécurité, lire ces 3 fichiers** — ils documentent aussi les zones volontairement non auditées (composants client Z8, scripts one-shot).

**Qualité** : logs gatés (`src/lib/log.ts`, `DEBUG_LOGS=1`), rate-limit persistant Postgres (`checkRateLimitDb`), tests Vitest (plan guards, priceIdToPlan, calcPageCount, parseStoryResponse), hook SessionStart `npm install`.

Meta Pixel événements custom : CompleteRegistration (signup) + ViewContent (landing) — installés via src/lib/pixel.ts

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
2. `npm test` → tous les tests verts, pas seulement ceux du fichier touché (couvre les guards de plan, `priceIdToPlan`, `calcPageCount`, `parseStoryResponse`, `evaluateFirstStoryNudge`).
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
- Idempotence webhook Stripe (dedup `events_log` par `stripe_event_id`) et source unique des book credits Print (`invoice.payment_succeeded`).
- Cohérence `pageCount` entre `gelato/order` et `book-pdf` (même algo `hasOrphanPhotos`), et cohérence du prix livre (`calcGelatoBookPrice`) avec le tableau des plans.
- `x-pathname` posé par `src/middleware.ts` (utilisé par le root layout pour `<html lang>`).

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
- **#10 Tests Vitest** — `npm test` ; `vitest.config.ts` avec alias `@`→`src` **manuel** (⚠️ PAS `vite-tsconfig-paths` : ESM-only, casse le config loader CJS). 4 fichiers (`plan.test.ts`, `book-pages.test.ts`, `anthropic.test.ts`, `story.test.ts`), 21 cas au 2026-07-15 — ne pas figer ce nombre dans la doc, se fier à `npm test` pour l'état réel.

**Écarté — #2 `select("*")` → colonnes explicites :** analysé, **aucun gain réel**, non appliqué. Toutes les occurrences restantes sont soit `select("*", { count, head: true })` (zéro ligne transférée), soit des selects dont **toutes les colonnes sont consommées** (PDF book/preview, gelato/order, book-configs, pet detail). Le seul candidat (5 entries récentes dashboard) gardait `content` (affiché) et cassait le type `Entry` → revert. Ne pas re-tenter sans nouveau besoin.

**Pages légales FR — ✅ résolu (Session 59, 2026-07-17), vérifié 2026-07-22 :** les 3 redirects retirés de `next.config.js`, vraies pages FR servies (`cgv` 100L, `confidentialite` 57L, `mentions` 56L), metadata complètes (canonical + og) + hreflang réciproque EN↔FR sur les 6 pages légales, 3 URLs FR dans le sitemap. Plus de code mort à ce sujet.

**Reportés — gros refactors (fort blast-radius) :**
- **#11 Gate GA4 + Meta Pixel au consentement cookie** — les deux trackers (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, [layout.tsx](src/app/layout.tsx)) fire inconditionnellement au chargement, sans attendre de consentement. Le [CookieBanner](src/components/CookieBanner.tsx) affiche « aucun tracking » / « no tracking » et n'a qu'un bouton Accepter (pas de Refuser) — contradiction directe avec le texte + non-conforme ePrivacy/CNIL (mesure d'audience + pub = opt-in explicite requis avant fire). Décision assumée (2026-08-17/18) de poser les deux trackers d'abord, gate plus tard. À faire : bouton Refuser, ne charger les scripts gtag/fbevents qu'après acceptation (ou Google Consent Mode v2 pour GA4), réécrire le texte du bandeau.
- **#4 Rendu statique CDN landing** — bloqué : root `layout.tsx` lit `headers()` (x-pathname) juste pour fixer `<html lang>` fr/en → force **tout** le site en dynamique. Fix = restructurer en `/[locale]/` (recoupe #6). Risque SEO bilingue (hreflang) si bricolé.
- ~~**#6 Dédup landing**~~ ✅ **résolu (Session 57)** — `/` et `/fr` partagent `home-client.tsx` (`<Home locale>`), plus de copie manuelle. Idem gift (`gift-client.tsx`).
- **#8 Dashboards client → Server Components** — ~10 pages font `getUser()` + `Promise.all` en `useEffect` (waterfall, requêtes exposées client). Migration RSC = data au 1er paint, moins de surface.
- **#9 Split god-components** — en cours, incrémental (voir Session 61). `pets/[id]/page.tsx` **✅ résolu** (2122→1017 l, PR #83-85, 2026-07-23) sauf onglet journal (~50 state, volontairement laissé). `order/page.tsx` 1625→1435 l (PR #99-100, constantes/utils + 2 composants) — reste `renderPreviewStep` (492 l) + 3 autres render-closures, bloqués sur design d'un bundle "theme props" (`accentColor`/`textPrimary`/`textMuted`/`isMemorial` partagés). `settings/page.tsx` 964→866 l (PR #101, constantes + 2 modales) — reste ~800 l de JSX/handlers, même blocage.

*Dernière mise à jour : 2026-08-20 (Session 61 — dédup `compressImage` (4→1 copie), découpe `order/page.tsx` et `settings/page.tsx` en PR incrémentales testées sur preview Vercel avant merge)*

---

## Historique des sessions

Historique complet (sessions 1 à 53, sprints, audits sécurité, UX) : **[docs/SESSIONS.md](docs/SESSIONS.md)**.
Seules les 2 dernières sessions sont conservées ici ; à chaque nouvelle session, déplacer la plus ancienne vers l'archive.

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

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
- **An env var scoped to Production only is absent on preview**, and every route that needs it
  fails there with an unhandled 500 (see below)

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

#### Env vars need the Preview scope explicitly

Vercel env vars carry a target scope. One added to Production alone simply does not exist in
preview deployments, and nothing warns you: the deployment builds and serves normally until a
request hits code that reads the variable.

`SUPABASE_SERVICE_ROLE_KEY` sat in Production scope alone for 119 days (found 2026-09-01, fixed
the same day). Every preview request reaching `getServiceSupabase()` threw:

```
Error: Missing environment variable(s): SUPABASE_SERVICE_ROLE_KEY.
Service-role Supabase calls cannot run. Check the environment scope (Preview vs Production).
```

That is **24 API routes**: `gelato/order`, `stripe/{book-checkout,subscription,webhook}`,
`account/delete`, `invite/[token]`, `memorial/tributes`, `pet-members`, `share-card`,
`book-pdf`, `preview-pdf`, and the 7 crons. "Just test it on preview" was quietly false for all
of them throughout that window, which is worth remembering when reading older session notes that
claim a preview test passed.

Auditing the scopes:

```bash
vercel env ls
```

The `environments` column must show Preview, not only Production.

Two traps when fixing one:

- Adding a scope does **not** touch existing deployments. Redeploy before retesting, with
  `vercel redeploy <preview-url>` or a fresh push.
- In the dashboard, plain Preview scoping lives under the **Environments** submenu and works on
  the Hobby plan. **Preview Branches**, right next to it, is per-branch values and is Pro-only,
  so hitting a paywall there does not mean Preview scoping is unavailable.

**Note (Session 64) :** les liens signup/recovery/email_change ne passent plus par `confirmation_url`
PKCE ni par `validateRedirectTo` — ils pointent tous vers `${APP_URL}/auth/confirm` (jamais une origine
preview), ce qui rend la substitution ci-dessus sans effet pratique pour ces 3 flux. Détail complet
(cause racine, fix, validation prod) dans « Historique des sessions » → Session 64.

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
- **Confirmation email** (`/auth/confirm`, `type=signup|recovery|email_change`) : vérifie `token_hash` côté serveur via `supabase.auth.verifyOtp({ type })` — jamais via le `confirmation_url` PKCE fourni par Supabase, qui exige le `code_verifier` du navigateur d'origine (absent si le lien est ouvert ailleurs, cause du bug production du 2026-08-31, voir Session 64). `email_change` a en plus un bug distinct (token vide, voir Session 64) : "Secure email change" étant désactivé, `token_hash_new` arrive en chaîne vide plutôt qu'absent → toujours utiliser `||` pour retomber sur `token_hash`, jamais `??`. Les anciennes routes `confirm-signup`/`change-email`/`reset-password` (auth Bearer simple, jamais appelées depuis la bascule vers `auth-hook`) ont été supprimées à cette occasion.
- **`/api/generate`** : ne jamais faire confiance aux données du body client (petName, species, bio, entries). Re-fetcher depuis la DB après vérification de l'ownership du pet.
- **`/api/gelato/order`** : toujours filtrer les updates de stories par `user_id` (même avec service role). Consommer les crédits via `try_consume_book_credit` **avant** l'appel Gelato, et restaurer via `restore_book_credit` en cas d'échec.
- **Prix Stripe jamais depuis le client** : `/api/stripe/book-checkout` calculait le prix depuis un `pageCount` envoyé par le client (juste validé `28-500`) — `/api/gelato/order` recalcule le vrai `pageCount` côté serveur indépendamment et ne le compare jamais au prix payé, donc n'importe qui pouvait payer le minimum en déclarant `pageCount: 28` et recevoir un livre à la taille réelle de son contenu. Corrigé Session 64 (PR #115) : le prix se calcule désormais côté serveur au pire cas (`calcPageCount` sur toutes les stories du pet, dédicace/photos orphelines/tributs supposés présents — fonction monotone, donc toujours ≥ ce que `gelato/order` calculera réellement). Règle générale : **tout montant facturé doit être recalculé côté serveur à partir de données de confiance, jamais accepté tel quel depuis le body client** — vaut pour toute future route Stripe `price_data`/`unit_amount` dynamique.
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
- ~~**#11 Gate GA4 + Meta Pixel au consentement cookie**~~ ✅ **résolu (Session 66, PR [#127](https://github.com/CookServices/everypaw/pull/127))** : blocage dur des deux trackers, aucun script injecté avant acceptation.
  - **Le nœud** : `layout.tsx` est un composant serveur, la décision vit dans `localStorage`. Le serveur ne peut donc pas la lire, et les `<Script>` ont dû sortir vers un composant client, [Trackers.tsx](src/components/Trackers.tsx), qui ne rend rien tant que le consentement manque.
  - [lib/consent.ts](src/lib/consent.ts) porte le contrat, 12 tests. Clé **versionnée** (`cookie_consent_v2`) : les consentements recueillis sous l'ancien bandeau l'ont été sur une information fausse, ils ne valaient rien, tout le monde est resollicité. L'écriture émet un événement `window` parce que l'événement `storage` natif **ne se déclenche pas** dans l'onglet qui écrit ; sans lui, accepter n'allumerait les trackers qu'au rechargement suivant.
  - Le `<noscript>` du pixel Meta est supprimé : il tire vers Facebook sans JavaScript, donc sans consentement possible. **Conséquence assumée** : les visiteurs sans JavaScript ne sont plus comptés.
  - Retrait du consentement ajouté (hors périmètre initial, mais exigé par le RGPD) : « Gérer les cookies » dans les deux variantes de [PublicFooter](src/components/PublicFooter.tsx) efface la décision et ramène le bandeau.
  - Le bandeau suit désormais la locale de la **page** et non `navigator.language`, sinon il pouvait s'afficher en français à côté d'un bouton de footer en anglais.
  - Vérifié sur preview Vercel : avant choix et après Refuser, `gtag` et `fbq` indéfinis avec zéro requête vers Google ou Meta ; après Accepter, les deux deviennent des fonctions et les requêtes partent. Retrait vérifié aussi, bandeau qui revient sans rechargement.
  - A nécessité d'ajouter `NEXT_PUBLIC_GA_MEASUREMENT_ID` et `NEXT_PUBLIC_META_PIXEL_ID` au scope Preview (cf. « Env vars need the Preview scope explicitly »). Les entrées Production existantes sont de type Secret, donc non convertibles en Config : de nouvelles entrées Preview ont été créées à côté, sans toucher aux premières.
- **#4 Rendu statique CDN landing** — bloqué : root `layout.tsx` lit `headers()` (x-pathname) juste pour fixer `<html lang>` fr/en → force **tout** le site en dynamique. Fix = restructurer en `/[locale]/` (recoupe #6). Risque SEO bilingue (hreflang) si bricolé.
- ~~**#6 Dédup landing**~~ ✅ **résolu (Session 57)** — `/` et `/fr` partagent `home-client.tsx` (`<Home locale>`), plus de copie manuelle. Idem gift (`gift-client.tsx`).
- **#8 Dashboards client → Server Components** — ~10 pages font `getUser()` + `Promise.all` en `useEffect` (waterfall, requêtes exposées client). Migration RSC = data au 1er paint, moins de surface.
- ~~**#9 Split god-components**~~ ✅ **résolu (Session 66, PR [#123](https://github.com/CookServices/everypaw/pull/123))** : les 3 god-components sont traités.
  - `pets/[id]/page.tsx` : 2122 à 1017 l (PR #83-85, 2026-07-23), sauf onglet journal (~50 state, volontairement laissé).
  - `order/page.tsx` : 1625 à 769 l. Les 4 render-closures restantes extraites (`SuccessStep`, `UpsellBanners`, `ConfirmStep`, `AddressStep`), puis `renderPreviewStep` (492 l) splitté en 5 sous-composants (`YearAndTheme`, `BookCover`, `ContentSummary`, `ChapterSelector`, `PreviewActions`) plutôt qu'un composant unique à ~55 props.
  - `settings/page.tsx` : 878 à 577 l, 6 sections extraites (`SubscriptionSection`, `InvoicesSection`, `PreferencesSection`, `AccountSecuritySection`, `DataExportSection`, `DangerZoneSection`). Pas de blocage theme props ici, les couleurs sont en dur.
  - **Blocage "theme props" levé** en gardant des props plates, comme `Stepper.tsx`/`PreviewModal.tsx` déjà extraits : ni Context ni bundle d'objets introduits, aucune nouvelle convention. Types `Address` (order) et `Invoice` (settings) dédupliqués dans leurs `constants.ts` respectifs.
  - Vérifié sur preview Vercel, compte réel : les 6 sections de settings (dont `InvoicesSection` correctement absente à 0 facture), l'étape aperçu de order, et le câblage des props par interaction (changement de thème et titre custom se propagent bien de `YearAndTheme` vers `BookCover`, saisie du code cadeau, ouverture de la modale de suppression). `tsc --noEmit` sans nouvelle erreur.
  - **Non vérifié** : les étapes adresse et paiement, voir #15.
- **#12 Interaction `stripe/cancel`/`reactivate` ↔ `stripe/upgrade` (Session 64→65)** — scénario (a) : ~~annuler puis appeler `upgrade`~~ ✅ **résolu (Session 65, PR [#121](https://github.com/CookServices/everypaw/pull/121))** — confirmé par lecture de code (`subscriptionSchedules.update()` écrasait `end_behavior` à `"release"` sans jamais lire `cancel_at_period_end`, ce qui levait silencieusement l'annulation, DB/UI comprises via le webhook). Fix : `upgrade` et `upgrade-preview` refusent désormais (400) si `cancel_at_period_end` est vrai, message "reactivate first". **Scénario (b) reste ouvert** : upgrade programmé (schedule actif) puis `cancel` — pas confirmable par lecture de code seule, nécessite une souscription Stripe test-mode réelle (plan de test donné à Julien en session, pas encore exécuté).
- ~~**#13 `OnboardingModal` ignore `hasPets`/`hasEntries`/`hasStories`**~~ ✅ **résolu (Session 65, PR [#119](https://github.com/CookServices/everypaw/pull/119))** — chaque étape affiche désormais sa copie `*_done` déjà écrite (`step1_done`/`step2_done`/`step3_done`) et une action neutre (avancer/fermer) quand le jalon correspondant est déjà atteint.
- ~~**#14 Clés i18n mortes `onboarding.step2_cta`/`step3_cta`**~~ ✅ **résolu (Session 65, PR [#119](https://github.com/CookServices/everypaw/pull/119))** — câblées comme label principal des étapes 2/3 côté "pas encore fait" (remplace le générique `next`/`start`), plus `got_it` câblé pour l'étape 3 "déjà fait".
- **#15 Étapes adresse et paiement de `order` jamais reparcourues depuis le split (Session 66)** : `AddressStep` et `ConfirmStep` (PR [#123](https://github.com/CookServices/everypaw/pull/123)) sont partis en production sans qu'on ait déroulé les étapes 2 et 3. Cause : le compte de test utilisé était en plan gratuit, or le CTA qui mène à l'étape adresse y est désactivé par design, donc le parcours était inatteignable depuis l'interface. Le reste de la page a bien été validé sur preview.
  - Ce que ça vaut : le JSX a été déplacé sans changement de logique et `tsc` passe, donc le risque est faible. Mais c'est le seul flux de l'app qui déclenche un paiement Stripe et une commande Gelato, ce qui justifie de ne pas se contenter du typage.
  - À faire : se connecter avec un compte Print disposant d'au moins un crédit (`test-print-multi@yopmail.com`, voir mémoire projet), puis dérouler aperçu, adresse, confirmation. Vérifier la validation inline champ par champ (bordure rouge et "Champ requis"), l'autocomplete pays, l'estimation de livraison qui apparaît une fois le pays choisi, la dédicace avec son compteur, le récapitulatif d'adresse et le bouton de commande.
  - Ne pas aller jusqu'au paiement réel : s'arrêter avant, ou utiliser Stripe en test mode.
- ~~**#16 La CSP casse tout le JavaScript client en `next dev`**~~ ✅ **résolu (Session 66, PR [#128](https://github.com/CookServices/everypaw/pull/128))** : `'unsafe-eval'` ajouté au `script-src` **en développement uniquement**, via `process.env.NODE_ENV !== "production"` dans [next.config.js](next.config.js).
  - Le symptôme était silencieux et trompeur : serveur qui répond 200, markup rendu côté serveur correct, mais aucun composant client hydraté. En développant #11 il a fallu un A/B en retirant les changements pour constater que l'ancien bandeau ne s'affichait pas davantage.
  - **Vérification à refaire si ce header est retouché** : la chaîne `script-src` produite en production doit rester identique à celle d'avant. Contrôlée par comparaison directe avec la version de `main` (`NODE_ENV=production node -e "require('./next.config.js').headers()..."`), et l'en-tête réellement servi en dev contrôlé par `curl -D -`. Ne pas se contenter de relire le code : c'est la seule garantie que le correctif n'affaiblit pas la production.

*Dernière mise à jour : 2026-09-01 (Session 66 : backlog #9, #11 et #16 clos ; #15 ouvert, étapes adresse et paiement non reparcourues)*

---

## Historique des sessions

Historique complet (sessions 1 à 53, sprints, audits sécurité, UX) : **[docs/SESSIONS.md](docs/SESSIONS.md)**.
Seules les 2 dernières sessions sont conservées ici ; à chaque nouvelle session, déplacer la plus ancienne vers l'archive.

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

### ✅ Session 65 — Onboarding comptes vides, incohérences dashboard, message auth (2026-08-31)

Session en 3 lots indépendants, chacun validé sur preview Vercel avant merge (PR [#117](https://github.com/CookServices/everypaw/pull/117)).

**Lot 1 — Onboarding par défaut créait des comptes vides** (5/9 inscrits réels sans animal) : le bouton principal de l'étape 1 du modal ("Suivant", plein, orange) avançait sans rien créer, le vrai CTA de création (`/dashboard/pets/new`) était le lien secondaire à opacité réduite ; `onboarding_completed` passait à `true` sur simple fermeture du modal, sans qu'aucun animal existe. Fix : hiérarchie de l'étape 1 inversée (CTA principal = créer le profil), nouveau champ `profiles.onboarding_dismissed` (migration `add_onboarding_dismissed_2026_08_31.sql`, appliquée en prod) qui pilote désormais seul l'affichage du modal ; `onboarding_completed` n'est écrit `true` qu'à la création réussie d'un animal (`pets/new/page.tsx`), reflète enfin la réalité. Le bouton "Réinitialiser le guide" (settings) écrivait l'ancien flag — corrigé au passage (même incohérence, découverte en cours de lot). Piège de migration : `onboarding_dismissed` par défaut `false` pour tous les comptes existants aurait fait réapparaître le modal chez tous les utilisateurs ayant déjà un animal — rattrapage SQL à deux requêtes donné à Julien (voir mémoire projet Everypaw), la deuxième (backfill `dismissed=true` pour tout compte avec animal) n'est pas optionnelle.

**Lot 2 — Trois défauts dashboard constatés en prod (31/08/2026, compte free, 1 animal)** : (a) la question hebdomadaire affichait un trou grammatical quand le nom de l'animal était vide (`petName ?? ""` puis substitution) — fallback générique "your pet"/"ton animal" ajouté pour les 52 questions × 2 langues, plus un badge nom+avatar sur la carte quand plusieurs animaux existent (root cause réelle non corrigée : `localStorage.lastPetId` jamais nettoyé, peut pointer un animal supprimé) ; (b) la carte "Next AI chapter" annonçait toujours une date de génération, même sur plan free ou compte sans assez d'entrées — `getChapterEligibility()` extraite dans `plan-guards.ts`, partagée par le cron `monthly-story` et le dashboard, 3 états réels (`not_included`/`needs_entries`/`eligible`) ; (c) le compteur d'entrées affichait un total mensuel contre un plafond qui est en réalité lifetime (`10` vient de `canAddEntry`, pas de `monthlyEntryCount`) — dénominateur et libellé corrigés pour utiliser la même source que la limite réelle. Bug de build découvert en cours de route : `getChapterEligibility` importée depuis `@/lib/plan` (qui tire `next/headers` via `supabase/server.ts`) dans un composant client cassait le build Vercel — même pattern déjà documenté (Session build cassé du 2026-06-11) ; fix = importer depuis `@/lib/plan-guards` (zero imports) à la place.

**Lot 3 — Message générique sur `auth_error=exchange_failed`** : texte en dur "Une erreur est survenue" dans un encart rouge, alors que ce code correspond aujourd'hui exclusivement à un échec OAuth Google (`/auth/callback`, PKCE cross-device — les liens de confirmation email passent par `/auth/confirm` depuis la Session 64 et ne déclenchent plus ce cas). Fix : clé i18n dédiée `auth.session_exchange_failed` ("Ton compte est prêt. Réessaie de te connecter." / "Your account is ready. Try signing in again."), affichée dans le style `notice` neutre (déjà utilisé par `confirm_failed`) au lieu du rouge erreur, `showResend` resté `false` (renvoyer un lien de confirmation n'a pas de sens pour un échec OAuth).

**Validé sur preview** : Lot 1 (hiérarchie modal, capture écran), Lot 2b/2c (cartes dashboard, compte free réel), Lot 3 FR (`exchange_failed` + non-régression `confirm_failed`). Non testé : Lot 3 en anglais (pas de moyen de forcer `navigator.language` dans le Browser pane utilisé), déclenchement réel cross-device du bug OAuth (nécessite deux appareils physiques).

**Reste à faire côté Julien** :
- Exécuter le rattrapage SQL onboarding (2 requêtes, voir mémoire projet) si pas déjà fait — sans la 2ᵉ requête, tous les comptes existants avec animal revoient le modal d'onboarding.
- Vérifier `exchange_failed` en anglais (navigateur perso en EN) — non testable depuis cette session.
- **Backlog #13/#14** (voir section Optimisation & dette technique) : `OnboardingModal` ignore `hasPets`/`hasEntries`/`hasStories` (2ᵉ invocation du modal montre la mauvaise étape), clés i18n `step2_cta`/`step3_cta` mortes — trouvés pendant le Lot 1, pas corrigés, hors périmètre.

# AUDIT_PLAN — everypaw

Date: 2026-07-06 · Branch: main (29cdccc) · Mode: lecture seule

## Stack identifiée
- **Framework**: Next.js 14.2.35 (App Router), TypeScript 5, React 18
- **DB/Auth**: Supabase (@supabase/ssr 0.4, supabase-js 2.43) + RLS (migrations SQL)
- **Paiements**: Stripe 14 (subscriptions + one-shot + gift)
- **Emails**: Resend 3.2 (+ Supabase Auth Hook custom)
- **Print**: Gelato API
- **IA**: API Anthropic (fetch direct, lib/anthropic.ts)
- **PDF**: @react-pdf/renderer, @vercel/og (share cards)
- **Infra**: Vercel (crons via vercel.json), tests Vitest (3 fichiers)

## Inventaire source
- `src/app/api/**` — 47 routes API
- `src/app/**` (pages) — auth, dashboard, memorial, invite, gift, redeem, legal, public
- `src/components/**` — 14 composants
- `src/lib/**` — 27 modules
- `src/middleware.ts`, `src/hooks/`, `src/types/`
- `supabase/migrations/**` — 24 migrations SQL + seeds
- `scripts/stripe-create-products.ts`
- Exclus: node_modules, .next, public (assets), messages (i18n JSON), docs

## Zones d'audit

- [x] **Z1 — Auth & session** — LUS: middleware.ts, lib/auth.ts, lib/supabase/client.ts, lib/supabase/server.ts, app/auth/callback/route.ts, auth/login, auth/signup, auth/forgot-password, auth/update-password, lib/auth-emails.ts, lib/auth-errors.ts, api/emails/auth-hook, dashboard/layout.tsx (vérif). Findings: SEV-5, SEV-7.
- [x] **Z2 — Paiements Stripe** — LUS: api/stripe/{webhook,checkout,book-checkout,cancel,reactivate,upgrade,upgrade-preview,subscription,invoices}, api/gift/{checkout,complete,redeem}, lib/stripe-helpers.ts, lib/plan.ts, lib/currency.ts, api/currency, lib/rate-limit.ts, lib/log.ts. NON LU: scripts/stripe-create-products.ts (outil one-shot), lib/plan.test.ts. Findings: SEV-1, SEV-2, SEV-3, SEV-4, SEV-6.
- [x] **Z3 — Livres & impression** — LUS: gelato/order, book-pdf/route.tsx (handler GET), book-pdf-link, preview-pdf (GET+POST), book-configs (route + [id]), pdf-token, book-pages, gelato-pricing. NON LU: book-pdf composants React internes (rendu PDF, pas de logique auth).
- [x] **Z4 — IA / génération** — LUS: generate, generate-origins, suggestion, anthropic, story, html. NON LU: interview.ts, milestones.ts (pas d'accès données sensible). Zone propre.
- [x] **Z5 — Crons & emails** — LUS: monthly-story, birthday-check, retention-emails (partiel), unsubscribe, waitlist, contact. Grep confirmant verifyCronRoute sur les 7 crons. Finding: B-5.
- [x] **Z6 — Partage & collaboration** — LUS: pet-members (route+revoke), invite/[token], memorial/tributes (route+approve+reject), share-card (auth), app/pets/[id], app/memorial/[id]. Findings: H-2, M-1.
- [x] **Z7 — Compte & données** — LUS: account/delete, export-data (partiel), locale. Zone propre.
- [~] **Z8 — Front dashboard** — PARTIEL: routes d'accès données lues (dashboard/page top). NON LUS ligne-à-ligne: pets/[id]/page.tsx (2084 l.), order/page.tsx (1625 l.), settings/page.tsx (964 l.), DashboardNav. Grep dangerouslySetInnerHTML → seulement JSON-LD statique. Risque résiduel client uniquement.
- [x] **Z9 — Lib partagée** — LUS: html, currency, log, rate-limit. Survol: date, i18n, legal, locale, shareCard. Zone propre.
- [x] **Z10 — SQL / RLS** — LUS: add_rls_policies, fix_rls_missing_tables, add_pet_members, fix_pets_members_rls_recursion, medium_low/round2/round3/security_fixes, add_plan_and_book_credits, enforce_free_entry_limit, add_rate_limits, add_memorial_tributes (grep). Findings: C-1, H-2, B-1.
- [ ] **Z11 — Config / infra**: next.config.js, vercel.json, .env.local.example, tsconfig, vitest.config — LU (cartographie)

## Non audité (hors périmètre déclaré)
- `public/` (assets statiques), `messages/` (JSON i18n), `docs/`, `.next/`, dépendances npm (pas de scan CVE outillé disponible)
- Pages legal/* (contenu statique) — survol seulement

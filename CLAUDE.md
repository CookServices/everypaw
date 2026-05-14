# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on localhost:3000
npm run build      # Production build (also validates TypeScript)
npx tsc --noEmit   # Type-check without building
```

No lint script and no test suite are configured. Type-check with `npx tsc --noEmit` before committing.

Deployment is on **Vercel** — pushing to `main` auto-deploys. Environment variables (Supabase, Stripe, Gelato, Resend) live only on Vercel; there is no `.env.local` locally.

## Architecture

**Next.js 14 App Router** — all pages under `src/app/`. All dashboard pages are `"use client"` components; they fetch data in `useEffect` on mount via the browser Supabase client.

### Supabase

Two clients:
- `src/lib/supabase/client.ts` — browser client, used in all `"use client"` pages
- `src/lib/supabase/server.ts` — server client, used in API routes and middleware
- `getServiceSupabase()` in `src/lib/plan.ts` — service role client (bypasses RLS), used only in Stripe webhook

Auth is enforced in `src/middleware.ts`: unauthenticated requests to `/dashboard/*` redirect to `/auth/login`.

**Key tables**: `profiles` (plan, is_premium, book_credits, stripe_customer_id, onboarding_completed), `pets`, `entries` (pet_id, content, photo_urls, mood, tags, entry_date), `stories` (pet_id, status: draft|ready|ordered), `milestones` (detected client-side via `src/lib/milestones.ts` keyword matching).

### Plans & monetisation (`src/lib/plan.ts`)

Four plans: `free | digital | print | book_only`. Guards: `canAddEntry`, `canGenerateStory`, `canOrderBook`. `priceIdToPlan()` maps Stripe price IDs (from env vars) to plan strings. The webhook (`/api/stripe/webhook`) handles `checkout.session.completed`, `customer.subscription.deleted`, and `customer.subscription.updated`.

Free limits: 10 entries total, 1 generated story. Book credits are incremented atomically via `increment_book_credits` Postgres RPC.

### i18n

Messages in `messages/en.json` and `messages/fr.json`. `src/lib/i18n.ts` loads both at build time. `src/hooks/useLocale.ts` reads the `locale` cookie client-side and exposes `{ t, locale, setLocale }`. All UI strings go through `t.*` — add keys to both JSON files when adding new copy.

### Dashboard layout & navigation

`src/app/dashboard/layout.tsx` renders `<DashboardNav>` (fixed sidebar on desktop, bottom nav on mobile) + `{children}`.

`src/components/DashboardNav.tsx` manages:
- `PetSelector` dropdown: lists all pets + "Tous mes animaux" entry. Persists last visited pet to `localStorage` key `lastPetId`.
- `showAll` state: true when on `/dashboard` (global view) — resets automatically via `useEffect` on `pathname`.
- Tab-aware navigation: sidebar links use `?tab=journal|stories|milestones` query params. Active state uses `useSearchParams()` to read `currentTab`.
- Pet switching preserves the current tab.

### Pet page tabs

`/dashboard/pets/[id]` uses `?tab=journal|stories|milestones` (no tab = journal). Tab is read from `useSearchParams` (or `window.location.search` in legacy effects). There is no inline tab bar in the UI — navigation is exclusively through the sidebar.

### API routes

| Route | Purpose |
|---|---|
| `/api/generate` | AI story generation — server-side plan gate via `getUserPlan()` |
| `/api/stripe/checkout` | Subscription checkout (accepts `{ plan: "digital" \| "print_monthly" \| "print_annual" }`) |
| `/api/stripe/book-checkout` | One-time book purchase |
| `/api/stripe/webhook` | Stripe webhook (must use service role Supabase) |
| `/api/gelato/order` | Send book to print via Gelato API |
| `/api/cron/monthly-story` | Auto-generate stories monthly |
| `/api/cron/weekly-reminder` | Email reminders via Resend |
| `/api/gift/create`, `/api/gift/redeem` | Gift card flow |
| `/api/preview-pdf` | PDF preview via `@react-pdf/renderer` |

### Styling conventions

No Tailwind used in practice despite it being installed. All styles are **inline** with this design token set:

- Background: `#F7F2EA` (dashboard), `#FDFAF5` (cards/sidebar)
- Text: `#3D2B1F` (primary), `#7A5C44` (muted), `#9A8070` (very muted)
- Accent: `#C8813A` (amber — CTAs, active states)
- Error: `#A32D2D`
- Fonts: `Georgia, serif` for headings, `'DM Sans', sans-serif` for body
- Border radius: 8px (small), 12–16px (cards), 20px (large cards), 100px (pills/buttons)

SQL migrations live in `supabase/migrations/`. Use `IF NOT EXISTS` and `DO $$ … $$` blocks to keep them idempotent.

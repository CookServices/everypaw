# Product

## Register

product

> Default register is **product** (dashboard, journal, settings, order/print flows — the bulk of surfaces). The marketing landing (`/`, `/fr`) is a **brand** surface: override to `brand` per-task when working on the landing, campaign pages, or long-form emotional storytelling.

## Users

Pet owners in the United States and France (bilingual EN/FR). They use everypaw to keep a living journal of their pet's life — recording moments, generating AI stories, and ordering a physical printed book. Context spans everyday quick capture (mobile, one-handed) and quieter, emotionally significant sessions (reviewing memories, memorial pages, ordering a keepsake book). The job to be done: turn scattered photos and moments into a cherished, lasting record of a companion's life.

## Product Purpose

everypaw is a pet life-journal app (Next.js, Supabase, Stripe, Gelato print). It lets owners log moments per pet, auto-detect milestones, generate AI-written stories from their entries, and order a physical printed book. A Premium subscription (digital / print plans) unlocks story generation and book credits. Success = an owner builds a journal they return to, and converts an emotional milestone into a printed keepsake.

## Brand Personality

Warm, tender, nostalgic. The voice is gentle and sentimental without being saccharine — it treats the pet relationship with quiet respect, including memorial use. Emotional goals: comfort, warmth, the feeling of holding a cherished memory. Bilingual tone must read naturally in both EN and FR, never machine-translated.

## Anti-references

- **Generic SaaS dashboard.** No cold blue gradients, no hero-metric template (big number + small label + supporting stats), no endless identical icon-heading-text card grids.
- **Sterile medical / vet tool.** No clinical white, no charts-first utilitarian layout. This is a keepsake, not a health record.

## Design Principles

1. **Memory over metrics.** Surface the pet, the moment, the story — not engagement stats or dashboard chrome. The content is emotional; the UI gets out of its way.
2. **Warmth is earned by the whole, not the body background.** The terracotta/cream identity already exists; carry warmth through typography, imagery, and accent — never by tinting everything beige until it reads as AI-default sand.
3. **Mobile capture, desktop reflection.** Quick one-handed logging on mobile; richer review/order flows on larger screens. Both are first-class.
4. **Gentle, never loud.** Tender subject matter (including memorials) means restrained motion, soft transitions, and copy that respects the reader. No engagement-bait, no urgency theater.
5. **Bilingual parity.** Every surface must feel native in EN and FR — layout tolerates longer French strings; copy is written, not translated.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body text ≥4.5:1 contrast (watch muted browns on cream — `--ep-text-muted`/`--ep-text-faint` must stay above threshold on `--ep-bg`/`--ep-bg-card`). Visible `:focus-visible` rings already global. `prefers-reduced-motion` honored globally and must stay so for any new motion. Bilingual EN/FR. Touch targets sized for one-handed mobile use.

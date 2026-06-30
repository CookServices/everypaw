---
target: src/app/dashboard/page.tsx
total_score: 27
p0_count: 0
p1_count: 2
timestamp: 2026-06-30T11-16-23Z
slug: src-app-dashboard-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton + progress bar + submitting states solid |
| 2 | Match System / Real World | 4 | Natural bilingual copy, species emoji, ordinal dates |
| 3 | User Control and Freedom | 3 | Clear nav, no traps; little undo |
| 4 | Consistency and Standards | 3 | Patterns consistent but colors hardcoded inline, not tokens |
| 5 | Error Prevention | 3 | Textarea disabled-when-empty, subscribe guarded |
| 6 | Recognition Rather Than Recall | 3 | Chips/labels visible; mood emoji unlabeled |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts/bulk (acceptable for consumer app) |
| 8 | Aesthetic and Minimalist Design | 2 | Eyebrow on nearly every section; KPI cards near SaaS template; dense for premium |
| 9 | Error Recovery | 2 | Interview submit fails silently; subscribe error is generic |
| 10 | Help and Documentation | 2 | GettingStartedChecklist only; no contextual help elsewhere |
| **Total** | | **27/40** | **Acceptable (top of band)** |

## Anti-Patterns Verdict

**LLM assessment:** Does NOT scream "AI made this" — the warm terracotta/cream identity, Georgia serif, and emotional copy give it real personality. But two AI-grammar tells leak through: (1) a tiny uppercase tracked eyebrow above almost every section (month title, KPI labels, interview, upsell), and (2) the KPI card row (entries / next chapter / book) edges toward the hero-metric + identical-card-grid template that PRODUCT.md names as an anti-reference. Warm skin over a SaaS skeleton.

**Deterministic scan (detect.mjs):** exit 2. 1 warning — `layout-transition` at line 390 (animating progress-bar `width`). 7 advisories — literal error-state colors outside DESIGN.md (`#FEF2F2`, `#FCA5A5`, `#991B1B`, `#A32D2D` at lines 290-297, 636). These are legitimate semantic red/error colors but they are design-system drift: undocumented. Fix = add an error-color role to DESIGN.md, not remove them.

**Visual overlays:** Not available — no dev server running, browser injection skipped. Fallback: source + CLI detector only.

## Overall Impression

A genuinely warm, emotionally-aware dashboard let down by two things: it quietly violates the contrast rule we just wrote (faint cocoa `#9A8070` body text under 4.5:1), and it leans on the eyebrow-on-every-section reflex. Both are cheap to fix and would lift it from "acceptable" to "good." Biggest single opportunity: cut the eyebrow scaffolding and let the serif headings carry the hierarchy.

## What's Working

- **Loading + empty states are crafted.** Skeleton mirrors real layout (header/chips/KPI/feed); the no-pets empty state is warm (🐾, dashed border, clear CTA), not a cold "No data."
- **Rich conditional states.** free / digital / print / premium / payment-past-due each get tailored UI — real product maturity.
- **Bilingual is native, not bolted on.** Copy reads naturally in EN and FR throughout, ordinal dates localized.

## Priority Issues

- **[P1] Faint-cocoa body text fails contrast.** `#9A8070` is used for real body/supporting copy at small sizes (lines 360, 366, 392, 415, 444, 536, 700, 707) on `#F7F2EA`/`#FDFAF5` — ~3.3:1, under the 4.5:1 floor. This violates the Contrast Floor Rule in the DESIGN.md just written. **Fix:** promote that copy to Muted Cocoa `#7A5C44` (passes ~5.4:1); reserve `#9A8070` for non-text decoration only. → `/impeccable colorize` or `/impeccable polish`
- **[P1] Eyebrow on nearly every section.** Uppercase tracked labels (`textTransform: uppercase` + `letterSpacing: .07-.08em`) sit above the month title, each KPI card, the interview card, and the upsell. This is impeccable's named anti-pattern. **Fix:** keep at most one as a deliberate brand kicker; let Georgia headings carry the rest. → `/impeccable typeset` or `/impeccable quieter`
- **[P2] KPI cards approach the SaaS hero-metric template.** Label + big serif value + supporting stats, repeated as an identical card grid — exactly PRODUCT.md's "generic SaaS dashboard" anti-reference. **Fix:** differentiate the cards (the book/next-chapter card is emotional, not a metric); vary structure so it reads as a journal, not a stats panel. → `/impeccable bolder` or `/impeccable distill`
- **[P2] Interview submit can fail silently.** Line 187: on insert error, nothing is shown — the user taps "send," sees no confirmation and no error. **Fix:** surface an inline error on failure (reuse the unified error treatment). → `/impeccable harden`
- **[P2] Color drift: error colors hardcoded, not in the system.** The red error palette (`#FEF2F2`/`#FCA5A5`/`#991B1B`/`#A32D2D`) is inline and undocumented; same for all brand hexes (`#C8813A` etc. instead of `var(--ep-*)`). **Fix:** add a semantic error-color role to DESIGN.md and switch inline hexes to the existing CSS tokens. → `/impeccable extract` then `/impeccable polish`

## Persona Red Flags

**Sam (Accessibility-Dependent):** Faint-cocoa text fails WCAG AA contrast (the P1 above). Mood is conveyed by emoji alone (line 712) with no text label — invisible to screen readers. Pet "new chapter" status is a 6px color dot with only a `title` tooltip — not announced reliably.

**Alex (Power User):** No keyboard shortcut to add a moment or switch pets. Every hover state is hand-wired via `onMouseEnter/Leave` inline — fine visually, but no focus-state parity for keyboard users on those same elements.

**Casey (Distracted Mobile, project-relevant — pet owner on the go):** Primary "Add a pet" / "Add moment" actions sit at the top of a long scroll; on mobile the thumb-zone is empty. Long stacked zones (checklist + header + KPI + widget + interview + upsell + feed) mean the core action — log a moment — is several scrolls deep for a returning premium user.

## Minor Observations

- `export const dynamic = "force-dynamic"` forces full SSR on every load — known perf trade-off (noted in project memory); fine for now.
- Progress-bar animates `width` (detector warning) — negligible at 4px but technically layout-thrashing; `transform: scaleX` is the textbook fix.
- "Généré automatiquement / Auto-generated" label repeats across cards — slight redundancy.

## Questions to Consider

- What if the dashboard opened on the single most important action for a returning user (log this week's moment) instead of a stats summary?
- Do the three KPI cards need to look like metrics at all, or could "next chapter" and "your book" read as anticipation, not numbers?
- If you removed every eyebrow label, would anything actually become harder to find?

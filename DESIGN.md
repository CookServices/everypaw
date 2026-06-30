---
name: everypaw
description: A pet life-journal that turns moments into a printed keepsake — warm, tender, nostalgic.
colors:
  brand: "#C8813A"
  brand-dark: "#B5712E"
  bg: "#F7F2EA"
  bg-card: "#FDFAF5"
  ink: "#3D2B1F"
  ink-muted: "#7A5C44"
  ink-faint: "#9A8070"
  border: "#3D2B1F1A"
  error-bg: "#FEF2F2"
  error-border: "#FCA5A5"
  error-ink: "#991B1B"
  alert: "#A32D2D"
  status-print: "#5880B8"
  status-ship: "#6A9E78"
  status-ship-ink: "#3A6A48"
  memorial: "#8B6B4A"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.1rem, 4vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Georgia, serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "'DM Sans', -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.7
    letterSpacing: "normal"
  label:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  pill: "100px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.pill}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: everypaw

## 1. Overview

**Creative North Star: "The Hearthside Journal"**

everypaw is a handwritten diary kept by warm lamplight — a place where an owner records a companion's life one tender moment at a time, and where those moments are eventually bound into a printed keepsake. The interface should feel intimate and unhurried, like turning the pages of a personal journal, never like operating a tool. Warmth is the whole point: the terracotta-and-cream palette, the serif headings, the soft shadows all serve the feeling of holding something cherished.

This system rejects two things explicitly (from PRODUCT.md anti-references). It is **not a generic SaaS dashboard**: no cold blue gradients, no hero-metric template, no endless identical icon-heading-text card grids. And it is **not a sterile medical/vet tool**: no clinical white, no charts-first utilitarian layout. everypaw holds memories, including memorials — it is a keepsake, not a health record.

The content is emotional; the chrome gets out of its way. The pet, the moment, and the story are the loudest things on any screen.

**Key Characteristics:**
- Warm, tender, nostalgic — comfort over efficiency.
- Serif display (Georgia) for emotional weight; clean sans (DM Sans) for legibility.
- Soft, rounded forms — pills and 14px cards, never sharp corners.
- Restrained motion; gentle, never loud.
- Bilingual EN/FR parity baked into every layout.

## 2. Colors

A single warm terracotta accent over a warm sand/cream field, grounded by deep cocoa-brown ink. The whole palette lives in one hue family for cohesion.

### Primary
- **Terracotta** (`#C8813A`): The one brand voice. Primary buttons, links, active states, eyebrow labels, the brand mark. Carries all the warmth and emphasis.
- **Burnt Terracotta** (`#B5712E`): The hover/pressed shade of the primary. Used only as the darker response to interaction.

### Neutral
- **Warm Sand** (`#F7F2EA`): The page background. Warm but never the AI-default cream-as-decoration — warmth here is carried by accent and serif type, not by drowning everything in beige.
- **Soft Ivory** (`#FDFAF5`): Card and surface background. Lifts content one tonal step above the sand field.
- **Cocoa Ink** (`#3D2B1F`): Primary text. Deep warm brown, never pure black — softer, more like ink on cream paper.
- **Muted Cocoa** (`#7A5C44`): Secondary text, captions, supporting copy.
- **Faint Cocoa** (`#9A8070`): Tertiary text, timestamps, the quietest labels only.
- **Hairline Border** (`rgba(61,43,31,.1)`): Dividers and card borders — a whisper, not a line.

### Semantic — Error
The only place a non-brand hue is allowed. Reserved strictly for error states; never decorative.
- **Error Wash** (`#FEF2F2`, `--ep-error-bg`): Background of error notices.
- **Error Edge** (`#FCA5A5`, `--ep-error-border`): Border of error notices.
- **Error Ink** (`#991B1B`, `--ep-error-ink`): Text inside an error notice (on Error Wash).
- **Alert** (`#A32D2D`, `--ep-alert`): Standalone error text and the over-goal progress state.

### Semantic — Status (Gelato order) & Memorial
Functional, never decorative. Used only to encode order state or the memorial context.
- **Print Blue** (`#5880B8`, `--ep-status-print`): printed / in-transit order status.
- **Ship Green** (`#6A9E78`, `--ep-status-ship`): shipped / delivered status.
- **Ship Green Ink** (`#3A6A48`, `--ep-status-ship-ink`): text on a green status tint.
- **Memorial Brown** (`#8B6B4A`, `--ep-memorial`): memorial pages, deceased-pet badges and links — a softer brown, distinct from Cocoa Ink.

### Named Rules
**The One Voice Rule.** Terracotta is the only accent. There is no secondary or tertiary color. Its consistency is the brand; do not introduce a second hue for "variety." The only exceptions are the semantic roles — Error (red), order Status (blue/green), and Memorial (brown) — each used strictly for its meaning, never as decoration.

**The Contrast Floor Rule.** Body text must hold ≥4.5:1 on its background. Muted Cocoa (`#7A5C44`) and Faint Cocoa (`#9A8070`) are the danger zone on Warm Sand — never drop body copy to Faint Cocoa, and verify Muted Cocoa at small sizes. When close, move toward Cocoa Ink. Light brown "for elegance" is forbidden if it costs legibility.

## 3. Typography

**Display Font:** Georgia (with Times New Roman, serif)
**Body Font:** DM Sans (with -apple-system, sans-serif)

**Character:** A serif/sans contrast pairing. Georgia carries the emotional, editorial weight of headings and the italic story quotes — it reads like a printed book. DM Sans at light weight (300) keeps body copy calm, airy, and legible without competing. The contrast axis (serif + geometric sans) is intentional; the two never blur together.

### Hierarchy
- **Display** (Georgia 600, clamp(2.1rem, 4vw, 4rem), line-height 1.1): Hero headlines on the landing and major page titles.
- **Headline** (Georgia 600, clamp(2rem, 4vw, 3rem), line-height 1.15): Section headings.
- **Title** (Georgia 600, 1.1rem): Card titles, feature names, pet names.
- **Body** (DM Sans 300, 1rem, line-height 1.7): All running copy. Light weight is the house voice. Cap measure at 65–75ch.
- **Label** (DM Sans 500, 0.72rem, letter-spacing 0.06em, uppercase): Eyebrow kickers and category tags, in terracotta.

### Named Rules
**The Serif-for-Soul Rule.** Anything emotional — a pet's name, a generated story quote, a hero line, a memorial caption — is set in Georgia, often italic. Functional UI text stays in DM Sans. Emotion gets serif; mechanics get sans.

**The Light-Body Rule.** Body copy is DM Sans 300, not 400. The airiness is deliberate and on-brand — but it raises the contrast stakes, so honor The Contrast Floor Rule.

## 4. Elevation

A soft, layered system. Surfaces are not flat — cards lift gently off the warm sand field with diffuse, warm-tinted shadows (all shadows are browns at low alpha, never neutral gray-black). Depth is quiet and ambient, reinforcing the "objects resting on paper" feel rather than signaling interactive hierarchy aggressively.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 2px 8px rgba(61,43,31,.08)`): Default card lift. Barely there.
- **Raised** (`box-shadow: 0 8px 24px rgba(61,43,31,.12)`): Hovered cards, popovers, key tiles.
- **Floating** (`box-shadow: 0 16px 48px rgba(61,43,31,.16)`): Modals, the book mockup, top-layer surfaces.

### Named Rules
**The Warm-Shadow Rule.** Every shadow is cocoa (`rgba(61,43,31,*)`), never black or neutral gray. A gray shadow on this palette reads cold and breaks the hearthside feel instantly.

## 5. Components

### Buttons
- **Shape:** Fully rounded pills (`100px` radius). Never square, never sharp.
- **Primary:** Terracotta background (`#C8813A`), Soft Ivory text, padding ~12px 24px, weight 500. The single confident CTA.
- **Hover / Focus:** Background deepens to Burnt Terracotta (`#B5712E`); `:active` scales to 0.98. Focus shows the global 2px terracotta `:focus-visible` ring.
- **Outline:** Transparent background, 1.5px border at `rgba(61,43,31,.2)`. On hover, border and text shift to terracotta. The quiet secondary action.

### Cards / Containers
- **Corner Style:** 14px radius (`--ep-radius-md`); 20px (`lg`) for larger feature surfaces.
- **Background:** Soft Ivory (`#FDFAF5`) on the Warm Sand page.
- **Shadow Strategy:** Resting by default, Raised on hover (see Elevation). Warm shadows only.
- **Border:** Optional hairline `rgba(61,43,31,.1)`.
- **Internal Padding:** 24px desktop, ~16–20px mobile.

### Inputs / Fields
- **Style:** Soft Ivory or transparent field, hairline cocoa border, 8px radius, 16px font on mobile (prevents iOS auto-zoom).
- **Focus:** Global `:focus-visible` — 2px terracotta outline, 3px offset.
- **Error:** Unified error treatment — background `#FEF2F2`, border `#FCA5A5`, text `#991B1B`, 8px radius. Inline per-field "required" with red border, never `alert()`.

### Navigation
- **Desktop:** Fixed left sidebar (220px) in the dashboard; public top nav on marketing pages.
- **Mobile:** Fixed top header (burger left + centered logo) with a slide-in left drawer. Secondary links hide below 640px.
- **States:** Nav items get a soft `rgba(61,43,31,.04)` wash on hover; active state in cocoa ink.

### Signature Component — The Book Mockup
A CSS-rendered 3D mockup of the printed photo book (terracotta-to-cocoa gradient cover, serif italic title, "Everypaw" footer). It is the emotional payoff of the product and appears on the landing and order flows. Treat it as a hero artifact, lit with the Floating shadow.

## 6. Do's and Don'ts

### Do:
- **Do** keep terracotta (`#C8813A`) as the only accent — one voice across the whole product.
- **Do** set emotional text (pet names, story quotes, hero lines, memorials) in Georgia, often italic.
- **Do** use warm cocoa shadows (`rgba(61,43,31,*)`) for all elevation.
- **Do** keep body copy at DM Sans 300 but verify ≥4.5:1 contrast; push toward Cocoa Ink when close.
- **Do** use fully-rounded pill buttons and 14px-radius cards.
- **Do** design every surface for EN and FR — tolerate longer French strings without breaking layout.
- **Do** consume colors via CSS tokens (`var(--ep-brand)`, `var(--ep-text-muted)`, `var(--ep-error-ink)`…), never literal hex inline — keeps the system the single source of truth.
- **Do** use the Error tokens (`--ep-error-bg/border/ink`, `--ep-alert`) for error states only.

### Don't:
- **Don't** build a **generic SaaS dashboard**: no cold blue gradients, no hero-metric template (big number + small label + supporting stats), no endless identical icon-heading-text card grids.
- **Don't** build a **sterile medical/vet tool**: no clinical white, no charts-first utilitarian layout. This is a keepsake, not a health record.
- **Don't** drop body text to Faint Cocoa (`#9A8070`) — it fails contrast on Warm Sand.
- **Don't** use gray/black shadows; they read cold and break the hearthside feel.
- **Don't** introduce a second accent hue for "variety."
- **Don't** use sharp corners or square buttons; the system is soft by doctrine.

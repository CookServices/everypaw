# design-sync notes — @everypaw/design-system

## Repo-specific gotchas

- **Modal overlay + full-page screenshot capture**: `Modal` uses `position: fixed; inset: 0`. The render-check/capture screenshot pipeline uses full-page capture, which mis-measures/crops fixed-position content (title got cropped off, `[RENDER_THIN]`: "rendered height is 0px"). Fix: wrap the preview story in a sized container with `transform: translateZ(0)` — any `transform` on an ancestor makes CSS `position: fixed` descendants position relative to that ancestor instead of the viewport, containing the overlay correctly for capture. See `.design-sync/previews/Modal.tsx`. Apply the same pattern to any future overlay component (dialogs, dropdowns, tooltips using `position: fixed`).
- **DM Sans font**: not shipped as `@font-face` anywhere in this package's `styles.css` or `dist/`. The main everypaw app (`src/app/globals.css`) loads it at runtime via a Google Fonts CDN `@import`. Set `runtimeFontPrefixes: ["DM Sans"]` in config to suppress `[FONT_MISSING]` — this is the honest choice since the DS package genuinely doesn't ship the font, host apps are expected to provide it. Georgia did not trigger `[FONT_MISSING]` (system font).
- No Storybook, no docs directory, no usage examples beyond the package README's basic import snippet — all previews composed directly from component source + `.d.ts` props (curate-before-invent tier 3, the floor).
- All 6 components grouped under "general" (no docs/frontmatter to drive grouping) — fine at this scale (6 components), revisit `componentSrcMap`/docs grouping if the package grows.

## Re-sync risks

- The `transform: translateZ(0)` containment trick in `Modal.tsx` is tied to the component's current CSS (`position: fixed; inset: 0`). If Modal's implementation changes (e.g. switches to a portal rendered outside the preview's DOM subtree), this containment may stop working and `[RENDER_THIN]` could reappear — re-verify the Modal preview on any Modal source change.
- `runtimeFontPrefixes: ["DM Sans"]` assumes host apps keep loading DM Sans via Google Fonts CDN. If the DS package is later given its own shipped font (self-hosted woff2), switch to `extraFonts` instead for full fidelity in the claude.ai/design previews.
- Package was pre-built (`dist/`) before this sync ran; `buildCmd: "npm run build"` is recorded for re-syncs to re-run when source changes.

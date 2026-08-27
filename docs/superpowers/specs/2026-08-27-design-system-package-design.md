# Design: `@everypaw/design-system` package

## Context

`/design-sync` (Claude Code feature that publishes a design system to the org's claude.ai workspace) refused to run against everypaw's root repo: no separate, buildable component-library package exists — styling is Tailwind + CSS vars used directly in app pages, not exported components.

everypaw already has a fully written design spec ([DESIGN.md](../../../DESIGN.md)) and matching CSS variables in `src/app/globals.css` (`--ep-brand`, `--ep-error-*`, etc., used across 19 files). The gap is purely structural: no isolated package that builds and exports tokens + components for `/design-sync` to read.

## Goal

Minimal scope: create a small, isolated package inside the everypaw repo so `/design-sync` has something to sync. Not a full internal refactor of everypaw's existing pages — those keep using Tailwind/CSS vars directly, untouched.

## Location

`packages/design-system/` — subfolder of the existing everypaw repo (no new repo, no monorepo restructuring). Fully isolated from `src/`; nothing in the main app imports it (v1).

## Package structure

```
packages/design-system/
├── package.json          (name: @everypaw/design-system, private: true)
├── tsup.config.ts        (build ESM+CJS+d.ts)
├── src/
│   ├── tokens.ts         (colors, typography, spacing, radius — copied from DESIGN.md)
│   ├── styles.css        (CSS vars --ep-* + component classes)
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx     (variants: print / ship / memorial)
│   │   ├── NavItem.tsx
│   │   └── index.ts      (barrel export)
│   └── index.ts          (export * from tokens + components; side-effect import of styles.css)
├── dist/                 (build output, gitignored)
└── README.md
```

## Styling approach

Tokens and CSS vars are **duplicated** into the package (copied from `DESIGN.md` / `globals.css`), not imported from the app. This keeps the package fully self-contained and buildable in isolation — matching what `/design-sync` expects (a standalone source repo it can build and export from).

Trade-off accepted: tokens can drift from `globals.css` if the app's palette changes later without a manual update to the package. Acceptable for v1 given the minimal-scope goal (getting `/design-sync` working), not a general theming solution.

## Components (v1 set)

All presentational only — no business logic, no data fetching, no global state.

| Component | Key props | Notes |
|---|---|---|
| `Button` | `variant: 'primary' \| 'outline'`, `children`, `onClick`, `disabled` | Pill radius (100px); primary = terracotta bg; outline = transparent + hairline border. Matches DESIGN.md §5 Buttons. |
| `Card` | `children`, `padding?: 'sm' \| 'md'` | 14px radius, Soft Ivory background, optional hairline border. |
| `Input` | `error?: boolean`, `label?`, standard `<input>` props | Error state uses the unified `--ep-error-*` treatment. |
| `Modal` | `open`, `onClose`, `children`, `title?` | Overlay + card styling; simple fade only, no complex animation. |
| `Badge` | `variant: 'print' \| 'ship' \| 'memorial'` | Fixed semantic variants only — no free-form color prop. |
| `NavItem` | `active?: boolean`, `icon?`, `label`, `href` | Hover wash + active state in cocoa ink. |

All props strictly typed (no `any`).

## Build & exports

```json
{
  "name": "@everypaw/design-system",
  "private": true,
  "version": "0.1.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": { "build": "tsup" },
  "peerDependencies": { "react": "^18" }
}
```

`private: true` — never published to npm; built locally so `/design-sync` (and, potentially later, real consumption elsewhere) has a valid build artifact to read.

## Testing

No unit test suite — the package is purely presentational with no branching logic to cover. Verification is:
- `npm run build` succeeds with no TypeScript errors.
- Manual visual check (optional lightweight demo page, not required for v1).

## Error handling

None needed — components hold no internal state and perform no I/O. The only "error" surface is the `error` prop on `Input`, already covered above.

## Out of scope (v1)

- Refactoring existing everypaw pages/components to consume this package.
- Publishing to a package registry.
- Storybook or any documentation site.
- Automated visual regression testing.

# @everypaw/design-system Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an isolated, buildable `@everypaw/design-system` package inside the everypaw repo so `/design-sync` has a component library to read tokens and components from.

**Architecture:** A standalone package at `packages/design-system/`, built with `tsup` into ESM+CJS+`.d.ts`, with tokens and CSS variables duplicated from `DESIGN.md`/`src/app/globals.css` (not imported from the app) so the package builds in full isolation. Six presentational React components (`Button`, `Card`, `Input`, `Badge`, `NavItem`, `Modal`) consume those tokens via CSS classes shipped in a separate `styles.css`.

**Tech Stack:** TypeScript, React 18 (peer dependency), `tsup` for bundling, plain CSS with custom properties (no Tailwind, no CSS-in-JS).

## Global Constraints

- Package lives at `packages/design-system/` inside the existing everypaw repo — no new repo, no npm workspaces change to the root `package.json`.
- Package is `"private": true` — never published to a registry.
- Nothing in `src/` (the main app) is modified or imports this package in v1.
- All CSS custom properties use the existing `--ep-` prefix and exact values from `src/app/globals.css`:
  `--ep-bg: #F7F2EA`, `--ep-bg-card: #FDFAF5`, `--ep-brand: #C8813A`, `--ep-brand-dark: #B5712E`, `--ep-text: #3D2B1F`, `--ep-text-muted: #7A5C44`, `--ep-text-faint: #9A8070`, `--ep-border: rgba(61,43,31,.1)`, `--ep-error-bg: #FEF2F2`, `--ep-error-border: #FCA5A5`, `--ep-error-ink: #991B1B`, `--ep-alert: #A32D2D`, `--ep-status-print: #5880B8`, `--ep-status-ship: #6A9E78`, `--ep-status-ship-ink: #3A6A48`, `--ep-memorial: #8B6B4A`, `--ep-radius-sm: 8px`, `--ep-radius-md: 14px`, `--ep-radius-lg: 20px`, `--ep-radius-pill: 100px`, `--ep-shadow-sm: 0 2px 8px rgba(61,43,31,.08)`, `--ep-shadow-md: 0 8px 24px rgba(61,43,31,.12)`, `--ep-shadow-lg: 0 16px 48px rgba(61,43,31,.16)`, `--ep-transition: 150ms ease`.
- Components are presentational only: no data fetching, no global state, no business logic.
- Props are exactly what's listed per component below — no extra props (no `className` passthrough beyond what a native HTML attribute already provides).
- No unit test framework is introduced. Verification per task is: TypeScript build succeeds (`npm run build` exits 0) and the expected export appears in `dist/index.d.ts`.
- `node_modules/` and `dist/` inside `packages/design-system/` are already covered by the root `.gitignore` (patterns have no leading slash) — no `.gitignore` changes needed.

---

### Task 1: Package scaffold + design tokens

**Files:**
- Create: `packages/design-system/package.json`
- Create: `packages/design-system/tsconfig.json`
- Create: `packages/design-system/tsup.config.ts`
- Create: `packages/design-system/scripts/copy-css.mjs`
- Create: `packages/design-system/src/tokens.ts`
- Create: `packages/design-system/src/styles.css`
- Create: `packages/design-system/src/index.ts`

**Interfaces:**
- Produces: `colors`, `typography`, `radius`, `spacing`, `shadows` (all `as const` objects) exported from `src/tokens.ts`, re-exported from `src/index.ts`. Later tasks (2-7) import nothing from this file at the TS level — they only rely on the CSS variable names already defined in `src/styles.css`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@everypaw/design-system",
  "private": true,
  "version": "0.1.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": {
    "build": "tsup && node scripts/copy-css.mjs"
  },
  "peerDependencies": {
    "react": "^18"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "react": "^18",
    "react-dom": "^18",
    "tsup": "^8.0.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
});
```

- [ ] **Step 4: Create `scripts/copy-css.mjs`**

```js
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const src = 'src/styles.css';
const dest = 'dist/styles.css';

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`copied ${src} -> ${dest}`);
```

- [ ] **Step 5: Create `src/tokens.ts`**

```ts
export const colors = {
  brand: '#C8813A',
  brandDark: '#B5712E',
  bg: '#F7F2EA',
  bgCard: '#FDFAF5',
  ink: '#3D2B1F',
  inkMuted: '#7A5C44',
  inkFaint: '#9A8070',
  border: 'rgba(61,43,31,.1)',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
  errorInk: '#991B1B',
  alert: '#A32D2D',
  statusPrint: '#5880B8',
  statusShip: '#6A9E78',
  statusShipInk: '#3A6A48',
  memorial: '#8B6B4A',
} as const;

export const typography = {
  display: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 'clamp(2.1rem, 4vw, 4rem)',
    fontWeight: 600,
    lineHeight: 1.1,
  },
  headline: {
    fontFamily: 'Georgia, serif',
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 600,
    lineHeight: 1.15,
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '1.1rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  body: {
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    fontSize: '1rem',
    fontWeight: 300,
    lineHeight: 1.7,
  },
  label: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.72rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '0.06em',
  },
} as const;

export const radius = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  pill: '100px',
} as const;

export const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '40px',
} as const;

export const shadows = {
  sm: '0 2px 8px rgba(61,43,31,.08)',
  md: '0 8px 24px rgba(61,43,31,.12)',
  lg: '0 16px 48px rgba(61,43,31,.16)',
} as const;
```

- [ ] **Step 6: Create `src/styles.css`**

```css
:root {
  --ep-bg: #F7F2EA;
  --ep-bg-card: #FDFAF5;
  --ep-brand: #C8813A;
  --ep-brand-dark: #B5712E;
  --ep-text: #3D2B1F;
  --ep-text-muted: #7A5C44;
  --ep-text-faint: #9A8070;
  --ep-border: rgba(61,43,31,.1);
  --ep-error-bg: #FEF2F2;
  --ep-error-border: #FCA5A5;
  --ep-error-ink: #991B1B;
  --ep-alert: #A32D2D;
  --ep-status-print: #5880B8;
  --ep-status-ship: #6A9E78;
  --ep-status-ship-ink: #3A6A48;
  --ep-memorial: #8B6B4A;
  --ep-radius-sm: 8px;
  --ep-radius-md: 14px;
  --ep-radius-lg: 20px;
  --ep-radius-pill: 100px;
  --ep-shadow-sm: 0 2px 8px rgba(61,43,31,.08);
  --ep-shadow-md: 0 8px 24px rgba(61,43,31,.12);
  --ep-shadow-lg: 0 16px 48px rgba(61,43,31,.16);
  --ep-transition: 150ms ease;
}
```

- [ ] **Step 7: Create `src/index.ts`**

```ts
export * from './tokens';
```

- [ ] **Step 8: Install dependencies**

Run: `cd packages/design-system && npm install`
Expected: exits 0, creates `packages/design-system/node_modules` and `packages/design-system/package-lock.json`.

- [ ] **Step 9: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0. `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`, and `dist/styles.css` all exist.

- [ ] **Step 10: Verify tokens are exported**

Run: `grep -n "colors" packages/design-system/dist/index.d.ts`
Expected: a line declaring `colors` is found.

Run: `grep -n "ep-brand" packages/design-system/dist/styles.css`
Expected: a line containing `--ep-brand: #C8813A;` is found.

- [ ] **Step 11: Commit**

```bash
git add packages/design-system/package.json packages/design-system/tsconfig.json packages/design-system/tsup.config.ts packages/design-system/scripts/copy-css.mjs packages/design-system/src/tokens.ts packages/design-system/src/styles.css packages/design-system/src/index.ts packages/design-system/package-lock.json
git commit -m "feat(design-system): scaffold package with design tokens"
```

---

### Task 2: Button component

**Files:**
- Create: `packages/design-system/src/components/Button.tsx`
- Create: `packages/design-system/src/components/index.ts`
- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/styles.css`

**Interfaces:**
- Consumes: CSS variables `--ep-radius-pill`, `--ep-brand`, `--ep-brand-dark`, `--ep-bg-card`, `--ep-text`, `--ep-transition` (from Task 1's `src/styles.css`).
- Produces: `Button` component, `ButtonProps` type, both exported from `src/components/index.ts` and re-exported from `src/index.ts`.

- [ ] **Step 1: Append Button styles to `src/styles.css`**

```css

.ep-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ep-radius-pill);
  padding: 12px 24px;
  font-family: 'DM Sans', -apple-system, sans-serif;
  font-weight: 500;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: background-color var(--ep-transition), transform var(--ep-transition), color var(--ep-transition), border-color var(--ep-transition);
}
.ep-btn:active {
  transform: scale(0.98);
}
.ep-btn:focus-visible {
  outline: 2px solid var(--ep-brand);
  outline-offset: 2px;
}
.ep-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ep-btn--primary {
  background-color: var(--ep-brand);
  color: var(--ep-bg-card);
}
.ep-btn--primary:hover:not(:disabled) {
  background-color: var(--ep-brand-dark);
}
.ep-btn--outline {
  background-color: transparent;
  color: var(--ep-text);
  border: 1.5px solid rgba(61,43,31,.2);
}
.ep-btn--outline:hover:not(:disabled) {
  border-color: var(--ep-brand);
  color: var(--ep-brand);
}
```

- [ ] **Step 2: Create `src/components/Button.tsx`**

```tsx
import React from 'react';

export interface ButtonProps {
  variant: 'primary' | 'outline';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ variant, children, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      className={`ep-btn ep-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/index.ts`**

```ts
export * from './Button';
```

- [ ] **Step 4: Update `src/index.ts`**

```ts
export * from './tokens';
export * from './components';
```

- [ ] **Step 5: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Verify Button is exported**

Run: `grep -n "declare function Button" packages/design-system/dist/index.d.ts`
Expected: a match is found.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/Button.tsx packages/design-system/src/components/index.ts packages/design-system/src/index.ts packages/design-system/src/styles.css
git commit -m "feat(design-system): add Button component"
```

---

### Task 3: Card component

**Files:**
- Create: `packages/design-system/src/components/Card.tsx`
- Modify: `packages/design-system/src/components/index.ts`
- Modify: `packages/design-system/src/styles.css`

**Interfaces:**
- Consumes: CSS variables `--ep-bg-card`, `--ep-text`, `--ep-radius-md`, `--ep-border`, `--ep-shadow-sm`.
- Produces: `Card` component, `CardProps` type, exported from `src/components/index.ts`.

- [ ] **Step 1: Append Card styles to `src/styles.css`**

```css

.ep-card {
  background-color: var(--ep-bg-card);
  color: var(--ep-text);
  border-radius: var(--ep-radius-md);
  border: 1px solid var(--ep-border);
  box-shadow: var(--ep-shadow-sm);
}
.ep-card--sm {
  padding: 16px;
}
.ep-card--md {
  padding: 24px;
}
```

- [ ] **Step 2: Create `src/components/Card.tsx`**

```tsx
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md';
}

export function Card({ children, padding = 'md' }: CardProps) {
  return (
    <div className={`ep-card ep-card--${padding}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Update `src/components/index.ts`**

```ts
export * from './Button';
export * from './Card';
```

- [ ] **Step 4: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0.

- [ ] **Step 5: Verify Card is exported**

Run: `grep -n "declare function Card" packages/design-system/dist/index.d.ts`
Expected: a match is found.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/Card.tsx packages/design-system/src/components/index.ts packages/design-system/src/styles.css
git commit -m "feat(design-system): add Card component"
```

---

### Task 4: Input component

**Files:**
- Create: `packages/design-system/src/components/Input.tsx`
- Modify: `packages/design-system/src/components/index.ts`
- Modify: `packages/design-system/src/styles.css`

**Interfaces:**
- Consumes: CSS variables `--ep-bg-card`, `--ep-border`, `--ep-radius-sm`, `--ep-text`, `--ep-brand`, `--ep-error-bg`, `--ep-error-border`, `--ep-error-ink`, `--ep-text-muted`.
- Produces: `Input` component, `InputProps` type, exported from `src/components/index.ts`.

- [ ] **Step 1: Append Input styles to `src/styles.css`**

```css

.ep-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ep-input-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ep-text-muted);
}
.ep-input {
  background-color: var(--ep-bg-card);
  border: 1px solid var(--ep-border);
  border-radius: var(--ep-radius-sm);
  padding: 10px 14px;
  font-size: 16px;
  color: var(--ep-text);
}
.ep-input:focus-visible {
  outline: 2px solid var(--ep-brand);
  outline-offset: 3px;
}
.ep-input--error {
  background-color: var(--ep-error-bg);
  border-color: var(--ep-error-border);
  color: var(--ep-error-ink);
}
```

- [ ] **Step 2: Create `src/components/Input.tsx`**

```tsx
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
}

export function Input({ error, label, id, ...rest }: InputProps) {
  return (
    <div className="ep-input-wrapper">
      {label && (
        <label className="ep-input-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`ep-input${error ? ' ep-input--error' : ''}`}
        {...rest}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update `src/components/index.ts`**

```ts
export * from './Button';
export * from './Card';
export * from './Input';
```

- [ ] **Step 4: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0.

- [ ] **Step 5: Verify Input is exported**

Run: `grep -n "declare function Input" packages/design-system/dist/index.d.ts`
Expected: a match is found.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/Input.tsx packages/design-system/src/components/index.ts packages/design-system/src/styles.css
git commit -m "feat(design-system): add Input component"
```

---

### Task 5: Badge component

**Files:**
- Create: `packages/design-system/src/components/Badge.tsx`
- Modify: `packages/design-system/src/components/index.ts`
- Modify: `packages/design-system/src/styles.css`

**Interfaces:**
- Consumes: CSS variables `--ep-radius-pill`, `--ep-status-print`, `--ep-status-ship-ink`, `--ep-memorial`.
- Produces: `Badge` component, `BadgeProps` type, exported from `src/components/index.ts`.

- [ ] **Step 1: Append Badge styles to `src/styles.css`**

```css

.ep-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--ep-radius-pill);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
}
.ep-badge--print {
  background-color: rgba(88,128,184,.12);
  color: var(--ep-status-print);
}
.ep-badge--ship {
  background-color: rgba(106,158,120,.12);
  color: var(--ep-status-ship-ink);
}
.ep-badge--memorial {
  background-color: rgba(139,107,74,.12);
  color: var(--ep-memorial);
}
```

- [ ] **Step 2: Create `src/components/Badge.tsx`**

```tsx
import React from 'react';

export interface BadgeProps {
  variant: 'print' | 'ship' | 'memorial';
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`ep-badge ep-badge--${variant}`}>{children}</span>;
}
```

- [ ] **Step 3: Update `src/components/index.ts`**

```ts
export * from './Button';
export * from './Card';
export * from './Input';
export * from './Badge';
```

- [ ] **Step 4: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0.

- [ ] **Step 5: Verify Badge is exported**

Run: `grep -n "declare function Badge" packages/design-system/dist/index.d.ts`
Expected: a match is found.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/Badge.tsx packages/design-system/src/components/index.ts packages/design-system/src/styles.css
git commit -m "feat(design-system): add Badge component"
```

---

### Task 6: NavItem component

**Files:**
- Create: `packages/design-system/src/components/NavItem.tsx`
- Modify: `packages/design-system/src/components/index.ts`
- Modify: `packages/design-system/src/styles.css`

**Interfaces:**
- Consumes: CSS variables `--ep-radius-sm`, `--ep-text`, `--ep-transition`.
- Produces: `NavItem` component, `NavItemProps` type, exported from `src/components/index.ts`.

- [ ] **Step 1: Append NavItem styles to `src/styles.css`**

```css

.ep-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--ep-radius-sm);
  color: var(--ep-text);
  text-decoration: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  transition: background-color var(--ep-transition);
}
.ep-nav-item:hover {
  background-color: rgba(61,43,31,.04);
}
.ep-nav-item--active {
  font-weight: 500;
  background-color: rgba(61,43,31,.04);
}
```

- [ ] **Step 2: Create `src/components/NavItem.tsx`**

```tsx
import React from 'react';

export interface NavItemProps {
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
  href: string;
}

export function NavItem({ active, icon, label, href }: NavItemProps) {
  return (
    <a
      href={href}
      className={`ep-nav-item${active ? ' ep-nav-item--active' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
```

- [ ] **Step 3: Update `src/components/index.ts`**

```ts
export * from './Button';
export * from './Card';
export * from './Input';
export * from './Badge';
export * from './NavItem';
```

- [ ] **Step 4: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0.

- [ ] **Step 5: Verify NavItem is exported**

Run: `grep -n "declare function NavItem" packages/design-system/dist/index.d.ts`
Expected: a match is found.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/NavItem.tsx packages/design-system/src/components/index.ts packages/design-system/src/styles.css
git commit -m "feat(design-system): add NavItem component"
```

---

### Task 7: Modal component

**Files:**
- Create: `packages/design-system/src/components/Modal.tsx`
- Modify: `packages/design-system/src/components/index.ts`
- Modify: `packages/design-system/src/styles.css`

**Interfaces:**
- Consumes: CSS variables `--ep-bg-card`, `--ep-text`, `--ep-radius-lg`, `--ep-shadow-lg`, `--ep-transition`.
- Produces: `Modal` component, `ModalProps` type, exported from `src/components/index.ts`.

- [ ] **Step 1: Append Modal styles to `src/styles.css`**

```css

.ep-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(61,43,31,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ep-fade-in var(--ep-transition);
}
.ep-modal {
  background-color: var(--ep-bg-card);
  color: var(--ep-text);
  border-radius: var(--ep-radius-lg);
  box-shadow: var(--ep-shadow-lg);
  padding: 24px;
  max-width: 480px;
  width: 90%;
}
.ep-modal-title {
  font-family: Georgia, serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 16px;
}
@keyframes ep-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 2: Create `src/components/Modal.tsx`**

```tsx
import React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  if (!open) return null;

  return (
    <div className="ep-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="ep-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="ep-modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/components/index.ts`**

```ts
export * from './Button';
export * from './Card';
export * from './Input';
export * from './Badge';
export * from './NavItem';
export * from './Modal';
```

- [ ] **Step 4: Run the build**

Run: `cd packages/design-system && npm run build`
Expected: exits 0.

- [ ] **Step 5: Verify Modal is exported**

Run: `grep -n "declare function Modal" packages/design-system/dist/index.d.ts`
Expected: a match is found.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/Modal.tsx packages/design-system/src/components/index.ts packages/design-system/src/styles.css
git commit -m "feat(design-system): add Modal component"
```

---

### Task 8: README + final verification

**Files:**
- Create: `packages/design-system/README.md`

**Interfaces:**
- Consumes: all exports from Tasks 1-7 (`colors`, `typography`, `radius`, `spacing`, `shadows`, `Button`, `Card`, `Input`, `Badge`, `NavItem`, `Modal`).
- Produces: nothing new for other tasks — this is the final task.

- [ ] **Step 1: Create `packages/design-system/README.md`**

```markdown
# @everypaw/design-system

Internal, unpublished design system package for everypaw. Provides the
tokens and presentational components documented in `DESIGN.md` as a
standalone, buildable package.

## Build

npm install
npm run build

## Usage

import { Button, Card, Input, Badge, NavItem, Modal } from '@everypaw/design-system';
import '@everypaw/design-system/styles.css';

## Scope

Presentational components only — no data fetching, no global state.
Not currently consumed by the main everypaw app (`src/`); this package
exists so `/design-sync` has a component library to read from.
```

- [ ] **Step 2: Run a full clean build**

Run: `cd packages/design-system && rm -rf dist && npm run build`
Expected: exits 0.

- [ ] **Step 3: Verify all six components and all five token groups are exported**

Run: `grep -c "declare function" packages/design-system/dist/index.d.ts`
Expected: `6` (Button, Card, Input, Badge, NavItem, Modal).

Run: `grep -Ec "^export declare const (colors|typography|radius|spacing|shadows)" packages/design-system/dist/index.d.ts`
Expected: `5`.

- [ ] **Step 4: Verify styles.css contains every component class prefix**

Run: `grep -Ec "\.ep-(btn|card|input|badge|nav-item|modal)" packages/design-system/dist/styles.css`
Expected: a non-zero count (at least one match per prefix — six or more).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/README.md
git commit -m "docs(design-system): add package README"
```

---

## After This Plan

Once all 8 tasks are committed, re-run `/design-sync` at the Claude Code prompt from the everypaw repo root — it should now detect `packages/design-system` as a buildable component library and offer to create or update the design system in claude.ai.

# @everypaw/design-system

Internal, unpublished design system package for everypaw. Provides the
tokens and presentational components documented in `DESIGN.md` as a
standalone, buildable package.

## Build

```bash
npm install
npm run build
```

## Usage

```tsx
import { Button, Card, Input, Badge, NavItem, Modal } from '@everypaw/design-system';
import '@everypaw/design-system/styles.css';
```

## Scope

Presentational components only — no data fetching, no global state.
Not currently consumed by the main everypaw app (`src/`); this package
exists so `/design-sync` has a component library to read from.

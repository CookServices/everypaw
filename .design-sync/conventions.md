## Setup

No provider or root wrapper needed — components read no context. Import the CSS once at the app root:

```tsx
import { Button, Card, Input, Badge, NavItem, Modal } from '@everypaw/design-system';
import '@everypaw/design-system/styles.css';
```

`DM Sans` is not shipped in this bundle — the host app is expected to load it itself (e.g. a Google Fonts `<link>`/`@import` for `DM Sans:wght@300;400;500`). `Georgia` is a system font, no loading needed.

## Styling idiom

Fixed BEM-style component classes, never utility classes and never inline style props on the components themselves. Compose by passing the documented prop (`variant`, `padding`, `error`, `active`) — the component maps it to a modifier class internally. Do not pass extra `className` values expecting new looks; the class vocabulary is closed:

| Component | Base class | Modifier classes |
|---|---|---|
| Button | `.ep-btn` | `.ep-btn--primary`, `.ep-btn--outline` |
| Card | `.ep-card` | `.ep-card--sm`, `.ep-card--md` |
| Input | `.ep-input-wrapper` / `.ep-input` / `.ep-input-label` | `.ep-input--error` |
| Badge | `.ep-badge` | `.ep-badge--print`, `.ep-badge--ship`, `.ep-badge--memorial` |
| NavItem | `.ep-nav-item` | `.ep-nav-item--active` |
| Modal | `.ep-modal-overlay` / `.ep-modal` / `.ep-modal-title` | — (controlled via `open` prop) |

All colors, radii, shadows, and transitions come from CSS custom properties defined in `styles.css` (`--ep-brand`, `--ep-bg-card`, `--ep-text`, `--ep-radius-pill`, `--ep-shadow-sm`, etc.) — never hardcode a hex value when composing layouts around these components; reach for the matching `var(--ep-*)` token instead. Read `styles.css` at the project root for the full token list before styling anything adjacent to these components.

## Build example

```tsx
<Card padding="md">
  <h3 style={{ fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>Biscuit's Book 2026</h3>
  <p style={{ margin: '0 0 12px' }}>28 pages · 6 chapters</p>
  <Badge variant="ship">Shipped</Badge>
</Card>
```

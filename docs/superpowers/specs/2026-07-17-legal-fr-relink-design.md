# Rebrancher les pages légales FR

**Date :** 2026-07-17
**Statut :** validé, prêt pour plan d'implémentation

## Problème

Trois pages légales françaises (`/legal/cgv`, `/legal/confidentialite`, `/legal/mentions`)
sont des **redirects 308 permanents** vers leurs équivalents anglais, déclarés dans
`next.config.js` `redirects()`. Un visiteur français lit donc les CGV, la politique de
confidentialité et les mentions légales en anglais. Everypaw vend en France : c'est un
sujet produit et potentiellement de conformité.

Les fichiers `src/app/legal/{cgv,confidentialite,mentions}/page.tsx` existent toujours,
avec du **contenu FR à jour** (pricing 3 plans du 2026-07-07 déjà reflété : Digital
4,99 €/mois, Print 79 €/an, livre à prix dynamique). Ils sont simplement injoignables
derrière les redirects. Les sections FR sont à parité 1:1 avec les sections EN
(Objet/Purpose, Prix/Pricing, Paiement/Payment, Résiliation/Cancellation,
Rétractation/Withdrawal, Contact).

Objectif : rendre les 3 pages FR accessibles, indexables, avec hreflang réciproque et un
habillage cohérent, sans rédiger de nouvelle clause juridique.

## Décisions de cadrage

- **Schéma d'URL** : conserver les URLs françaises actuelles `/legal/cgv`,
  `/legal/confidentialite`, `/legal/mentions`. Aucun fichier déplacé, aucun slug changé.
  Google se fie au hreflang, pas à la forme de l'URL ; ces URLs peuvent porter un
  historique d'indexation antérieur aux redirects.
- **Périmètre** : minimum fonctionnel (redirects, metadata, hreflang, sitemap, liens
  footer) **plus** l'habillage cohérent (prop `locale` explicite sur nav/footer des
  6 pages légales), conformément à la convention i18n de la Session 57 (langue figée par
  URL sur les pages à langue déterministe).

## Paires de pages

| EN | FR |
|---|---|
| `/legal/terms` | `/legal/cgv` |
| `/legal/privacy` | `/legal/confidentialite` |
| `/legal/notices` | `/legal/mentions` |

## Changements

### 1. Routes & redirects

Retirer les 3 lignes de `next.config.js` `redirects()` :
`/legal/cgv → /legal/terms`, `/legal/confidentialite → /legal/privacy`,
`/legal/mentions → /legal/notices`. Les 3 `page.tsx` FR répondent alors 200.

**Note de transition** : les redirects sont `permanent: true` (301). Un 301 est mis en
cache par les navigateurs et enregistré par Google. La bascule n'est pas instantanée :
les clients ayant déjà suivi le redirect gardent `/legal/terms` en cache jusqu'à
expiration ; Google revoit le 200 au prochain crawl, accéléré par le hreflang. Rien à
faire de plus, mais l'effet est progressif.

### 2. Metadata & hreflang

Sur chacune des 6 pages, `metadata` porte :

- `description` — les FR n'en ont pas ; la tirer du contenu existant de chaque page,
  sans inventer de clause. Les EN en ont déjà une, inchangée.
- `alternates.canonical` relatif — `/legal/cgv` pour la FR, `/legal/terms` pour l'EN
  (déjà en place côté EN).
- `alternates.languages` **réciproque**, bloc identique sur les deux pages d'une paire.
  Exemple pour la paire terms/cgv :
  ```ts
  languages: {
    en: "/legal/terms",
    fr: "/legal/cgv",
    "x-default": "/legal/terms",
  }
  ```
  `x-default` pointe vers l'EN, cohérent avec la homepage (`x-default` = `/`).
- `openGraph` complet (title/description/url/siteName/type) — les FR n'en ont aucun.
  Le merge metadata Next est shallow par clé top-level : fournir un og complet à chaque
  override (règle CLAUDE.md).

`LEGAL_LAST_UPDATE_ISO` (`src/lib/legal.ts`) reste au 2026-05-26 pour les deux langues :
le contenu ne change pas, seule l'accessibilité change.

### 3. Habillage cohérent (nav + footer des 6 pages)

Les 6 pages rendent `<PublicNav variant="simple" />` et
`<PublicFooter variant="minimal" />` sans prop `locale` → le chrome suit
`navigator.language` (chrome FR autour de texte EN, et inversement).

Correctif : passer `locale` explicite —
`locale="en"` sur les 3 pages EN, `locale="fr"` sur les 3 pages FR. Les deux composants
acceptent déjà cette prop optionnelle (Session 57), aucun changement de composant.

Lien « Retour » / « Retour à l'accueil » interne à ces pages : sur les 3 pages FR, le
faire pointer vers `/fr` au lieu de `/` pour rester dans la langue. Vérifier le codage
exact à l'implémentation.

### 4. Liens footer marketing & sitemap

**Footer « full »** (`src/components/PublicFooter.tsx`, ~ligne 52) : les 3 liens légaux
affichent des libellés localisés (`t.landing.legal_cgv`, etc.) mais href en dur
`/legal/terms|privacy|notices`. Rendre la cible locale-aware : `locale === "fr"` →
`/legal/cgv|confidentialite|mentions`, sinon les slugs EN. Le footer connaît déjà sa
`locale` (prop explicite ou auto-détection).

**Sitemap** (`src/app/sitemap.ts`) : ajouter les 3 URLs FR à côté des 3 EN existantes,
`priority: 0.3`, `changeFrequency: "monthly"` (aligné sur les EN). Correct désormais que
les pages répondent 200 (un sitemap ne liste que des URLs finales en 200).

## Vérifications

- `npm run build` vert.
- `npx tsc --noEmit` propre.
- `next start` + curl sur les 6 pages :
  - les 3 FR répondent **200** (plus de 308).
  - hreflang **réciproque** présent dans le `<head>` des 6 pages (chaque page d'une paire
    déclare les mêmes `en`/`fr`/`x-default`).
  - `/sitemap.xml` liste les 3 URLs FR.
  - **zéro tiret cadratin** (U+2014) dans le HTML rendu des 6 pages : les textes FR
    datent d'avant la règle projet, à vérifier et corriger le cas échéant (virgule).
- Sur `/fr`, le footer « full » pointe vers les pages FR (vérifier via curl du HTML).

## Hors périmètre

- Aucune rédaction ni révision de clause juridique. Le contenu FR existant est réputé à
  jour et n'est pas retouché sur le fond.
- Pas de switch de langue in-page (option écartée au cadrage). Le hreflang + le footer
  marketing suffisent à la découverte.
- Pas de version FR d'autres pages publiques.
- Pas de changement de la date `LEGAL_LAST_UPDATE_ISO`.

## Fichiers touchés

- `next.config.js` — retrait de 3 redirects.
- `src/app/legal/cgv/page.tsx`, `confidentialite/page.tsx`, `mentions/page.tsx` —
  metadata complètes, `locale="fr"` sur nav/footer, lien retour vers `/fr`, correction
  tirets cadratins si présents.
- `src/app/legal/terms/page.tsx`, `privacy/page.tsx`, `notices/page.tsx` —
  `alternates.languages` réciproque, `locale="en"` sur nav/footer.
- `src/components/PublicFooter.tsx` — liens légaux locale-aware dans le footer « full ».
- `src/app/sitemap.ts` — 3 URLs FR ajoutées.

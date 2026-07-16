# AUDIT_REPORT_QUALITY — everypaw

Date: 2026-07-06 · Branch: main · **Lecture seule — aucune modification.**
Portée : ce que le premier audit excluait volontairement — **style, lisibilité, naming, conventions, refactors souhaitables sans bug, problèmes hypothétiques, doublons**. Rien ici n'est un bug déclenchable (sinon c'est dans `AUDIT_REPORT.md`). Priorisé par ratio valeur/risque de correction.

## Synthèse

| # | Catégorie | Sévérité maintenance | Occurrences |
|---|-----------|----------------------|-------------|
| Q1 | Duplication PDF (book-pdf ↔ preview-pdf) | Élevée | 2 fichiers, ~300 l. dupliquées |
| Q2 | Algo association entrées→histoires + page count | Élevée | 3 copies |
| Q3 | Prompt histoire dupliqué (generate vs story.ts) | Élevée | 2 copies |
| Q4 | Regex/const dupliquées (UUID, email) | Moyenne | UUID×14, email×7 |
| Q5 | `getServiceSupabase` réimplémenté | Moyenne | 3 copies |
| Q6 | Boilerplate auth `getUser()+401` | Moyenne | ~30 routes |
| Q7 | Couleurs hex en dur vs tokens | Moyenne | 650 occ / 51 fichiers |
| Q8 | URLs/emails absolus en dur | Faible | 62 occ / 22 fichiers |
| Q9 | Init Stripe incohérente | Faible | 14 fichiers |
| Q10 | `validateRedirectTo` contourné inline | Moyenne | 2 pages |
| Q11 | `console.*` vs `log` | Faible | ~3 fichiers |
| Q12 | Naming trompeur (`month_key`=année, etc.) | Faible | qq occ |
| Q13 | God components (2084 / 1625 l.) | Moyenne | 2-3 fichiers |
| Q14 | `reply_to` vs `replyTo` (SDK Resend) | Faible (hypothétique) | 2 fichiers |

---

## Q1 — Duplication massive entre `book-pdf` et `preview-pdf`
- **Type** : Doublon
- **Localisation** : `src/app/api/book-pdf/route.tsx` et `src/app/api/preview-pdf/route.ts`.
- **Détail** : Les deux fichiers redéfinissent à l'identique : `COVER_THEMES` (5 thèmes), `STRINGS` (blocs en/fr complets), `safeUrl`, `VALID_LANGS`/`VALID_THEMES`/`VALID_LAYOUTS`, `MAX_DEDICATION_LENGTH`/`MIN_YEAR`/`MAX_YEAR`/`MAX_CUSTOM_TITLE_LENGTH`, la validation des query params (GET), et l'algo d'association entrées→histoires. Un commentaire l'admet explicitement (« same logic as book-pdf to guarantee identical page counts ») : le couplage est maintenu par copier-coller.
- **Risque** : Divergence silencieuse — corriger un thème/une chaîne/une borne dans un seul fichier fait diverger l'aperçu du PDF final. Le rendu PDF réel (Gelato) et l'aperçu HTML peuvent ne plus correspondre.
- **Piste** : Extraire `lib/book-render-shared.ts` (thèmes, strings, constantes, validateurs, association) importé par les deux routes.

## Q2 — Algo d'association entrées→histoires + calcul de pages triplé
- **Type** : Doublon (couplage de correctness)
- **Localisation** : `src/app/api/gelato/order/route.ts:131-152`, `src/app/api/book-pdf/route.tsx:646-681`, `src/app/api/preview-pdf/route.ts` (buildHtml).
- **Détail** : La boucle « best-match story par date » et le calcul du nombre de pages sont réécrits trois fois. Pire : `book-pdf` réinline la formule de page count (`Math.max(28, Math.ceil(contentPages/4)*4)`) au lieu d'appeler `lib/book-pages.ts:calcPageCount()` — qui existe et encode exactement cette règle. `gelato/order` appelle bien `calcPageCount`, `book-pdf` non.
- **Risque** : Le `pageCount` déclaré à Gelato (`gelato/order`) doit égaler le nombre réel de pages du PDF (`book-pdf`). Trois implémentations = risque de commande imprimée rejetée ou mal paginée si l'une dérive.
- **Piste** : Une seule fonction partagée `associateEntriesToStories()` + usage systématique de `calcPageCount()`.

## Q3 — Prompt de génération d'histoire dupliqué dans la route `generate`
- **Type** : Doublon
- **Localisation** : `src/app/api/generate/route.ts:110-153` vs `src/lib/story.ts:12-79` (`STYLE_DESCRIPTIONS` + `buildStoryPrompt`).
- **Détail** : `generate/route.ts` réécrit `STYLE_DESCRIPTIONS` et un prompt caractère-pour-caractère identiques à `story.ts`, alors que `story.ts` exporte déjà `buildStoryPrompt()` et `generateAndSaveStory()` (utilisés par les crons). La route user-facing n'utilise pas ces helpers.
- **Risque** : Deux prompts à maintenir ; une amélioration du prompt côté cron ne profite pas à la génération manuelle (et vice-versa) — style d'histoires divergent selon le point d'entrée.
- **Piste** : `generate/route.ts` doit appeler `buildStoryPrompt`/`generateAndSaveStory` de `story.ts`.

## Q4 — `UUID_REGEX` et regex email redéfinis partout
- **Type** : Doublon
- **Localisation** : `UUID_REGEX = /^[0-9a-f]{8}-.../i` dans **14 fichiers** (memorial/tributes ×3, gelato/order, pet-members ×2, generate ×2, book-pdf, book-configs ×2, book-pdf-link, preview-pdf, book-checkout). Regex email `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` dans **7 fichiers** (signup, waitlist, gift/checkout, contact, pet-members, ExitIntentPopup, ContactForm), avec des variantes subtiles (`\.[^\s@]{2,}` dans pet-members seulement).
- **Risque** : Faible correctness (les variantes email divergent déjà), fort bruit de maintenance.
- **Piste** : `lib/validation.ts` exportant `UUID_REGEX`, `EMAIL_REGEX`, `isUuid()`, `isEmail()`.

## Q5 — `getServiceSupabase` réimplémenté 3 fois
- **Type** : Doublon
- **Localisation** : canonique `src/lib/plan.ts:35-40` ; copies locales `src/app/api/share-card/route.tsx:8-13` (justifié : runtime `edge`), `src/app/memorial/[id]/page.tsx` (`serviceClient`).
- **Détail** : share-card en edge ne peut pas importer plan.ts (dépend de next/headers) — copie légitime. Les autres devraient importer.
- **Piste** : Sortir un `lib/supabase/service.ts` sans dépendance server-only, importable partout (y compris edge).

## Q6 — Boilerplate d'auth répété dans ~30 routes
- **Type** : Refactor souhaitable
- **Localisation** : motif `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });` dans ~30 routes API.
- **Piste** : Wrapper `withAuth(handler)` ou helper `requireUser(req)` renvoyant `{ user, supabase }` ou une `Response` 401. Réduit le bruit et garantit l'uniformité du message/statut.

## Q7 — Couleurs de marque en dur au lieu des tokens
- **Type** : Convention (documentée dans CLAUDE.md)
- **Localisation** : `#3D2B1F`/`#C8813A`/`#7A5C44`/`#F7F2EA` (+ dérivés) — **650 occurrences dans 51 fichiers**. `src/app/globals.css` définit pourtant des tokens `--ep-*`, et `CLAUDE.md` documente une palette de tokens.
- **Détail** : Styles quasi 100 % inline (`style={{ … }}`) avec hex littéraux, très peu de classes/vars. Incohérent avec la convention déclarée.
- **Risque** : Aucun bug ; changement de charte = 650 éditions ; risque d'incohérences de teintes (plusieurs valeurs proches coexistent).
- **Piste** : Migrer progressivement vers `var(--ep-*)` / classes utilitaires ; au minimum les couleurs de marque.

## Q8 — URLs et emails absolus en dur
- **Type** : Convention
- **Localisation** : `https://everypaw.app` (**62 occ / 22 fichiers**, surtout crons et emails), fallback `process.env.NEXT_PUBLIC_APP_URL ?? "https://everypaw.app"` répété, adresse support `julien.mauduit@gmail.com` en dur dans `src/app/api/suggestion/route.ts:37`.
- **Risque** : Environnements de staging/preview enverront des liens pointant vers la prod ; email support codé en dur.
- **Piste** : Constante `APP_URL`/`SUPPORT_EMAIL` centralisée (env), utilisée partout.

## Q9 — Initialisation Stripe incohérente
- **Type** : Convention
- **Localisation** : `new Stripe(process.env.STRIPE_SECRET_KEY!)` dans 14 fichiers. Certains au niveau module (checkout, webhook…), d'autres re-créés par requête (`gift/checkout:50`, `gift/complete:63`). Aucun `apiVersion` épinglé.
- **Risque** : Faible ; version d'API Stripe implicite (celle du compte) → comportement qui peut changer côté Stripe sans redeploy.
- **Piste** : `lib/stripe.ts` exportant une instance unique avec `apiVersion` explicite.

## Q10 — `validateRedirectTo` existe mais est contourné par une validation inline
- **Type** : Doublon / incohérence
- **Localisation** : helper `src/lib/auth.ts:32-43` (`validateRedirectTo`, vérifie hostname + https) vs validation inline `target.startsWith("/") && !target.startsWith("//")` dans `src/app/auth/login/page.tsx:22`, `src/app/auth/signup/page.tsx:60`, `src/app/auth/callback/route.ts:23`.
- **Détail** : Deux logiques divergentes pour « redirection sûre » : le helper valide des URLs absolues même-hôte/https ; l'inline n'accepte que des chemins relatifs. Le helper n'est référencé nulle part côté pages auth.
- **Risque** : Pas de faille (l'inline est correct), mais logique morte + risque qu'un futur dev utilise le mauvais.
- **Piste** : Un seul validateur ; supprimer ou aligner `validateRedirectTo`.

## Q11 — `console.*` au lieu du logger `log`
- **Type** : Convention
- **Localisation** : `src/lib/stripe-helpers.ts:54` (`console.error`), `src/app/auth/signup/page.tsx:149` (`console.error`), `src/lib/pdf-token.ts:7` (`console.warn`).
- **Détail** : `lib/log.ts` centralise le gating par `DEBUG_LOGS`. Ces `console.*` échappent à la convention (le `console.error` de signup logge des détails d'erreur Supabase côté client).
- **Piste** : Utiliser `log.*` (ou retirer le log client de signup).

## Q12 — Naming trompeur
- **Type** : Naming
- **Localisation** : colonne `month_key` réutilisée pour stocker une **année** (`yearKey`) dans les histoires d'anniversaire (`src/lib/story.ts:225`, `cron/birthday-check`). `anonClient()` renvoyait en réalité un client à privilèges variables (corrigé dans memorial lors du fix H-2, mais le motif existait). Variables `p`/`h`/`c`/`s` mono-lettres dans plusieurs routes.
- **Risque** : Confusion à la lecture ; `month_key='2027'` vs `'2027-06'` mélange deux formats dans la même colonne.
- **Piste** : Commenter la sémantique dual de `month_key` ou séparer `period_key`.

## Q13 — Composants « dieu » monolithiques
- **Type** : Refactor souhaitable
- **Localisation** : `src/app/dashboard/pets/[id]/page.tsx` (**2084 lignes**), `order/page.tsx` (**1625**), `settings/page.tsx` (964), `components/DashboardNav.tsx` (877).
- **Risque** : Difficile à tester/réviser ; state local volumineux ; ces fichiers n'ont pas pu être audités ligne à ligne au premier passage (couverture Z8 partielle).
- **Piste** : Découper en sous-composants + hooks (`useBookOrder`, `usePetTimeline`…).

## Q14 — `reply_to` vs `replyTo` (SDK Resend) — hypothétique
- **Type** : Problème hypothétique / naming
- **Localisation** : `src/app/api/suggestion/route.ts:38`, `src/app/api/contact/route.ts:49` utilisent `reply_to`. Le SDK Resend (Node) attend `replyTo` (camelCase).
- **Détail** : Si le SDK ignore la clé inconnue, le Reply-To n'est pas positionné (répondre à un contact irait vers le `from` `noreply@`). À vérifier contre la version installée de `resend` — d'où « hypothétique » : pas de chemin de bug prouvé sans exécuter.
- **Piste** : Confirmer la casse attendue par `resend@3.2` et aligner.

---

---

## Statut des corrections (2026-07-06)

`tsc --noEmit` OK · 16 tests OK après refactor.

| # | Statut | Détail |
|---|--------|--------|
| Q1 | ✅ Partiel | `lib/book-shared.ts` créé : `COVER_THEMES`, `VALID_LANGS/THEMES/LAYOUTS` (+types), `MAX_*`, `MIN/MAX_YEAR`, `safeUrl` extraits et importés par `book-pdf` + `preview-pdf`. **`STRINGS` laissés dupliqués volontairement** (PDF en majuscules vs preview en titre — divergence de style intentionnelle, les fusionner changerait le rendu). |
| Q2 | ✅ Corrigé | `bestStoryIndexForDate()` unique dans `book-shared.ts`, utilisé par `book-pdf`, `preview-pdf`, `gelato/order`. `book-pdf` utilise désormais `calcPageCount()` (comme `gelato/order`) → page count déclaré = pages réelles garanti. |
| Q3 | ✅ Corrigé | `generate/route.ts` appelle `buildStoryPrompt()` de `story.ts` ; `STYLE_DESCRIPTIONS` + prompt inline supprimés. |
| Q4 | ✅ Corrigé | `lib/validation.ts` (`UUID_REGEX`, `EMAIL_REGEX`, `isUuid`, `isEmail`, `isSafeRelativePath`) ; 14 defs `UUID_REGEX` + 7 defs email remplacées par imports. `pet-members` unifié sur `EMAIL_REGEX` standard. |
| Q5 | ✅ Corrigé | `lib/supabase/service.ts` (importable edge) ; `plan.ts` le ré-exporte ; memorial l'utilise. share-card garde sa copie (runtime edge — justifié). |
| Q6 | ⏸️ Non fait | Wrapper `withAuth` non introduit — refactor transversal ~30 routes, faible valeur/risque, reporté. |
| Q7 | ⏸️ Non fait — **choix délibéré** | 650 hex → tokens : purement cosmétique, aucun gain fonctionnel, 650 éditions sur 51 fichiers = risque de casser des styles sans vérif visuelle. À migrer au fil de l'eau, pas en sweep aveugle. |
| Q8 | ⏸️ Non fait | Constante `APP_URL`/`SUPPORT_EMAIL` non centralisée — reporté (nombreux points d'usage, faible risque actuel). |
| Q9 | ✅ Corrigé | `lib/stripe.ts` singleton (`apiVersion: '2023-10-16'`) ; 14 fichiers migrés, imports `Stripe` inutilisés retirés. |
| Q10 | ✅ Requalifié + corrigé | `validateRedirectTo` **n'est pas mort** (3 routes email, sémantique URL-absolue différente) — conservé. Le check relatif commun extrait en `isSafeRelativePath` et utilisé dans login/signup/callback. |
| Q11 | ✅ Corrigé | `console.*` → `log.*` dans `stripe-helpers`, `pdf-token`, `signup`. |
| Q12 | ✅ Corrigé | Commentaire ajouté sur la sémantique double de `month_key` (`story.ts`). |
| Q13 | ⏸️ Non fait — **choix délibéré** | Découpe des composants 2084/1625 l. : refactor lourd, zéro couverture de test sur ces flux UI, risque de régression élevé sans vérification visuelle. À faire délibérément, pas en passe mécanique. |
| Q14 | ✅ Vérifié — RAS | `resend@3.x` attend bien `reply_to` (snake_case) — le code était **correct**, fausse alerte. |

**Reportés (Q6, Q7, Q8, Q13)** : sans bug associé, à traiter incrémentalement. Q7 et Q13 sont laissés sciemment — un sweep aveugle y ferait plus de mal que de bien sans tests/vérif visuelle.

*Fin.*

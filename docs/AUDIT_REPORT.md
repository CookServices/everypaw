# AUDIT_REPORT — everypaw

Date: 2026-07-06 · Branch: main (29cdccc) · Stack: Next.js 14 / TypeScript / Supabase (RLS) / Stripe / Resend / Gelato / Anthropic.

> **MàJ 2026-07-06 — corrections appliquées.** 12/13 findings corrigés, B-3 laissé tel quel (déjà mitigé). `tsc --noEmit` OK, 16 tests OK. Voir §6 « Statut des corrections ».

---

## 1. Synthèse

| Sévérité | Bug | Edge case | Sécurité | Total |
|----------|-----|-----------|----------|-------|
| CRITIQUE | 0 | 0 | 1 | **1** |
| HAUTE | 2 | 0 | 1 | **3** |
| MOYENNE | 2 | 0 | 1 | **3** |
| BASSE | 1 | 3 | 2 | **6** |
| **Total** | **5** | **3** | **5** | **13** |

## 2. Couverture

Zones identifiées : 10 (+ config). Zones auditées : **10/10** (Z8 front dashboard partiellement — voir ci-dessous).

| Zone | État | Note |
|------|------|------|
| Z1 Auth & session | ✅ Audité | middleware, lib/auth, supabase clients, pages auth, auth-hook |
| Z2 Paiements Stripe | ✅ Audité | 9 routes stripe + 3 gift + helpers + plan + currency |
| Z3 Livres & impression | ✅ Audité | gelato/order, book-pdf, preview-pdf, pdf-token, book-configs |
| Z4 IA / génération | ✅ Audité | generate, generate-origins, suggestion, anthropic, story |
| Z5 Crons & emails | ✅ Audité | 7 crons (tous verifyCronRoute), contact, waitlist, unsubscribe |
| Z6 Partage & collaboration | ✅ Audité | invite, pet-members, memorial tributes, pages publiques |
| Z7 Compte & données | ✅ Audité | account/delete, export-data, locale |
| Z8 Front dashboard | ⚠️ Partiel | Routes d'accès données lues ; gros fichiers client (pets/[id] 2084 l., order 1625 l.) **non lus ligne à ligne** — risque résiduel côté client uniquement |
| Z9 Lib partagée | ✅ Audité | html, currency, log, rate-limit, date (survol) |
| Z10 SQL / RLS | ✅ Audité | 24 migrations, focus RLS + fonctions SECURITY DEFINER |

**NON AUDITÉ explicitement** : `scripts/stripe-create-products.ts` (outil one-shot), fichiers `*.test.ts` (tests), `public/`, `messages/` (JSON i18n), `docs/`, pages `legal/*` (contenu statique), contenu ligne-à-ligne des 3 plus gros composants client de Z8. Pas de scan CVE outillé des dépendances npm.

## 3. Top 5 à traiter en priorité

1. **[C-1] Fonctions RPC crédits-livre exposées à tout utilisateur authentifié** — permet potentiellement de s'auto-créditer des livres imprimés gratuits. Impact financier direct. À vérifier d'urgence côté privilèges Supabase.
2. **[H-1] Code cadeau réutilisable à l'infini** — le promotion code n'est jamais consommé ; un achat = abonnement gratuit renouvelable.
3. **[H-2] Pages mémorial cassées pour le public** — régression RLS : la page se lit via clé anon mais les policies `pets`/`stories` n'autorisent plus la lecture publique → « not_found » pour tout visiteur non-propriétaire.
4. **[H-3] Crédit livre annuel refusé au renouvellement** — garde 365 j comparée à `now()` → off-by-epsilon prive les abonnés Print de leur livre chaque année.
5. **[M-2] /api/stripe/checkout autorise une double souscription** — pas de contrôle d'abonnement existant + nouveau customer à chaque fois → double facturation et abonnement orphelin.

---

## 4. Findings détaillés (sévérité décroissante)

### [C-1] Fonctions SECURITY DEFINER de crédits-livre sans REVOKE → auto-attribution de livres gratuits
- **Sévérité** : CRITIQUE
- **Type** : Sécurité (broken access control / privilege)
- **Localisation** : `supabase/migrations/add_plan_and_book_credits.sql:40-48` (`increment_book_credits`), `supabase/migrations/round3_security_fixes_2026_05_26.sql:4-47` (`try_consume_book_credit`, `restore_book_credit`), `supabase/migrations/security_fixes_2026_05_23.sql:4-11` (`decrement_book_credits`).
- **Description** : Ces fonctions sont `SECURITY DEFINER`, dans le schéma `public`, et **aucune migration ne fait `REVOKE EXECUTE ... FROM anon, authenticated`**. Sous Supabase/PostgREST, les fonctions du schéma `public` sont exposées comme endpoints RPC (`POST /rest/v1/rpc/<fn>`) et l'`EXECUTE` par défaut est accordé aux rôles `anon`/`authenticated`. Le code applicatif ne les appelle qu'en service-role (webhook, gelato/order) : aucune raison légitime de les exposer au client. Contraste révélateur : `check_rate_limit` et `user_owns_pet` reçoivent un `GRANT EXECUTE ... TO anon, authenticated` explicite — les fonctions crédits n'ont, elles, aucune gestion de privilège.
- **Scénario de déclenchement** : Utilisateur connecté (plan `free`) récupère son JWT (présent côté client) et son `user_id`, puis appelle directement `POST /rest/v1/rpc/increment_book_credits` avec `{"p_user_id":"<son-uid>"}`. `book_credits` incrémente. Répéter N fois, puis commander N livres physiques gratuits via le flux normal (`try_consume_book_credit` acceptera). `restore_book_credit(mon_uid)` fonctionne aussi pour les plans free/book_only.
- **Impact** : Livres imprimés (coût Gelato + expédition réels) commandés gratuitement en quantité arbitraire. Perte financière directe et non plafonnée.
- **Confiance** : À VÉRIFIER — dépend de la config de privilèges du projet Supabase (par défaut, l'`EXECUTE` est accordé à `authenticated`). Le mécanisme d'exposition et l'absence de REVOKE sont CERTAINS ; l'exploitabilité exacte se confirme en testant l'appel RPC avec un JWT `authenticated`.
- **Piste de correction** : `REVOKE EXECUTE ON FUNCTION increment_book_credits, decrement_book_credits, try_consume_book_credit, restore_book_credit FROM anon, authenticated, public;` (elles restent appelables en service-role). Ajouter aussi `SET search_path = public` à celles qui ne l'ont pas.

### [H-1] Code cadeau jamais consommé : abonnement gratuit réutilisable
- **Sévérité** : HAUTE
- **Type** : Sécurité / Bug
- **Localisation** : `src/app/api/gift/redeem/route.ts:25-142` (aucune désactivation), en regard de `src/app/api/gift/complete/route.ts:100-114` (`max_redemptions: 1`).
- **Description** : Le promotion code Stripe (créé avec `max_redemptions: 1`) est seulement **validé** (`promoCode.active`), jamais consommé. Les deux chemins d'activation appliquent le **coupon** directement (`discounts: [{ coupon: giftCouponId }]`), pas le promotion code — Stripe ne décrémente donc jamais `max_redemptions` et le code reste `active`.
- **Scénario de déclenchement** : Le destinataire active son cadeau. Ensuite il ré-appelle `POST /api/gift/redeem` avec le même code : `hasPaidSub` → nouvelle phase 100 % off programmée à chaque renouvellement, répétable jusqu'à expiration (365 j) et au-delà via le chemin checkout tant que le code reste `active`.
- **Impact** : Perte de revenus ; le « usage unique » annoncé dans l'email est inopérant.
- **Confiance** : CERTAIN
- **Piste de correction** : Après activation, `stripe.promotionCodes.update(promoCode.id, { active: false })`, ou utiliser `discounts: [{ promotion_code: promoCode.id }]` pour que Stripe décompte la redemption.

### [H-2] Pages mémorial (et lecture publique) cassées par une régression RLS
- **Sévérité** : HAUTE
- **Type** : Bug (régression)
- **Localisation** : `src/app/memorial/[id]/page.tsx:74-96` (utilise `anonClient()`), policies dans `supabase/migrations/add_pet_members_2026_06_11.sql:47-138` + `fix_pets_members_rls_recursion_2026_06_11.sql:51-57`.
- **Description** : La page mémorial lit `pets` et `stories` via la **clé anon** en se fiant au commentaire « RLS allows public reads on pets/stories ». Or ce commentaire est périmé : `add_pet_members` a remplacé `pets_public_read`/`stories_public_read` (`USING (true)`) par des policies `owner_or_member` (`auth.uid() = user_id OR user_is_accepted_member(id)`). Pour un visiteur non authentifié, `auth.uid()` est NULL → 0 ligne → `.single()` renvoie `data = null` → la page rend « not_found ».
- **Scénario de déclenchement** : Un utilisateur partage l'URL mémorial `/memorial/<petId>` (fonctionnalité de partage public de deuil). N'importe quel visiteur déconnecté ouvre le lien → page « not_found ». Seuls le propriétaire/membres connectés voient la page.
- **Impact** : Fonctionnalité mémorial (cœur émotionnel du produit, destinée au partage) inopérante pour son audience publique. `generateMetadata` échoue aussi → OG/partage social dégradés.
- **Confiance** : PROBABLE — déduit des policies présentes dans les migrations ; à confirmer sur l'état RLS réellement déployé (impossible d'exécuter la DB ici). Le contraste avec `/pets/[id]` (qui, lui, utilise le service-role) renforce l'hypothèse d'une régression non répercutée sur la page mémorial.
- **Piste de correction** : Soit lire la page mémorial via service-role avec filtre `pet_id` + garde `deceased_at IS NOT NULL` (comme `/pets/[id]`), soit ajouter une policy publique de lecture restreinte aux animaux décédés.

### [H-3] Garde 365 jours : les abonnés Print annuels perdent leur crédit livre au renouvellement
- **Sévérité** : HAUTE
- **Type** : Bug
- **Localisation** : `src/app/api/stripe/webhook/route.ts:273-300`.
- **Description** : `last_book_credit_at` est écrit avec `new Date().toISOString()` (instant du traitement du webhook). Le renouvellement annuel Stripe survient ~365 j plus tard ; `daysSinceLast = (Date.now() - last)/86400000` vaut alors ~364,999 `< 365` → le crédit est refusé (`return` anticipé).
- **Scénario de déclenchement** : Abonné Print annuel souscrit le 10/03/2026 (crédit reçu). Renouvellement le 10/03/2027 : `invoice.payment_succeeded` (billing_reason `subscription_cycle`) → garde `< 365` vraie → skip. L'abonné paie 79 € sans recevoir son livre annuel (sauf années bissextiles où 366 j > 365).
- **Impact** : Perte systématique d'entitlement pour clients payants annuels.
- **Confiance** : PROBABLE (biais structurel vers l'échec ; marge de quelques secondes/heures selon le timing webhook).
- **Piste de correction** : Tolérance (`< 350`) ou ancrer la comparaison sur `invoice.period_start` plutôt que `now()`.

### [M-1] /pets/[id] : la page publique lit via service-role et expose tout animal (vivant compris)
- **Sévérité** : MOYENNE
- **Type** : Sécurité (exposition de données / privacy)
- **Localisation** : `src/app/pets/[id]/page.tsx:81-87` et `generateMetadata` `:13-17`.
- **Description** : La page « profil public » utilise `getServiceSupabase()` (bypass RLS) et renvoie tout le journal d'un animal (nom, bio, date de naissance, 6 dernières entrées avec contenu + photos, 3 histoires) **sans aucune condition** : pas de flag `is_public`, pas de garde `deceased_at`, pas d'opt-in propriétaire (aucune colonne de partage n'existe — vérifié dans tout `src` et les migrations). Toute personne connaissant/dérivant l'UUID de l'animal lit le journal privé complet.
- **Scénario de déclenchement** : Un UUID d'animal fuit (OG share-card, referrer, lien partagé une fois, énumération d'un utilisateur ayant plusieurs pets) → `GET /pets/<uuid>` renvoie le journal entier, y compris pour un animal vivant dont le propriétaire n'a jamais voulu partager la page.
- **Impact** : Fuite de données personnelles (habitudes, localisation implicite via photos, routine de l'animal/foyer). Aucun moyen de rendre un animal privé.
- **Confiance** : CERTAIN (le mécanisme). Exploitabilité limitée par la nature non-devinable de l'UUID — mais capability-URL permanente et non désactivable.
- **Piste de correction** : Introduire un flag de partage explicite (`is_public`/slug dédié) et filtrer dessus, ou restreindre la page publique aux animaux décédés comme le mémorial.

### [M-2] /api/stripe/checkout : double souscription et abonnement orphelin
- **Sévérité** : MOYENNE
- **Type** : Bug
- **Localisation** : `src/app/api/stripe/checkout/route.ts:11-57`.
- **Description** : Aucun contrôle de `profile.stripe_subscription_id` avant de créer une session `mode: subscription`, et usage de `customer_email` (au lieu de `customer`) → **nouveau customer Stripe à chaque checkout**. Un utilisateur déjà premium peut souscrire une seconde fois ; le webhook `checkout.session.completed` écrase `stripe_customer_id`/`stripe_subscription_id` avec les nouveaux. L'ancien abonnement continue de facturer mais n'est plus référencé : `cancel`/`upgrade` ne visent que le nouveau, et le `customer.subscription.deleted` de l'ancien customer ne matche plus aucun profil (`.eq("stripe_customer_id", …)`).
- **Scénario de déclenchement** : Utilisateur premium rejoue l'appel API (deux onglets `/dashboard/upgrade`, double-clic, retour navigateur) → deux subscriptions actives sur deux customers, une seule annulable depuis l'app.
- **Impact** : Double facturation client, abonnement fantôme impossible à annuler côté produit.
- **Confiance** : PROBABLE (l'UI peut masquer le bouton, mais l'endpoint reste appelable).
- **Piste de correction** : Refuser si un abonnement actif existe (réutiliser `resolveSubscriptionId`), et lier la session au `customer` Stripe existant.

### [M-3] Divergence des noms de variables d'env prix Stripe → fallback silencieux `plan: "digital"`
- **Sévérité** : MOYENNE
- **Type** : Bug (config)
- **Localisation** : `.env.local.example:14-19` vs `src/lib/stripe-helpers.ts:12-29`, `src/lib/plan.ts:101-123`, `src/app/api/stripe/webhook/route.ts:90,217-223`.
- **Description** : L'exemple documente `STRIPE_PRICE_DIGITAL_MONTHLY`, `STRIPE_PRICE_PRINT_MONTHLY`, `STRIPE_PRICE_BOOK_ONCE` ; le code lit `STRIPE_PRICE_ID_DIGITAL_EUR/USD`, `STRIPE_PRICE_ID_PRINT_EUR/USD`, `STRIPE_PRICE_ID_DIGITAL_ANNUAL_*`, `STRIPE_PRICE_PRINT_ANNUAL[_EUR/_USD]`, `STRIPE_GIFT_PRICE_ID_*`. Sur un environnement configuré d'après l'exemple, `PRICE_MAP` est vide (checkout → 400) et surtout `priceIdToPlan()` renvoie `null` → le webhook applique le **fallback `plan: "digital"`** (`route.ts:90`) : un abonné Print serait enregistré comme digital et privé de ses crédits livre.
- **Scénario de déclenchement** : Nouvel environnement (staging, rotation de compte Stripe) provisionné depuis `.env.local.example` → souscription Print → profil `digital`, aucun crédit livre.
- **Impact** : Mauvais plan en base, perte d'entitlements, diagnostic difficile (silencieux).
- **Confiance** : À VÉRIFIER (la prod actuelle a probablement les bons noms ; le piège vise tout nouvel environnement).
- **Piste de correction** : Aligner `.env.local.example` sur les noms réels ; remplacer le fallback `"digital"` par un log d'erreur explicite plutôt qu'une valeur par défaut.

### [B-1] Cap free-plan des entrées : les contributions à l'animal d'autrui comptent dans le quota du contributeur
- **Sévérité** : BASSE
- **Type** : Edge case (régression)
- **Localisation** : `supabase/migrations/enforce_free_entry_limit_2026_07_06.sql:7-33` — écrase la version de `add_pet_members_2026_06_11.sql:147-170` qui exemptait les contributeurs.
- **Description** : La version 07-06 du trigger compte `count(*) FROM entries WHERE user_id = NEW.user_id` sans tenir compte de la propriété de l'animal. La version précédente (06-11) exemptait explicitement les entrées de contribution (`v_pet_owner IS DISTINCT FROM NEW.user_id → RETURN NEW`). La réécriture a supprimé cette exemption.
- **Scénario de déclenchement** : Utilisateur `free` accepte d'être contributeur sur l'animal d'un ami payant. Après 10 entrées (toutes sur l'animal de l'ami), ses contributions suivantes sont bloquées par `entry_limit`.
- **Impact** : Contributeurs légitimes bloqués ; incohérent avec l'intention documentée de la migration 06-11.
- **Confiance** : CERTAIN (lecture du code SQL ; sous réserve que 07-06 soit bien la dernière migration appliquée).
- **Piste de correction** : Réintroduire l'exemption « pet non possédé par NEW.user_id → pas de décompte ».

### [B-2] Middleware fail-open sur exception
- **Sévérité** : BASSE
- **Type** : Sécurité (durcissement)
- **Localisation** : `src/middleware.ts:41-43`.
- **Description** : Toute exception (indisponibilité Supabase) fait `return NextResponse.next()` : les redirections d'auth `/dashboard` sont contournées. Les données restent protégées (pages client + RLS) ; seule la coquille UI est servie.
- **Scénario de déclenchement** : Panne réseau Supabase pendant une requête `/dashboard` d'un visiteur non connecté → page rendue au lieu de redirect login.
- **Impact** : Mineur, pas d'exposition de données (RLS), UX dégradée.
- **Confiance** : CERTAIN
- **Piste de correction** : En cas d'erreur sur un chemin `/dashboard`, rediriger vers `/auth/login`.

### [B-3] /api/gift/complete non authentifié divulgue le code cadeau
- **Sévérité** : BASSE
- **Type** : Sécurité
- **Localisation** : `src/app/api/gift/complete/route.ts:57-158`.
- **Description** : La route accepte n'importe quel `sessionId` Stripe payé de type gift et renvoie `{ code }`. Le `session_id` figure dans l'URL de succès (historique, logs, referrer). Mitigé : le code est lié à `recipient_email` au moment du redeem.
- **Scénario de déclenchement** : Un `cs_...` récupéré (log proxy, historique partagé) → `POST /api/gift/complete` → obtention du code cadeau.
- **Impact** : Fuite du code ; exploitation limitée par le contrôle d'email destinataire au redeem.
- **Confiance** : CERTAIN (mécanisme) ; exploitation faible.
- **Piste de correction** : Ne pas renvoyer le code dans la réponse (l'email suffit).

### [B-4] update-password : `sessionReady` calculé mais jamais utilisé
- **Sévérité** : BASSE
- **Type** : Edge case
- **Localisation** : `src/app/auth/update-password/page.tsx:21-29,31-55`.
- **Description** : `sessionReady` est alimenté par `onAuthStateChange(PASSWORD_RECOVERY)` mais jamais lu : le formulaire se soumet même sans session de récupération → `updateUser` échoue avec le message Supabase brut (anglais, non traduit).
- **Scénario de déclenchement** : Ouverture directe de `/auth/update-password` (sans lien email) puis soumission → erreur brute « Auth session missing! ».
- **Impact** : UX cassée sur cas secondaire ; pas de faille.
- **Confiance** : CERTAIN
- **Piste de correction** : Gater le bouton/soumission sur `sessionReady` avec message explicite.

### [B-5] birthday-check : anniversaires du 29 février ignorés les années non bissextiles
- **Sévérité** : BASSE
- **Type** : Edge case
- **Localisation** : `src/app/api/cron/birthday-check/route.ts:18-29` (`.like("birthdate", "%-${mm}-${dd}")`).
- **Description** : Le matching est fait sur la chaîne `-MM-DD` du jour courant. Un animal né un 29/02 n'a de correspondance qu'une année sur quatre ; aucune bascule vers le 28/02 ou 01/03. Pas d'email d'anniversaire ni de lettre les autres années.
- **Scénario de déclenchement** : Animal `birthdate = 2024-02-29`. Le 28/02/2027, le cron cherche `%-02-28` → pas de match ; le 01/03 non plus.
- **Impact** : Fonctionnalité d'engagement manquée pour une minorité d'animaux.
- **Confiance** : CERTAIN
- **Piste de correction** : Rabattre le 29/02 sur le 28/02 les années non bissextiles.

---

## 5. Observations hors périmètre (non comptées comme findings)

- `src/lib/pdf-token.ts:9` : fallback du secret HMAC PDF sur `SUPABASE_SERVICE_ROLE_KEY` si `PDF_ACCESS_SECRET` absent — fonctionnel mais couple deux secrets ; durcissement souhaitable.
- `src/app/api/suggestion/route.ts:38` et `contact/route.ts:49` : champ `reply_to` (le SDK Resend v3 attend `replyTo`) — à vérifier, le reply-to pourrait être ignoré silencieusement. Non bloquant.
- `increment_book_credits`/`decrement_book_credits` : absence de `SET search_path` (replié dans C-1).
- Z8 : les 3 gros composants client (`dashboard/pets/[id]/page.tsx`, `order/page.tsx`, `settings/page.tsx`) n'ont pas été lus intégralement ; aucune injection `dangerouslySetInnerHTML` dangereuse détectée (seuls des JSON-LD statiques). Risque résiduel limité au client.

---

## 6. Statut des corrections (2026-07-06)

| ID | Statut | Correctif |
|----|--------|-----------|
| C-1 | ✅ Corrigé | `supabase/migrations/revoke_book_credit_rpc_2026_07_06.sql` — REVOKE EXECUTE des 4 RPC crédits depuis anon/authenticated/public + `search_path` durci. **À appliquer en base Supabase.** |
| H-1 | ✅ Corrigé | `gift/redeem` — branche schedule : `promotionCodes.update(active:false)` ; branche checkout : `discounts: [{ promotion_code }]` (Stripe consomme à la complétion, pas de burn prématuré). |
| H-2 | ✅ Corrigé | `memorial/[id]/page.tsx` — lecture via service-role + garde `deceased_at` dans page et `generateMetadata`. |
| H-3 | ✅ Corrigé | `stripe/webhook` — garde crédit livre `< 365` → `< 350` (absorbe la dérive du timing). |
| M-1 | ✅ Corrigé | `pets/[id]/page.tsx` — page publique restreinte aux animaux décédés (décision produit : « restreindre aux décédés »). |
| M-2 | ✅ Corrigé | `stripe/checkout` — rejet `already_subscribed` si abo actif + réutilisation du `customer` Stripe existant. |
| M-3 | ✅ Corrigé | `stripe/webhook` — plan dérivé des metadata quand `priceIdToPlan` renvoie null + `log.error` ; `.env.local.example` réaligné sur les vrais noms de variables. |
| B-1 | ✅ Corrigé | `supabase/migrations/restore_contributor_entry_exemption_2026_07_06.sql` — réintroduit l'exemption contributeur du cap free. **À appliquer en base.** |
| B-2 | ✅ Corrigé | `middleware.ts` — fail-closed : redirection `/auth/login` sur exception pour les chemins `/dashboard`. |
| B-3 | ⏸️ Inchangé | Déjà mitigé : code renvoyé une seule fois (idempotence `gift_email_sent`) + binding `recipient_email` au redeem. UX acheteur préservée. |
| B-4 | ✅ Corrigé | `auth/update-password` — submit gaté sur `sessionReady` (PASSWORD_RECOVERY / SIGNED_IN / session présente) avec message localisé. |
| B-5 | ✅ Corrigé | `cron/birthday-check` — les naissances 29/02 rattrapées le 28/02 des années non bissextiles (`.or` sur patterns). |

**Actions manuelles restantes (hors code) :**
1. Appliquer les 2 migrations SQL en base Supabase (C-1 et B-1).
2. Vérifier post-déploiement que `POST /rest/v1/rpc/increment_book_credits` avec un JWT `authenticated` renvoie bien 401/403 (C-1).

*Fin du rapport.*

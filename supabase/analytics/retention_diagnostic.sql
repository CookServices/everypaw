-- ─────────────────────────────────────────────────────────────────────────
-- Everypaw — Diagnostic de rétention rétroactif (read-only)
-- ─────────────────────────────────────────────────────────────────────────
--
-- OBJET : répondre AUJOURD'HUI, sans nouvel event tracking, à la question
--         « où décrochent les utilisateurs ? » à partir des timestamps déjà
--         présents en base (profiles.created_at, entries.created_at, stories).
--
-- USAGE : coller chaque bloc (A → E) dans l'éditeur SQL Supabase et lancer.
--         100 % read-only — aucun write, aucun DDL. Sans danger sur la prod.
--
-- LECTURE : le bloc C (point de décrochage) est la réponse directe à la
--           question diagnostique. Les blocs A/B/D donnent le contexte.
--
-- HYPOTHÈSE MÉTRIQUE : "actif" = a créé au moins une entrée de journal.
--   On mesure l'ACTIVATION (a-t-il vécu le produit) et la RÉTENTION (revient-il
--   après le pic d'inscription). On exclut des dénominateurs les comptes trop
--   récents pour être éligibles à une fenêtre (ex. < 7j pour la rétention D7).
-- ─────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════
-- BLOC A — Funnel d'activation global (le "où ça tombe" en une table)
-- Chaque marche est reconstruite depuis les tables brutes, pas d'event log.
-- ═══════════════════════════════════════════════════════════════════════
WITH per_user AS (
  SELECT
    p.id                                   AS user_id,
    p.created_at                           AS signed_up_at,
    p.plan,
    (SELECT count(*) FROM pets    pe WHERE pe.user_id = p.id)               AS pets_count,
    (SELECT count(*) FROM entries e  WHERE e.user_id  = p.id)               AS entries_count,
    (SELECT count(*) FROM stories s  WHERE s.user_id  = p.id)               AS stories_count
  FROM profiles p
)
SELECT
  'Étape' AS _, step, users,
  round(100.0 * users / NULLIF(FIRST_VALUE(users) OVER (ORDER BY ord), 0), 1) AS pct_of_signups
FROM (
  SELECT 1 AS ord, '1. Inscription'            AS step, count(*) AS users FROM per_user
  UNION ALL
  SELECT 2, '2. A créé un animal',              count(*) FROM per_user WHERE pets_count   >= 1
  UNION ALL
  SELECT 3, '3. A écrit 1 entrée (activation)', count(*) FROM per_user WHERE entries_count >= 1
  UNION ALL
  SELECT 4, '4. A écrit 2 entrées (habitude)',  count(*) FROM per_user WHERE entries_count >= 2
  UNION ALL
  SELECT 5, '5. A généré 1 histoire IA (wow)',  count(*) FROM per_user WHERE stories_count >= 1
  UNION ALL
  SELECT 6, '6. Plan payant',                   count(*) FROM per_user WHERE plan IN ('digital','print','book_only')
) f
ORDER BY ord;


-- ═══════════════════════════════════════════════════════════════════════
-- BLOC B — Courbe de rétention par cohorte hebdo (D1 / D7 / D30)
-- "Retenu à J_n" = a créé une entrée dont created_at >= signup + n jours.
-- On n'affiche un % que si le cohort a eu le temps d'atteindre la fenêtre.
-- ═══════════════════════════════════════════════════════════════════════
WITH signups AS (
  SELECT id AS user_id,
         created_at AS signed_up_at,
         date_trunc('week', created_at)::date AS cohort_week
  FROM profiles
),
acts AS (
  SELECT s.user_id, s.cohort_week, s.signed_up_at,
         max(e.created_at) AS last_entry_at,
         bool_or(e.created_at >= s.signed_up_at + interval '1 day')  AS ret_d1,
         bool_or(e.created_at >= s.signed_up_at + interval '7 day')  AS ret_d7,
         bool_or(e.created_at >= s.signed_up_at + interval '30 day') AS ret_d30
  FROM signups s
  LEFT JOIN entries e ON e.user_id = s.user_id
  GROUP BY s.user_id, s.cohort_week, s.signed_up_at
)
SELECT
  cohort_week,
  count(*)                                                       AS signups,
  round(100.0 * count(*) FILTER (WHERE ret_d1)  / NULLIF(count(*) FILTER (WHERE now() >= signed_up_at + interval '1 day'),  0), 0) AS ret_d1_pct,
  round(100.0 * count(*) FILTER (WHERE ret_d7)  / NULLIF(count(*) FILTER (WHERE now() >= signed_up_at + interval '7 day'),  0), 0) AS ret_d7_pct,
  round(100.0 * count(*) FILTER (WHERE ret_d30) / NULLIF(count(*) FILTER (WHERE now() >= signed_up_at + interval '30 day'), 0), 0) AS ret_d30_pct
FROM acts
GROUP BY cohort_week
ORDER BY cohort_week DESC;


-- ═══════════════════════════════════════════════════════════════════════
-- BLOC C — ★ POINT DE DÉCROCHAGE ★ (réponse directe à la question)
-- Où meurt chaque utilisateur : quelle est sa DERNIÈRE action, et quand ?
-- ═══════════════════════════════════════════════════════════════════════
WITH per_user AS (
  SELECT
    p.id AS user_id,
    p.created_at AS signed_up_at,
    (SELECT count(*)      FROM entries e WHERE e.user_id = p.id) AS entries_count,
    (SELECT max(e.created_at) FROM entries e WHERE e.user_id = p.id) AS last_entry_at,
    (SELECT count(*)      FROM stories s WHERE s.user_id = p.id) AS stories_count
  FROM profiles p
),
classified AS (
  SELECT
    CASE
      WHEN entries_count = 0                                            THEN '0 — Jamais activé (0 entrée)'
      WHEN entries_count = 1                                            THEN '1 — 1 entrée puis stop'
      WHEN last_entry_at < signed_up_at + interval '7 day'             THEN '2 — Décroche dans la 1re semaine'
      WHEN last_entry_at < signed_up_at + interval '30 day'            THEN '3 — Actif 7-30j puis stop'
      ELSE                                                                  '4 — Actif au-delà de 30j (rétention réelle)'
    END AS decrochage_bucket,
    stories_count > 0 AS a_genere_histoire
  FROM per_user
)
SELECT
  decrochage_bucket,
  count(*)                                                    AS users,
  round(100.0 * count(*) / SUM(count(*)) OVER (), 1)          AS pct,
  count(*) FILTER (WHERE a_genere_histoire)                   AS dont_ont_gen_histoire
FROM classified
GROUP BY decrochage_bucket
ORDER BY decrochage_bucket;


-- ═══════════════════════════════════════════════════════════════════════
-- BLOC D — Activation & habitude segmentées Free vs Payant
-- Teste l'hypothèse "vitamine" : le payant retient-il mieux que le free ?
-- ═══════════════════════════════════════════════════════════════════════
WITH per_user AS (
  SELECT p.id AS user_id,
         CASE WHEN p.plan IN ('digital','print','book_only') THEN 'payant' ELSE 'free' END AS tier,
         (SELECT count(*) FROM entries e WHERE e.user_id = p.id) AS entries_count,
         (SELECT count(*) FROM stories s WHERE s.user_id = p.id) AS stories_count
  FROM profiles p
)
SELECT
  tier,
  count(*)                                                           AS users,
  round(100.0 * count(*) FILTER (WHERE entries_count >= 1) / NULLIF(count(*),0), 0) AS pct_active,
  round(100.0 * count(*) FILTER (WHERE entries_count >= 2) / NULLIF(count(*),0), 0) AS pct_habitude,
  round(100.0 * count(*) FILTER (WHERE stories_count >= 1) / NULLIF(count(*),0), 0) AS pct_wow_ia,
  round(avg(entries_count), 1)                                       AS entries_moy
FROM per_user
GROUP BY tier
ORDER BY tier;


-- ═══════════════════════════════════════════════════════════════════════
-- BLOC E — Time-to-wow : délai inscription → 1re histoire IA (heures)
-- YC : plus ce délai est court, meilleure est la rétention. On veut la médiane.
-- ═══════════════════════════════════════════════════════════════════════
WITH first_story AS (
  SELECT s.user_id, min(s.created_at) AS first_story_at
  FROM stories s GROUP BY s.user_id
)
SELECT
  count(*)                                                                     AS users_ayant_gen,
  round(percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (fs.first_story_at - p.created_at)) / 3600.0
  )::numeric, 1)                                                               AS median_heures_jusqu_wow,
  round(percentile_cont(0.9) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (fs.first_story_at - p.created_at)) / 3600.0
  )::numeric, 1)                                                               AS p90_heures_jusqu_wow
FROM first_story fs
JOIN profiles p ON p.id = fs.user_id;

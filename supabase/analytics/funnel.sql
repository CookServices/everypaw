-- ─────────────────────────────────────────────────────────────────────────
-- Everypaw — Les six nombres du tunnel (spec P0-2, docs/print/specs.md)
--            et les deux nombres des pages (spec PP-0, docs/acquisition/specs.md)
-- ─────────────────────────────────────────────────────────────────────────
--
-- OBJET : suivre chaque semaine la conversion vers le plan Print, marche par
--         marche, sur une cohorte d'inscription. Read-only, aucun DDL.
--
-- USAGE : éditeur SQL Supabase. Changer les deux dates du bloc `params`
--         ci-dessous, puis Run. Une ligne, huit entiers.
--
-- LECTURE : la cohorte est fixée par la date d'INSCRIPTION. Les marches
--           suivantes se mesurent « à ce jour », sans limite de temps : un
--           inscrit du 3 août qui crée son animal le 20 août compte dans
--           `with_pet` de la fenêtre d'août. C'est ce qui rend les six nombres
--           comparables entre eux — même dénominateur, celui de `signups`.
--           Conséquence à connaître : une fenêtre récente n'a pas fini de
--           mûrir, ses marches basses monteront encore les semaines suivantes.
--
-- Les définitions font foi dans CLAUDE.md, section « Les six nombres du
-- tunnel ». Un nombre dont la définition bouge d'une semaine à l'autre ne vaut
-- rien : changer une définition ici veut dire la changer là-bas aussi.
-- ─────────────────────────────────────────────────────────────────────────

WITH params AS (
  SELECT
    -- Début inclus, fin exclue. Ici : le mois d'août 2026.
    timestamptz '2026-08-01 00:00:00+00' AS window_start,
    timestamptz '2026-09-01 00:00:00+00' AS window_end
),

-- La cohorte : les comptes créés dans la fenêtre. Les comptes de test sont
-- exclus, ils fausseraient un tunnel qui se compte encore en dizaines.
cohort AS (
  SELECT p.id AS user_id, p.plan
  FROM profiles p, params
  WHERE p.created_at >= params.window_start
    AND p.created_at <  params.window_end
    AND coalesce(p.email, '') NOT LIKE '%@yopmail.com'
),

per_user AS (
  SELECT
    c.user_id,
    c.plan,
    (SELECT count(*) FROM pets         pe WHERE pe.user_id = c.user_id) AS pets_count,
    (SELECT count(*) FROM entries      e  WHERE e.user_id  = c.user_id) AS entries_count,
    (SELECT count(*) FROM stories      s  WHERE s.user_id  = c.user_id) AS stories_count,
    -- Événement posé par P1-1 à l'ouverture de l'aperçu, une ligne par
    -- (utilisateur, animal) grâce à l'unicité d'events_log. Il n'existe que
    -- depuis le 2026-09-03 : une fenêtre antérieure rend 0, ce n'est pas un
    -- bug de la requête.
    (SELECT count(*) FROM events_log ev
       WHERE ev.user_id = c.user_id
         AND ev.event_type = 'book_preview_opened')                     AS preview_opened_count
  FROM cohort c
),

-- Les pages créées sans compte (PP-0). Même logique de cohorte, mais la
-- cohorte est celle des PAGES créées dans la fenêtre, pas des inscrits :
-- leur créateur n'a pas encore de compte. `pages_claimed` se mesure « à ce
-- jour » sur ces mêmes pages. Une page réclamée par un compte de test est
-- exclue ; une page non réclamée ne peut pas l'être (créateur anonyme).
-- La table n'existe que depuis le 2026-09-16 : une fenêtre antérieure rend 0.
pages AS (
  SELECT pg.id, pg.claimed_at
  FROM public_pages pg, params
  WHERE pg.created_at >= params.window_start
    AND pg.created_at <  params.window_end
    AND NOT EXISTS (
      SELECT 1 FROM profiles tp
      WHERE tp.id = pg.claimed_by
        AND coalesce(tp.email, '') LIKE '%@yopmail.com'
    )
)

SELECT
  (SELECT window_start FROM params)                              AS window_start,
  (SELECT window_end   FROM params)                              AS window_end,
  count(*)                                                       AS signups,
  count(*) FILTER (WHERE pets_count          >= 1)               AS with_pet,
  count(*) FILTER (WHERE entries_count       >= 3)               AS with_3_entries,
  count(*) FILTER (WHERE stories_count       >= 1)               AS with_story,
  count(*) FILTER (WHERE preview_opened_count >= 1)               AS with_book_preview,
  count(*) FILTER (WHERE plan = 'print')                         AS print_subscribers,
  (SELECT count(*) FROM pages)                                   AS pages_created,
  (SELECT count(*) FROM pages WHERE claimed_at IS NOT NULL)      AS pages_claimed
FROM per_user;

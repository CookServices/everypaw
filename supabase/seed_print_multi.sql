-- ============================================================
-- Everypaw — Seed test-print-multi@yopmail.com
-- Objectif : tester visualisation + impression livre
-- User ID  : fb5c5d99-50db-49ee-b1ae-60fa67224877
-- Pets     : Coco (eeee0002), Zigzag (eeee0001), Nemo (eeee0003)
-- Usage    : coller dans Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  uid uuid := 'fb5c5d99-50db-49ee-b1ae-60fa67224877';
  pet_coco   uuid := 'eeee0002-0005-0005-0005-000000000002';
  pet_zigzag uuid := 'eeee0001-0005-0005-0005-000000000001';
BEGIN

-- ─────────────────────────────────────────────────────────────
-- 1. Profil : plan print, 3 crédits, onboarding OK
-- ─────────────────────────────────────────────────────────────
UPDATE profiles SET
  plan = 'print', book_credits = 3, is_premium = true, onboarding_completed = true
WHERE id = uid;


-- ─────────────────────────────────────────────────────────────
-- 1b. Pets (upsert — recréés si purge_test_data a été lancé)
-- ─────────────────────────────────────────────────────────────
INSERT INTO pets (id, user_id, name, species, breed, birthdate, bio)
VALUES
  ('eeee0001-0005-0005-0005-000000000001', uid, 'Zigzag', 'bird',  'Perruche', '2022-08-03', 'Parle sans arrêt.'),
  ('eeee0002-0005-0005-0005-000000000002', uid, 'Coco',   'dog',   'Caniche',  '2019-12-25', 'Élégant et câlin.'),
  ('eeee0003-0005-0005-0005-000000000003', uid, 'Nemo',   'other', 'Hamster',  '2024-02-14', 'Minuscule mais charismatique.')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 2. Entrées Coco — 60 moments sur 3 ans
-- ─────────────────────────────────────────────────────────────
ALTER TABLE entries DISABLE TRIGGER trg_enforce_free_entry_limit;

DELETE FROM entries WHERE user_id = uid AND pet_id = pet_coco;

INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT
  gen_random_uuid(), pet_coco, uid,
  (ARRAY[
    'Coco a été tondu aujourd''hui. Il se prend pour un lion.',
    'Promenade sous la pluie. Coco a refusé de se mouiller les pattes.',
    'Coco a dormi sur le canapé toute la journée. Jaloux de mon chat imaginaire.',
    'Bain de Coco. Toute la salle de bain était trempée en 30 secondes.',
    'Coco a appris à s''asseoir en 10 minutes. Génie ou coïncidence ?',
    'Visite chez le vétérinaire. Bilan parfait. Coco très fier.',
    'Coco a volé une chaussette et l''a cachée sous le canapé.',
    'Balade en forêt. Coco a couru après chaque feuille morte.',
    'Premier anniversaire de Coco avec nous. Gâteau aux carottes.',
    'Coco a découvert le miroir. Il aboie depuis 20 minutes.'
  ])[((gs - 1) % 10) + 1],
  (ARRAY['happy','tender','funny','proud','sad'])[((gs - 1) % 5) + 1],
  (CURRENT_DATE - (gs * 18)::int)::date
FROM generate_series(1, 60) gs
ON CONFLICT DO NOTHING;

-- Entrées Zigzag — 20 moments
DELETE FROM entries WHERE user_id = uid AND pet_id = pet_zigzag;

INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT
  gen_random_uuid(), pet_zigzag, uid,
  'Zigzag a répété "pizza" ' || gs || ' fois aujourd''hui.', 'funny',
  (CURRENT_DATE - (gs * 12)::int)::date
FROM generate_series(1, 20) gs
ON CONFLICT DO NOTHING;

ALTER TABLE entries ENABLE TRIGGER trg_enforce_free_entry_limit;


-- ─────────────────────────────────────────────────────────────
-- 3. Stories Coco — 3 cas de page count couvrant min/mid/max
-- ─────────────────────────────────────────────────────────────
DELETE FROM stories WHERE user_id = uid;

-- Cas A : 24 stories → 28 pages (minimum Gelato)
INSERT INTO stories (id, pet_id, user_id, title, content, period_start, period_end, style, status, created_at)
SELECT
  gen_random_uuid(), pet_coco, uid,
  'Chapitre ' || gs || ' — La vie de Coco',
  'Coco traversa cette période avec son élégance habituelle. ' ||
  'Les jours se succédaient, rythmés par les promenades matinales et les siestes prolongées. ' ||
  'Jamais un caniche ne fut aussi digne. Chapitre ' || gs || ' de sa grande épopée.',
  (CURRENT_DATE - (gs * 14 + 14)::int)::date,
  (CURRENT_DATE - (gs * 14)::int)::date,
  (ARRAY['tender','happy','funny','proud'])[((gs - 1) % 4) + 1],
  'ready',
  now() - (gs * interval '5 days')
FROM generate_series(1, 24) gs
ON CONFLICT DO NOTHING;

-- Cas B : Stories supplémentaires pour Zigzag (8 stories → ~12 pages, en dessous du min)
-- Permet de tester le cas où le livre est trop court
INSERT INTO stories (id, pet_id, user_id, title, content, period_start, period_end, style, status, created_at)
SELECT
  gen_random_uuid(), pet_zigzag, uid,
  'Épisode ' || gs || ' — Zigzag le bavard',
  'Zigzag avait encore des choses à dire. Beaucoup de choses. ' ||
  'Sa maîtrise du vocabulaire progressait chaque semaine. ' ||
  'Épisode ' || gs || ' de sa vie trépidante.',
  (CURRENT_DATE - (gs * 20 + 20)::int)::date,
  (CURRENT_DATE - (gs * 20)::int)::date,
  'funny', 'ready',
  now() - (gs * interval '7 days')
FROM generate_series(1, 8) gs
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 4. Book configs — 3 états pour couvrir le flow complet
-- ─────────────────────────────────────────────────────────────
DELETE FROM book_configs WHERE user_id = uid;

-- Config A : brouillon en cours (étape personnalisation)
INSERT INTO book_configs (
  id, user_id, pet_id, name, status, theme,
  custom_title, year_filter, selected_story_ids,
  cover_photo_url, story_layouts, dedication_text, page_count
)
SELECT
  'eeee0cf1-0005-0005-0005-000000000001', uid, pet_coco,
  'Livre 2025 — Coco', 'draft', 'classic',
  'La vie de Coco', NULL,
  jsonb_agg(id ORDER BY created_at DESC),
  NULL, '{}',
  'À toi, Coco, mon meilleur compagnon.',
  28
FROM (SELECT id, created_at FROM stories WHERE pet_id = pet_coco AND status = 'ready' LIMIT 24) s;

-- Config B : aperçu prêt (step preview — voir le PDF)
INSERT INTO book_configs (
  id, user_id, pet_id, name, status, theme,
  custom_title, year_filter, selected_story_ids,
  cover_photo_url, story_layouts, dedication_text, page_count
)
SELECT
  'eeee0cf2-0005-0005-0005-000000000002', uid, pet_coco,
  'Livre 2024 — Coco', 'draft', 'forest',
  'Coco — L''année 2024', NULL,
  jsonb_agg(id ORDER BY created_at ASC),
  NULL,
  jsonb_object_agg(id::text, 'photo_hero'),
  'Pour toutes les aventures partagées.',
  20
FROM (SELECT id, created_at FROM stories WHERE pet_id = pet_coco AND status = 'ready' LIMIT 16) s;

-- Config C : commandé (post-Gelato, pour tester la page "Mes livres")
INSERT INTO book_configs (
  id, user_id, pet_id, name, status, theme,
  custom_title, year_filter, selected_story_ids,
  cover_photo_url, story_layouts, dedication_text,
  gelato_order_id, ordered_at, page_count
)
SELECT
  'eeee0cf3-0005-0005-0005-000000000003', uid, pet_coco,
  'Livre 2023 — Coco', 'ordered', 'ocean',
  'Coco — Les débuts', NULL,
  jsonb_agg(id ORDER BY created_at ASC),
  NULL, '{}',
  'Il était une fois un caniche extraordinaire.',
  'gelato-test-multi-coco-2023',
  now() - interval '45 days',
  32
FROM (SELECT id, created_at FROM stories WHERE pet_id = pet_coco AND status = 'ready' LIMIT 12) s;

END $$;


-- ─────────────────────────────────────────────────────────────
-- Récapitulatif
-- ─────────────────────────────────────────────────────────────
SELECT
  p.email, p.plan, p.book_credits,
  COUNT(DISTINCT pets.id)  AS nb_animaux,
  COUNT(DISTINCT e.id)     AS nb_entrees,
  COUNT(DISTINCT s.id)     AS nb_stories,
  COUNT(DISTINCT bc.id)    AS nb_book_configs,
  STRING_AGG(DISTINCT bc.status, ', ') AS config_statuses
FROM profiles p
LEFT JOIN pets         ON pets.user_id  = p.id
LEFT JOIN entries e    ON e.user_id     = p.id
LEFT JOIN stories s    ON s.user_id     = p.id
LEFT JOIN book_configs bc ON bc.user_id = p.id
WHERE p.email = 'test-print-multi@yopmail.com'
GROUP BY p.email, p.plan, p.book_credits;

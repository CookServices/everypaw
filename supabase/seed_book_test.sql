-- ============================================================
-- Everypaw — Seed données de test pour le flow commande livre
-- USAGE : coller dans Supabase SQL Editor
-- Users créés via API Admin (vrais UUIDs GoTrue)
-- ============================================================

-- IDs de référence :
-- A free    : dcb3335b-e41b-40c0-b0fb-4576814d50b2
-- B digital : 082dbc56-638c-46b1-b5f3-a3f31b1f9149
-- C print   : 761da177-6de2-49b4-9794-8db9726a1e01
-- D ordered : e2b34f6b-1c48-40b9-a788-5ac188999de7
-- E multi   : fb5c5d99-50db-49ee-b1ae-60fa67224877


-- ─────────────────────────────────────────────────────────────
-- 1. PROFILS (upsert — le trigger a déjà créé les lignes)
-- ─────────────────────────────────────────────────────────────
INSERT INTO profiles (id, email, full_name, plan, book_credits, is_premium, onboarding_completed)
VALUES
  ('dcb3335b-e41b-40c0-b0fb-4576814d50b2', 'test-free@yopmail.com',          'Alice Free',         'free',    0, false, true),
  ('082dbc56-638c-46b1-b5f3-a3f31b1f9149', 'test-digital@yopmail.com',       'Bob Digital',        'digital', 0, true,  true),
  ('761da177-6de2-49b4-9794-8db9726a1e01', 'test-print-fresh@yopmail.com',   'Claire Print Fresh', 'print',   1, true,  true),
  ('e2b34f6b-1c48-40b9-a788-5ac188999de7', 'test-print-ordered@yopmail.com', 'David Print Ordered','print',   0, true,  true),
  ('fb5c5d99-50db-49ee-b1ae-60fa67224877', 'test-print-multi@yopmail.com',   'Eve Multi Credit',   'print',   3, true,  true)
ON CONFLICT (id) DO UPDATE SET
  plan         = EXCLUDED.plan,
  book_credits = EXCLUDED.book_credits,
  is_premium   = EXCLUDED.is_premium,
  onboarding_completed = EXCLUDED.onboarding_completed;


-- ─────────────────────────────────────────────────────────────
-- 2. ANIMAUX
-- ─────────────────────────────────────────────────────────────
INSERT INTO pets (id, user_id, name, species, breed, birthdate, bio)
VALUES
  ('aaaa0001-0001-0001-0001-000000000001', 'dcb3335b-e41b-40c0-b0fb-4576814d50b2', 'Pixel',   'cat',    'Européen',         '2022-03-15', 'Chat curieux et joueur.'),
  ('aaaa0002-0001-0001-0001-000000000002', 'dcb3335b-e41b-40c0-b0fb-4576814d50b2', 'Noisette','dog',    'Beagle',           '2020-07-04', 'Chien gourmand et câlin.'),
  ('bbbb0001-0002-0002-0002-000000000001', '082dbc56-638c-46b1-b5f3-a3f31b1f9149', 'Luna',    'cat',    'Siamois',          '2021-11-20', 'Princesse du foyer.'),
  ('bbbb0002-0002-0002-0002-000000000002', '082dbc56-638c-46b1-b5f3-a3f31b1f9149', 'Rocky',   'dog',    'Labrador',         '2019-05-10', 'Adore nager.'),
  ('cccc0001-0003-0003-0003-000000000001', '761da177-6de2-49b4-9794-8db9726a1e01', 'Mochi',   'rabbit', 'Bélier nain',      '2023-01-08', 'Petit et espiègle.'),
  ('cccc0002-0003-0003-0003-000000000002', '761da177-6de2-49b4-9794-8db9726a1e01', 'Grizou',  'dog',    'Berger australien','2020-06-15', 'Énergique et intelligent.'),
  ('cccc0003-0003-0003-0003-000000000003', '761da177-6de2-49b4-9794-8db9726a1e01', 'Sushi',   'cat',    'Maine Coon',       '2018-09-01', 'Majestueux et bavard.'),
  ('dddd0001-0004-0004-0004-000000000001', 'e2b34f6b-1c48-40b9-a788-5ac188999de7', 'Caramel', 'dog',    'Golden Retriever', '2017-04-22', 'Meilleur ami du monde.'),
  ('eeee0001-0005-0005-0005-000000000001', 'fb5c5d99-50db-49ee-b1ae-60fa67224877', 'Zigzag',  'bird',   'Perruche',         '2022-08-03', 'Parle sans arrêt.'),
  ('eeee0002-0005-0005-0005-000000000002', 'fb5c5d99-50db-49ee-b1ae-60fa67224877', 'Coco',    'dog',    'Caniche',          '2019-12-25', 'Élégant et câlin.'),
  ('eeee0003-0005-0005-0005-000000000003', 'fb5c5d99-50db-49ee-b1ae-60fa67224877', 'Nemo',    'other',  'Hamster',          '2024-02-14', 'Minuscule mais charismatique.')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3. ENTRÉES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE entries DISABLE TRIGGER trg_enforce_free_entry_limit;

-- A1 Pixel : 2 entrées → 28 pages (min)
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'aaaa0001-0001-0001-0001-000000000001', 'dcb3335b-e41b-40c0-b0fb-4576814d50b2',
  'Pixel a dormi sur le radiateur. Rêve n°' || gs || '.', 'happy',
  (CURRENT_DATE - (gs * 7)::int)::date
FROM generate_series(1, 2) gs ON CONFLICT DO NOTHING;

-- A2 Noisette : 10 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'aaaa0002-0001-0001-0001-000000000002', 'dcb3335b-e41b-40c0-b0fb-4576814d50b2',
  'Noisette a encore volé une chaussette. Épisode ' || gs || '.',
  (ARRAY['happy','funny','tender','proud'])[((gs-1)%4)+1]::text,
  (CURRENT_DATE - (gs * 5)::int)::date
FROM generate_series(1, 10) gs ON CONFLICT DO NOTHING;

-- B1 Luna : 5 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'bbbb0001-0002-0002-0002-000000000001', '082dbc56-638c-46b1-b5f3-a3f31b1f9149',
  'Luna a daigné me regarder. Moment n°' || gs || '.', 'tender',
  (CURRENT_DATE - (gs * 10)::int)::date
FROM generate_series(1, 5) gs ON CONFLICT DO NOTHING;

-- B2 Rocky : 15 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'bbbb0002-0002-0002-0002-000000000002', '082dbc56-638c-46b1-b5f3-a3f31b1f9149',
  'Rocky a sauté dans la piscine pour la ' || gs || 'ème fois.', 'funny',
  (CURRENT_DATE - (gs * 6)::int)::date
FROM generate_series(1, 15) gs ON CONFLICT DO NOTHING;

-- C1 Mochi : 3 entrées → 28 pages (min)
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'cccc0001-0003-0003-0003-000000000001', '761da177-6de2-49b4-9794-8db9726a1e01',
  'Mochi a découvert le parquet. Jour ' || gs || '.', 'happy',
  (CURRENT_DATE - (gs * 14)::int)::date
FROM generate_series(1, 3) gs ON CONFLICT DO NOTHING;

-- C2 Grizou : 40 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'cccc0002-0003-0003-0003-000000000002', '761da177-6de2-49b4-9794-8db9726a1e01',
  'Grizou a couru après le frisbee pendant ' || gs || ' minutes.',
  (ARRAY['happy','proud','funny','tender'])[((gs-1)%4)+1]::text,
  (CURRENT_DATE - (gs * 3)::int)::date
FROM generate_series(1, 40) gs ON CONFLICT DO NOTHING;

-- C3 Sushi : 90 entrées → 92 pages (max)
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'cccc0003-0003-0003-0003-000000000003', '761da177-6de2-49b4-9794-8db9726a1e01',
  'Sushi a réclamé des croquettes pour la ' || gs || 'ème fois aujourd''hui.',
  (ARRAY['happy','funny','tender','sad','proud'])[((gs-1)%5)+1]::text,
  (CURRENT_DATE - (gs * 2)::int)::date
FROM generate_series(1, 90) gs ON CONFLICT DO NOTHING;

-- D1 Caramel : 60 entrées sur 8 ans
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'dddd0001-0004-0004-0004-000000000001', 'e2b34f6b-1c48-40b9-a788-5ac188999de7',
  'Caramel a accompagné la famille. Souvenir n°' || gs || '.',
  (ARRAY['happy','tender','proud','funny'])[((gs-1)%4)+1]::text,
  (CURRENT_DATE - (gs * 45)::int)::date
FROM generate_series(1, 60) gs ON CONFLICT DO NOTHING;

-- E1 Zigzag : 5 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'eeee0001-0005-0005-0005-000000000001', 'fb5c5d99-50db-49ee-b1ae-60fa67224877',
  'Zigzag a appris un nouveau mot : "' || gs || '".', 'funny',
  (CURRENT_DATE - (gs * 9)::int)::date
FROM generate_series(1, 5) gs ON CONFLICT DO NOTHING;

-- E2 Coco : 25 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'eeee0002-0005-0005-0005-000000000002', 'fb5c5d99-50db-49ee-b1ae-60fa67224877',
  'Coco a été coiffé pour la ' || gs || 'ème fois.', 'happy',
  (CURRENT_DATE - (gs * 4)::int)::date
FROM generate_series(1, 25) gs ON CONFLICT DO NOTHING;

-- E3 Nemo : 8 entrées
INSERT INTO entries (id, pet_id, user_id, content, mood, entry_date)
SELECT gen_random_uuid(), 'eeee0003-0005-0005-0005-000000000003', 'fb5c5d99-50db-49ee-b1ae-60fa67224877',
  'Nemo a rempli sa joue de graines x' || gs || '.', 'funny',
  (CURRENT_DATE - (gs * 12)::int)::date
FROM generate_series(1, 8) gs ON CONFLICT DO NOTHING;

ALTER TABLE entries ENABLE TRIGGER trg_enforce_free_entry_limit;


-- ─────────────────────────────────────────────────────────────
-- 4. STORIES
-- ─────────────────────────────────────────────────────────────

-- C2 Grizou : 36 stories → 36 pages
INSERT INTO stories (id, pet_id, user_id, title, content, period_start, period_end, style, status)
SELECT gen_random_uuid(), 'cccc0002-0003-0003-0003-000000000002', '761da177-6de2-49b4-9794-8db9726a1e01',
  'Chapitre ' || gs || ' — Les aventures de Grizou',
  'Il était une fois Grizou. Mois n°' || gs || ' de sa vie.',
  (CURRENT_DATE - (gs * 30)::int)::date,
  (CURRENT_DATE - ((gs-1) * 30 + 1)::int)::date,
  'tender', 'ready'
FROM generate_series(1, 36) gs ON CONFLICT DO NOTHING;

-- C3 Sushi : 89 stories → 92 pages
INSERT INTO stories (id, pet_id, user_id, title, content, period_start, period_end, style, status)
SELECT gen_random_uuid(), 'cccc0003-0003-0003-0003-000000000003', '761da177-6de2-49b4-9794-8db9726a1e01',
  'Chapitre ' || gs || ' — La vie de Sushi',
  'Sushi régnait sur son territoire depuis ' || gs || ' mois.',
  (CURRENT_DATE - (gs * 30)::int)::date,
  (CURRENT_DATE - ((gs-1) * 30 + 1)::int)::date,
  'funny', 'ready'
FROM generate_series(1, 89) gs ON CONFLICT DO NOTHING;

-- D1 Caramel : 52 stories → status ordered
INSERT INTO stories (id, pet_id, user_id, title, content, period_start, period_end, style, status)
SELECT gen_random_uuid(), 'dddd0001-0004-0004-0004-000000000001', 'e2b34f6b-1c48-40b9-a788-5ac188999de7',
  'Chapitre ' || gs || ' — Les souvenirs de Caramel',
  'Caramel traversa les saisons avec grâce. Chapitre ' || gs || '.',
  (CURRENT_DATE - (gs * 45)::int)::date,
  (CURRENT_DATE - ((gs-1) * 45 + 1)::int)::date,
  'tender', 'ordered'
FROM generate_series(1, 52) gs ON CONFLICT DO NOTHING;

-- E2 Coco : 24 stories → 28 pages (min)
INSERT INTO stories (id, pet_id, user_id, title, content, period_start, period_end, style, status)
SELECT gen_random_uuid(), 'eeee0002-0005-0005-0005-000000000002', 'fb5c5d99-50db-49ee-b1ae-60fa67224877',
  'Chapitre ' || gs || ' — Coco le magnifique',
  'Coco portait son pelage avec élégance. Séquence n°' || gs || '.',
  (CURRENT_DATE - (gs * 15)::int)::date,
  (CURRENT_DATE - ((gs-1) * 15 + 1)::int)::date,
  'happy', 'ready'
FROM generate_series(1, 24) gs ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 5. BOOK_CONFIG commandé (cas D)
-- ─────────────────────────────────────────────────────────────
INSERT INTO book_configs (
  id, user_id, pet_id, name, status, theme,
  custom_title, year_filter, selected_story_ids,
  cover_photo_url, story_layouts, dedication_text,
  gelato_order_id, ordered_at, page_count
)
VALUES (
  'dddd0cf0-0004-0004-0004-000000000001',
  'e2b34f6b-1c48-40b9-a788-5ac188999de7',
  'dddd0001-0004-0004-0004-000000000001',
  'Livre 2025 — Caramel', 'ordered', 'forest',
  'La vie de Caramel', NULL, '[]', NULL, '{}',
  'À ma fidèle compagne de toujours.',
  'gelato-test-order-caramel-seed',
  now() - interval '30 days', 52
)
ON CONFLICT (id) DO UPDATE SET status = 'ordered';


-- ─────────────────────────────────────────────────────────────
-- 6. RÉCAPITULATIF
-- ─────────────────────────────────────────────────────────────
SELECT
  p.email, p.plan, p.book_credits,
  COUNT(DISTINCT pets.id) AS nb_animaux,
  COUNT(DISTINCT e.id)    AS nb_entrees,
  COUNT(DISTINCT s.id)    AS nb_stories,
  COUNT(DISTINCT bc.id)   AS nb_book_configs
FROM profiles p
LEFT JOIN pets         ON pets.user_id  = p.id
LEFT JOIN entries e    ON e.user_id     = p.id
LEFT JOIN stories s    ON s.user_id     = p.id
LEFT JOIN book_configs bc ON bc.user_id = p.id
WHERE p.email LIKE '%@yopmail.com'
GROUP BY p.email, p.plan, p.book_credits
ORDER BY p.email;

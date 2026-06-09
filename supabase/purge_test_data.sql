-- ============================================================
-- Everypaw — Purge données de test yopmail
-- ⚠️  NE PAS exécuter en production sur de vrais utilisateurs
-- Usage : coller dans Supabase SQL Editor
-- Après purge, relancer seed_book_test.sql
-- ============================================================

-- UUIDs des comptes de test
DO $$
DECLARE
  test_users uuid[] := ARRAY[
    'dcb3335b-e41b-40c0-b0fb-4576814d50b2'::uuid,  -- test-free
    '082dbc56-638c-46b1-b5f3-a3f31b1f9149'::uuid,  -- test-digital
    '761da177-6de2-49b4-9794-8db9726a1e01'::uuid,  -- test-print-fresh
    'e2b34f6b-1c48-40b9-a788-5ac188999de7'::uuid,  -- test-print-ordered
    'fb5c5d99-50db-49ee-b1ae-60fa67224877'::uuid   -- test-print-multi
  ];
BEGIN
  -- Suppression en cascade dans l'ordre (FK)
  DELETE FROM book_configs  WHERE user_id = ANY(test_users);
  DELETE FROM daily_prompts WHERE user_id = ANY(test_users);
  DELETE FROM events_log    WHERE user_id = ANY(test_users);
  DELETE FROM milestones    WHERE user_id = ANY(test_users);
  DELETE FROM stories       WHERE user_id = ANY(test_users);

  -- entries : trigger free_entry_limit désactivé le temps de la purge
  ALTER TABLE entries DISABLE TRIGGER trg_enforce_free_entry_limit;
  DELETE FROM entries WHERE user_id = ANY(test_users);
  ALTER TABLE entries ENABLE TRIGGER trg_enforce_free_entry_limit;

  DELETE FROM pets     WHERE user_id = ANY(test_users);

  -- Reset profils (ne supprime pas le compte auth)
  UPDATE profiles SET
    plan                  = 'free',
    book_credits          = 0,
    is_premium            = false,
    stripe_customer_id    = NULL,
    stripe_subscription_id = NULL,
    onboarding_completed  = false
  WHERE id = ANY(test_users);

  RAISE NOTICE 'Purge OK — relancer seed_book_test.sql pour recréer les données';
END $$;

-- Vérification
SELECT p.email, p.plan, p.book_credits,
  COUNT(DISTINCT pets.id) AS pets,
  COUNT(DISTINCT e.id)    AS entries,
  COUNT(DISTINCT s.id)    AS stories,
  COUNT(DISTINCT bc.id)   AS book_configs
FROM profiles p
LEFT JOIN pets         ON pets.user_id = p.id
LEFT JOIN entries e    ON e.user_id    = p.id
LEFT JOIN stories s    ON s.user_id    = p.id
LEFT JOIN book_configs bc ON bc.user_id = p.id
WHERE p.email LIKE '%@yopmail.com'
GROUP BY p.email, p.plan, p.book_credits
ORDER BY p.email;

-- ============================================================
-- Everypaw — Drop legacy ALL-command policies on pets, entries, stories
-- These broad policies were superseded by granular per-command policies
-- added in round2_security_fixes and add_pet_members_2026_06_11.
-- Safe to re-run (DROP IF EXISTS).
-- ============================================================

-- ─── pets ────────────────────────────────────────────────────
-- Replaced by: pets_owner_or_member_select, pets_owner_insert,
--              pets_owner_update, pets_owner_delete
DROP POLICY IF EXISTS "Users can view own pets" ON pets;
DROP POLICY IF EXISTS "Users manage own pets"   ON pets;

-- ─── entries ─────────────────────────────────────────────────
-- Replaced by: entries_owner_or_member_read, entries_owner_or_member_insert,
--              entries_owner_or_pet_owner_update, entries_owner_or_pet_owner_delete
DROP POLICY IF EXISTS "Users can view own entries" ON entries;
DROP POLICY IF EXISTS "Users manage own entries"   ON entries;

-- ─── stories ─────────────────────────────────────────────────
-- Replaced by: stories_owner_or_member_select, stories_owner_insert,
--              stories_owner_update, stories_owner_delete
DROP POLICY IF EXISTS "Users can view own stories" ON stories;
DROP POLICY IF EXISTS "Users manage own stories"   ON stories;

-- ─── Verify — should show NO rows named "Users can/manage…" ──
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pets', 'entries', 'stories', 'pet_members')
ORDER BY tablename, cmd;

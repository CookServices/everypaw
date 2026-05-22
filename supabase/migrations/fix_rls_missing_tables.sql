-- ============================================================
-- Everypaw — Fix RLS policies on tables missing coverage
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS).
-- Apply in Supabase SQL Editor.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. daily_prompts
--    Written by cron (service role, bypasses RLS).
--    Clients read/insert their own prompts only.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_prompts_owner_select" ON daily_prompts;
CREATE POLICY "daily_prompts_owner_select" ON daily_prompts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_prompts_owner_insert" ON daily_prompts;
CREATE POLICY "daily_prompts_owner_insert" ON daily_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE from client — cron uses service role.


-- ─────────────────────────────────────────────────────────────
-- 2. events_log
--    Written exclusively by server-side code (service role).
--    Clients can only read their own events.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_log_owner_select" ON events_log;
CREATE POLICY "events_log_owner_select" ON events_log
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE from client — service role only.


-- ─────────────────────────────────────────────────────────────
-- 3. milestones
--    Dashboard-only (not shown on public pet pages).
--    Detected server-side in /api/generate — inserted via service role.
--    Clients read and delete their own milestones.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestones_owner_select" ON milestones;
CREATE POLICY "milestones_owner_select" ON milestones
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "milestones_owner_delete" ON milestones;
CREATE POLICY "milestones_owner_delete" ON milestones
  FOR DELETE USING (auth.uid() = user_id);

-- No INSERT / UPDATE from client — detection runs server-side via service role.


-- ─────────────────────────────────────────────────────────────
-- 4. milestone_definitions
--    Read-only config table. Everyone can SELECT (anon + authenticated).
--    Only admins write (via service role — no client write policy).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE milestone_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestone_definitions_public_read" ON milestone_definitions;
CREATE POLICY "milestone_definitions_public_read" ON milestone_definitions
  FOR SELECT USING (true);

-- No INSERT / UPDATE / DELETE from client.


-- ─────────────────────────────────────────────────────────────
-- 5. Storage — pet-photos bucket
--    Run this only if the bucket doesn't already have policies.
--    Adjust bucket name if different in your Supabase project.
-- ─────────────────────────────────────────────────────────────

-- Make bucket public (read by anyone, write by owner only):
-- (Skip if already configured in dashboard)

-- Public read — anyone can view photos via their URL (required for /pets/[id] public pages)
DROP POLICY IF EXISTS "pet_photos_public_read" ON storage.objects;
CREATE POLICY "pet_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-photos');

-- Authenticated users can upload to their own folder only
DROP POLICY IF EXISTS "pet_photos_owner_insert" ON storage.objects;
CREATE POLICY "pet_photos_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can update their own files
DROP POLICY IF EXISTS "pet_photos_owner_update" ON storage.objects;
CREATE POLICY "pet_photos_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own files
DROP POLICY IF EXISTS "pet_photos_owner_delete" ON storage.objects;
CREATE POLICY "pet_photos_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─────────────────────────────────────────────────────────────
-- Verification — run after applying to check coverage
-- ─────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'pets', 'entries', 'stories', 'profiles',
    'milestones', 'milestone_definitions',
    'daily_prompts', 'events_log'
  )
ORDER BY tablename;
-- Expected: rowsecurity = true for ALL rows above

SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
-- Expected: at minimum 2 policies per table

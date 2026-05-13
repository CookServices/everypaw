-- ============================================================
-- Everypaw — Row Level Security policies
-- Safe to re-run: uses IF NOT EXISTS where supported.
-- Apply via Supabase SQL Editor or CLI.
-- ============================================================

-- ─── Enable RLS ──────────────────────────────────────────────
ALTER TABLE pets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;

-- ─── pets ────────────────────────────────────────────────────
-- Public pages (memorial, public pet profile) can read any pet
DROP POLICY IF EXISTS "pets_public_read"   ON pets;
CREATE POLICY "pets_public_read"   ON pets FOR SELECT USING (true);

-- Only owner can write
DROP POLICY IF EXISTS "pets_owner_insert"  ON pets;
CREATE POLICY "pets_owner_insert"  ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pets_owner_update"  ON pets;
CREATE POLICY "pets_owner_update"  ON pets FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pets_owner_delete"  ON pets;
CREATE POLICY "pets_owner_delete"  ON pets FOR DELETE USING (auth.uid() = user_id);

-- ─── entries ─────────────────────────────────────────────────
-- Public pet profile page shows entries
DROP POLICY IF EXISTS "entries_public_read"  ON entries;
CREATE POLICY "entries_public_read"  ON entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "entries_owner_insert" ON entries;
CREATE POLICY "entries_owner_insert" ON entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "entries_owner_update" ON entries;
CREATE POLICY "entries_owner_update" ON entries FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "entries_owner_delete" ON entries;
CREATE POLICY "entries_owner_delete" ON entries FOR DELETE USING (auth.uid() = user_id);

-- ─── stories ─────────────────────────────────────────────────
-- Public pet profile page shows stories
DROP POLICY IF EXISTS "stories_public_read"  ON stories;
CREATE POLICY "stories_public_read"  ON stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "stories_owner_insert" ON stories;
CREATE POLICY "stories_owner_insert" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stories_owner_update" ON stories;
CREATE POLICY "stories_owner_update" ON stories FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "stories_owner_delete" ON stories;
CREATE POLICY "stories_owner_delete" ON stories FOR DELETE USING (auth.uid() = user_id);

-- ─── profiles ────────────────────────────────────────────────
-- Users access their own profile only (cron/webhook use service role, bypass RLS)
DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;
CREATE POLICY "profiles_owner_select" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_owner_insert" ON profiles;
CREATE POLICY "profiles_owner_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_owner_update" ON profiles;
CREATE POLICY "profiles_owner_update" ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- Everypaw — Household Members / Shared Journal
-- Safe to re-run (DROP IF EXISTS / IF NOT EXISTS).
-- Apply in Supabase SQL Editor.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. pet_members table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id                UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null until accepted
  invited_email         TEXT NOT NULL,
  invited_by            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('contributor')),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invite_token          TEXT NOT NULL UNIQUE,
  invite_token_expires_at TIMESTAMPTZ NOT NULL,
  accepted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pet_members ENABLE ROW LEVEL SECURITY;

-- Owner of the pet sees all members for their pets
DROP POLICY IF EXISTS "pet_members_owner_select" ON pet_members;
CREATE POLICY "pet_members_owner_select" ON pet_members
  FOR SELECT
  USING (
    pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
  );

-- Accepted member can see their own row (to verify membership)
DROP POLICY IF EXISTS "pet_members_self_select" ON pet_members;
CREATE POLICY "pet_members_self_select" ON pet_members
  FOR SELECT
  USING (auth.uid() = user_id AND status = 'accepted');

-- All writes go through server routes using service role — no client INSERT/UPDATE/DELETE

-- ─────────────────────────────────────────────────────────────
-- 2. pets — replace pets_public_read (USING true) with owner-or-member
--    Public pages (/pets/[id], /memorial/[id]) use service role → unaffected.
--    Dashboard pages use session → now restricted to owner + accepted members.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pets_public_read" ON pets;
DROP POLICY IF EXISTS "pets_owner_or_member_select" ON pets;

CREATE POLICY "pets_owner_or_member_select" ON pets
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR id IN (
      SELECT pm.pet_id FROM pet_members pm
      WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. entries — extend read/insert/delete for contributors
-- ─────────────────────────────────────────────────────────────

-- SELECT: author, pet owner, or accepted member can read entries on a pet
DROP POLICY IF EXISTS "entries_owner_read" ON entries;
DROP POLICY IF EXISTS "entries_owner_or_member_read" ON entries;

CREATE POLICY "entries_owner_or_member_read" ON entries
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
    OR pet_id IN (
      SELECT pm.pet_id FROM pet_members pm
      WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
    )
  );

-- INSERT: contributor must be the entry author (user_id = auth.uid()),
-- and must own the pet OR be an accepted member.
DROP POLICY IF EXISTS "entries_owner_insert" ON entries;
DROP POLICY IF EXISTS "entries_owner_or_member_insert" ON entries;

CREATE POLICY "entries_owner_or_member_insert" ON entries
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
      OR pet_id IN (
        SELECT pm.pet_id FROM pet_members pm
        WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
      )
    )
  );

-- UPDATE: entry author (own entries) or pet owner (moderation)
DROP POLICY IF EXISTS "entries_owner_update" ON entries;
DROP POLICY IF EXISTS "entries_owner_or_pet_owner_update" ON entries;

CREATE POLICY "entries_owner_or_pet_owner_update" ON entries
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
  );

-- DELETE: entry author (own entries) or pet owner (moderation)
DROP POLICY IF EXISTS "entries_owner_delete" ON entries;
DROP POLICY IF EXISTS "entries_owner_or_pet_owner_delete" ON entries;

CREATE POLICY "entries_owner_or_pet_owner_delete" ON entries
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- 4. stories — replace stories_public_read (USING true) with owner-or-member
--    Public pages use service role → unaffected.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stories_public_read" ON stories;
DROP POLICY IF EXISTS "stories_owner_or_member_select" ON stories;

CREATE POLICY "stories_owner_or_member_select" ON stories
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR pet_id IN (
      SELECT pm.pet_id FROM pet_members pm
      WHERE pm.user_id = auth.uid() AND pm.status = 'accepted'
    )
  );

-- stories INSERT/UPDATE/DELETE remain owner-only (unchanged from existing policies)

-- ─────────────────────────────────────────────────────────────
-- 5. Entry limit trigger — exempt contributor entries from quota
--    A contributor adding to someone else's pet does not consume
--    their own free plan quota.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_free_entry_limit() RETURNS trigger AS $$
DECLARE
  v_plan      text;
  v_count     bigint;
  v_pet_owner uuid;
BEGIN
  -- Look up pet owner
  SELECT user_id INTO v_pet_owner FROM pets WHERE id = NEW.pet_id;

  -- Only enforce when user is adding to their OWN pet
  IF v_pet_owner IS DISTINCT FROM NEW.user_id THEN
    RETURN NEW; -- contributor entry — no quota check
  END IF;

  SELECT plan INTO v_plan FROM profiles WHERE id = NEW.user_id;
  IF v_plan = 'free' THEN
    SELECT count(*) INTO v_count FROM entries WHERE user_id = NEW.user_id;
    IF v_count >= 10 THEN
      RAISE EXCEPTION 'entry_limit';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger (DROP + CREATE to pick up the new function body)
DROP TRIGGER IF EXISTS trg_enforce_free_entry_limit ON entries;
CREATE TRIGGER trg_enforce_free_entry_limit
  BEFORE INSERT ON entries
  FOR EACH ROW EXECUTE FUNCTION enforce_free_entry_limit();

-- ─────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pets', 'entries', 'stories', 'pet_members')
ORDER BY tablename, cmd;

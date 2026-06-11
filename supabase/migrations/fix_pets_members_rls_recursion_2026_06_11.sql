-- ============================================================
-- Fix: infinite recursion between pets and pet_members RLS policies
-- ============================================================
-- Root cause (session 48):
--   pets_owner_or_member_select  reads pet_members  (member check)
--   pet_members_owner_select     reads pets         (owner check)
--   → pets → pet_members → pets → ... → ERROR 42P17 infinite recursion
--   → every dashboard pet read fails since the session 48 deploy.
--
-- Fix: move the cross-table lookups into SECURITY DEFINER functions.
-- They run as the function owner (postgres, BYPASSRLS), so the inner
-- query does NOT re-trigger the caller table's policy → no recursion.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Helper functions (SECURITY DEFINER → bypass RLS, break the cycle)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_owns_pet(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pets WHERE id = p_pet_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_accepted_member(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pet_members
    WHERE pet_id = p_pet_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_pet(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_is_accepted_member(uuid) TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────
-- pets: owner OR accepted member — member check via SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pets_owner_or_member_select" ON pets;
CREATE POLICY "pets_owner_or_member_select" ON pets
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.user_is_accepted_member(id)
  );

-- ─────────────────────────────────────────────────────────────
-- pet_members: owner sees members — owner check via SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pet_members_owner_select" ON pet_members;
CREATE POLICY "pet_members_owner_select" ON pet_members
  FOR SELECT
  USING ( public.user_owns_pet(pet_id) );

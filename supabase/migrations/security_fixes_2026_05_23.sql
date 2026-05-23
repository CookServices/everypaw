-- Security fixes 2026-05-23

-- 1. RPC to atomically decrement book_credits (mirrors existing increment_book_credits)
CREATE OR REPLACE FUNCTION decrement_book_credits(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET book_credits = GREATEST(0, book_credits - 1)
  WHERE id = p_user_id AND book_credits > 0;
END;
$$;

-- 2. Allow authenticated users to insert their own milestones from client
DO $$ BEGIN
  DROP POLICY IF EXISTS "milestones_owner_insert" ON milestones;
  CREATE POLICY "milestones_owner_insert" ON milestones
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

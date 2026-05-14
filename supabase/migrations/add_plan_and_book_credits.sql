-- ============================================================
-- Everypaw — Plan & book credits
-- Idempotent (safe to re-run).
-- Apply via Supabase SQL Editor.
-- ============================================================

-- 1. Add plan column (free | digital | print | book_only)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- Constraint: only valid plan values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_plan_check' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_plan_check
        CHECK (plan IN ('free', 'digital', 'print', 'book_only'));
  END IF;
END $$;

-- 2. Add book_credits column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS book_credits integer NOT NULL DEFAULT 0;

-- 3. Migrate existing premium users → digital
--    (old "premium" had unlimited AI but the book was never really sustainable)
UPDATE profiles
SET plan = 'digital'
WHERE is_premium = true
  AND plan = 'free';

-- 4. stripe_subscription_id — useful for cancellation lookup
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- 5. RPC: atomic book_credits increment (used by Stripe webhook)
CREATE OR REPLACE FUNCTION increment_book_credits(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET book_credits = book_credits + 1
  WHERE id = p_user_id;
$$;

-- Verification
SELECT id, plan, book_credits, is_premium
FROM profiles
LIMIT 5;

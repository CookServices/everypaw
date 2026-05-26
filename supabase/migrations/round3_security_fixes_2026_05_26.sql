-- Round 3 security fixes — 2026-05-26
-- Fix try_consume_book_credit to allow digital plan users (M4)

CREATE OR REPLACE FUNCTION try_consume_book_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
  v_credits integer;
BEGIN
  SELECT plan, book_credits INTO v_plan, v_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- print and digital plan users order freely, no credit consumed
  IF v_plan = 'print' OR v_plan = 'digital' THEN
    RETURN true;
  END IF;

  -- Atomically consume one credit if available
  IF COALESCE(v_credits, 0) > 0 THEN
    UPDATE profiles SET book_credits = book_credits - 1 WHERE id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION restore_book_credit(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
BEGIN
  SELECT plan INTO v_plan FROM profiles WHERE id = p_user_id;
  -- Only restore for users who actually consumed a credit (not print, not digital)
  IF v_plan IS DISTINCT FROM 'print' AND v_plan IS DISTINCT FROM 'digital' THEN
    UPDATE profiles SET book_credits = COALESCE(book_credits, 0) + 1 WHERE id = p_user_id;
  END IF;
END;
$$;

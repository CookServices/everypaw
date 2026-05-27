-- Fix book credits for print plan — 2026-05-27
-- Business rule: print plan gets 1 credit/year via Stripe webhook.
-- All plans must consume a credit to order a book; the old exemption
-- that let print/digital bypass the credit check was incorrect.

CREATE OR REPLACE FUNCTION try_consume_book_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits integer;
BEGIN
  SELECT book_credits INTO v_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Atomically consume one credit if available (all plans)
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
BEGIN
  -- Restore credit on Gelato failure — for all plans
  UPDATE profiles SET book_credits = COALESCE(book_credits, 0) + 1 WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- [C-1] Lock down book-credit RPCs — 2026-07-06
-- ============================================================
-- These SECURITY DEFINER functions mutate profiles.book_credits and are only
-- ever called server-side with the service role (Stripe webhook, gelato/order).
-- Left with the default PUBLIC execute grant, PostgREST exposes them as RPC
-- endpoints callable by any anon/authenticated JWT — a logged-in user could
-- call increment_book_credits({p_user_id: <own uid>}) to self-grant free
-- physical books. Revoke execute from client roles (service role bypasses this).
--
-- Also pin search_path on the functions that lacked it (definer-safety).
-- ============================================================

-- Harden search_path on the two functions defined without it
CREATE OR REPLACE FUNCTION public.increment_book_credits(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET book_credits = book_credits + 1
  WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_book_credits(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET book_credits = GREATEST(0, book_credits - 1)
  WHERE id = p_user_id AND book_credits > 0;
END;
$$;

-- Revoke client execute on every money-affecting credit RPC.
REVOKE ALL ON FUNCTION public.increment_book_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_book_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_consume_book_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_book_credit(uuid)     FROM PUBLIC, anon, authenticated;

-- Verification: these should return no rows for anon/authenticated after apply.
-- SELECT p.proname, r.rolname
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- CROSS JOIN LATERAL aclexplode(p.proacl) a
-- JOIN pg_roles r ON r.oid = a.grantee
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('increment_book_credits','decrement_book_credits','try_consume_book_credit','restore_book_credit')
--   AND r.rolname IN ('anon','authenticated');

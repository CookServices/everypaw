-- ============================================================
-- [B-1] Re-exempt contributor entries from the free-plan cap — 2026-07-06
-- ============================================================
-- enforce_free_entry_limit_2026_07_06.sql rewrote the trigger and dropped the
-- contributor exemption that add_pet_members_2026_06_11.sql had introduced.
-- Result: a free user who is an accepted contributor on someone else's pet
-- burns their own 10-entry quota on those contributions and gets blocked.
-- Restore the exemption: only count entries the user adds to their OWN pet.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_free_entry_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan      text;
  v_count     int;
  v_pet_owner uuid;
BEGIN
  -- Contributor entries (adding to a pet the user does not own) never count.
  SELECT user_id INTO v_pet_owner FROM public.pets WHERE id = new.pet_id;
  IF v_pet_owner IS DISTINCT FROM new.user_id THEN
    RETURN new;
  END IF;

  SELECT plan INTO v_plan FROM public.profiles WHERE id = new.user_id;

  -- Only the free plan is capped; a missing profile is treated as free.
  IF coalesce(v_plan, 'free') <> 'free' THEN
    RETURN new;
  END IF;

  SELECT count(*) INTO v_count FROM public.entries WHERE user_id = new.user_id;

  -- Message 'entry_limit' is matched by the client to show the upsell.
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'entry_limit' USING errcode = 'check_violation';
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_entry_limit ON public.entries;
CREATE TRIGGER trg_enforce_free_entry_limit
  BEFORE INSERT ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_entry_limit();

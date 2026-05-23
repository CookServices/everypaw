-- Medium/Low security fixes 2026-05-23

-- 1. Restrict entries to authenticated users only.
--    The public pet profile page now reads entries via service role with an
--    explicit pet_id filter — not via the anon key directly.
DROP POLICY IF EXISTS "entries_public_read" ON entries;
DROP POLICY IF EXISTS "entries_owner_read" ON entries;
CREATE POLICY "entries_owner_read" ON entries
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Enforce free-plan entry limit at DB level (10 entries max).
--    Blocks bypass via direct Supabase REST API calls.
CREATE OR REPLACE FUNCTION enforce_free_entry_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan  TEXT;
  v_count INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM profiles WHERE id = NEW.user_id;
  IF v_plan IS NULL OR v_plan = 'free' THEN
    SELECT COUNT(*) INTO v_count FROM entries WHERE user_id = NEW.user_id;
    IF v_count >= 10 THEN
      RAISE EXCEPTION 'entry_limit';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_entry_limit ON entries;
CREATE TRIGGER trg_enforce_free_entry_limit
  BEFORE INSERT ON entries
  FOR EACH ROW EXECUTE FUNCTION enforce_free_entry_limit();

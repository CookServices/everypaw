-- Everypaw — Add month_key to stories for monthly cron idempotence
-- Idempotent (safe to re-run)

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS month_key text;

-- Unique partial index: one monthly story per pet per month
-- Wrapped in DO $$ so it's idempotent (CREATE INDEX IF NOT EXISTS on partial indexes
-- requires PG 15+; this pattern works on all PG versions Supabase ships)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stories'
      AND indexname = 'stories_pet_id_month_key_unique'
  ) THEN
    CREATE UNIQUE INDEX stories_pet_id_month_key_unique
      ON stories (pet_id, month_key)
      WHERE month_key IS NOT NULL;
  END IF;
END $$;

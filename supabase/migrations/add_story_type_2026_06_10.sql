-- Everypaw — Add story_type to stories (origins onboarding)
-- Idempotent (safe to re-run)

-- Add story_type column (default 'monthly' for all existing stories)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS story_type text NOT NULL DEFAULT 'monthly';

-- Replace the old unique partial index (pet_id, month_key) with a new one that
-- includes story_type, so two stories from different types can share the same month_key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stories' AND indexname = 'stories_pet_id_month_key_unique'
  ) THEN
    DROP INDEX stories_pet_id_month_key_unique;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stories' AND indexname = 'stories_pet_id_story_type_month_key_unique'
  ) THEN
    CREATE UNIQUE INDEX stories_pet_id_story_type_month_key_unique
      ON stories (pet_id, story_type, month_key)
      WHERE month_key IS NOT NULL;
  END IF;
END $$;

-- One origins story per pet (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stories' AND indexname = 'stories_one_origins_per_pet'
  ) THEN
    CREATE UNIQUE INDEX stories_one_origins_per_pet
      ON stories (pet_id)
      WHERE story_type = 'origins';
  END IF;
END $$;

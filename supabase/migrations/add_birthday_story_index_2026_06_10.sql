-- Everypaw — One birthday letter per pet per year (idempotent)
-- story_type column added by add_story_type_2026_06_10.sql (must run first)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'stories' AND indexname = 'stories_one_birthday_per_pet_per_year'
  ) THEN
    CREATE UNIQUE INDEX stories_one_birthday_per_pet_per_year
      ON stories (pet_id, month_key)
      WHERE story_type = 'birthday';
  END IF;
END $$;

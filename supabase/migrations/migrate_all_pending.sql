-- ============================================================
-- Everypaw — Migration complète idempotente
-- À coller dans le SQL Editor Supabase.
-- Toutes les opérations utilisent IF NOT EXISTS / IF EXISTS :
-- safe à exécuter même si certaines colonnes existent déjà.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLE : pets — champs mémorial
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS deceased_at      date,
  ADD COLUMN IF NOT EXISTS memorial_message text;


-- ─────────────────────────────────────────────────────────────
-- 2. TABLE : pets — champs streak
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS current_streak  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_entry_date date;

-- Backfill last_entry_date depuis les entrées existantes
UPDATE pets p
SET last_entry_date = (
  SELECT MAX(e.entry_date::date)
  FROM entries e
  WHERE e.pet_id = p.id
)
WHERE last_entry_date IS NULL
  AND EXISTS (
    SELECT 1 FROM entries e WHERE e.pet_id = p.id
  );


-- ─────────────────────────────────────────────────────────────
-- 3. TABLE : profiles — champs divers
-- ─────────────────────────────────────────────────────────────

-- email_reminders : default true pour les nouveaux comptes
ALTER TABLE profiles
  ALTER COLUMN email_reminders SET DEFAULT true;

-- onboarding
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- opt-in prompts IA quotidiens
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_prompt_email boolean NOT NULL DEFAULT false;


-- ─────────────────────────────────────────────────────────────
-- 4. TABLE : daily_prompts (nouvelle)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_prompts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid        NOT NULL REFERENCES pets(id)       ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_text text        NOT NULL,
  prompt_date date        NOT NULL DEFAULT CURRENT_DATE,
  locale      text        NOT NULL DEFAULT 'fr',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pet_id, prompt_date)
);


-- ─────────────────────────────────────────────────────────────
-- 5. TABLE : events_log (nouvelle)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id       uuid        REFERENCES pets(id) ON DELETE CASCADE,
  event_type   text        NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  metadata     jsonb,
  UNIQUE (user_id, pet_id, event_type)
);

CREATE INDEX IF NOT EXISTS events_log_user_pet
  ON events_log (user_id, pet_id);


-- ─────────────────────────────────────────────────────────────
-- Vérification post-migration
-- ─────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Résultat attendu : daily_prompts, entries, events_log,
--                    milestones, pets, profiles, stories

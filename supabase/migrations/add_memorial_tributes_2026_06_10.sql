-- Everypaw — Memorial tributes (messages from family & friends)
-- Idempotent: safe to run multiple times.

-- Table
CREATE TABLE IF NOT EXISTS memorial_tributes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  author_name   text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 100),
  message       text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS memorial_tributes_pet_id_idx ON memorial_tributes (pet_id);
CREATE INDEX IF NOT EXISTS memorial_tributes_status_idx ON memorial_tributes (pet_id, status);

-- RLS
ALTER TABLE memorial_tributes ENABLE ROW LEVEL SECURITY;

-- Public: read approved tributes for deceased pets only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'memorial_tributes' AND policyname = 'tributes_public_read'
  ) THEN
    CREATE POLICY tributes_public_read ON memorial_tributes
      FOR SELECT USING (
        status = 'approved'
        AND EXISTS (
          SELECT 1 FROM pets p WHERE p.id = pet_id AND p.deceased_at IS NOT NULL
        )
      );
  END IF;
END $$;

-- Owner: can read all tributes for their pets (for moderation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'memorial_tributes' AND policyname = 'tributes_owner_read'
  ) THEN
    CREATE POLICY tributes_owner_read ON memorial_tributes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM pets p WHERE p.id = pet_id AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- No client INSERT/UPDATE/DELETE — all writes go through service-role API routes.

-- Notify owner of new tribute: throttle via events_log (1 email per 24h per pet)
-- event_type: 'memorial_tribute_notif', metadata: { pet_id }

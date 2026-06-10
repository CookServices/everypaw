-- Everypaw — Index partiel sur events_log pour les retention emails
-- Idempotent (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_events_log_retention
  ON events_log (user_id, event_type)
  WHERE event_type LIKE 'retention_%';

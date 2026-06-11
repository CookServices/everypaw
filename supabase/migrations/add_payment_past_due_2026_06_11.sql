-- Idempotent: add payment_past_due flag to profiles
-- Set by invoice.payment_failed webhook, cleared by invoice.payment_succeeded

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_past_due boolean NOT NULL DEFAULT false;

-- Everypaw — Add Stripe receipt fields to book_configs
-- Idempotent (safe to re-run)
ALTER TABLE book_configs
  ADD COLUMN IF NOT EXISTS stripe_receipt_url  text,
  ADD COLUMN IF NOT EXISTS stripe_amount_paid  integer,  -- cents
  ADD COLUMN IF NOT EXISTS stripe_currency     text;

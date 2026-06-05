-- ============================================================
-- Add subscription_renewal_date to profiles
-- Written by webhook on each Stripe billing cycle
-- Used by order page + settings to display renewal date
-- without a live Stripe API call on every page load
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_renewal_date bigint;

-- bigint: Unix timestamp (seconds) — same unit as Stripe's current_period_end

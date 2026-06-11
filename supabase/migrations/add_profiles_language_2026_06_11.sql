-- Add the per-user email language column referenced throughout the codebase.
-- It was never created in prod, so every profiles query that selected it failed
-- (PostgREST 400 → null result), silently disabling all localized cron emails
-- (weekly-reminder, birthday-check, daily-prompts, on-this-day, streak-alert,
-- retention-emails) and the Stripe dunning email locale.
--
-- 'en' | 'fr'. NULL → treated as English by the app.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text;

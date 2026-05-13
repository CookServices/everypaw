-- Change default for new accounts only — existing rows are not affected
ALTER TABLE profiles ALTER COLUMN email_reminders SET DEFAULT true;

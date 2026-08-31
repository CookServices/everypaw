-- Run this in the Supabase SQL editor
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean NOT NULL DEFAULT false;

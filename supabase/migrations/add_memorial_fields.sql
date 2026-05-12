-- Run this in the Supabase SQL editor
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS deceased_at date,
  ADD COLUMN IF NOT EXISTS memorial_message text;

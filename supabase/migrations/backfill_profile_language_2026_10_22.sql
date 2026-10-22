-- Backfill profiles.language for accounts that never received one (session 79).
--
-- Every Google account and every email account created before the
-- 2026-08-31 confirmation fix has language = null, which the code used to
-- read as French. The code now falls back on English; this gives each of
-- those accounts an explicit language, French for the listed emails and
-- English for everyone else. List given by the owner on 2026-10-22, applied
-- in production the same day.
--
-- Idempotent: both updates only touch rows where language IS NULL, so a
-- re-run changes nothing and a language set since is never overwritten.
--
-- Control query:
--   select p.email, u.raw_app_meta_data->>'provider' as provider, p.language
--   from profiles p join auth.users u on u.id = p.id
--   where p.language is null
--   order by provider, p.email;

update profiles
set language = 'fr'
where language is null
  and email = any (array[
    'jmauduit@webnet.fr',
    'julien_mauduit@yahoo.fr',
    'julien.mauduit@gmail.com',
    'test-pp0@yopmail.com'
  ]::text[]);

update profiles
set language = 'en'
where language is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Jeu d'essai de funnel.sql — à lancer sur une base jetable, JAMAIS en prod
-- (il crée les tables). Sert à vérifier qu'une définition modifiée compte
-- toujours ce qu'elle prétend compter.
--
--   docker run -d --name ep-funnel-check -e POSTGRES_PASSWORD=check \
--     -e POSTGRES_DB=check postgres:17-alpine
--   docker cp supabase/analytics/funnel.fixture.sql ep-funnel-check:/tmp/f.sql
--   docker cp supabase/analytics/funnel.sql         ep-funnel-check:/tmp/q.sql
--   docker exec ep-funnel-check psql -U postgres -d check -q -f /tmp/f.sql
--   docker exec ep-funnel-check psql -U postgres -d check -x -f /tmp/q.sql
--   docker rm -f ep-funnel-check
--
-- Attendu sur la fenêtre d'août 2026 écrite dans funnel.sql :
--   signups 3 · with_pet 2 · with_3_entries 1 · with_story 1
--   with_book_preview 1 · print_subscribers 1
--
-- Ces tables sont volontairement minimales : seules les colonnes lues par
-- funnel.sql sont présentes, ce n'est pas une réplique du schéma de prod.
-- ─────────────────────────────────────────────────────────────────────────

create table profiles (id uuid primary key, email text, plan text, created_at timestamptz);
create table pets (id uuid primary key, user_id uuid, created_at timestamptz);
create table entries (id uuid primary key, user_id uuid, created_at timestamptz);
create table stories (id uuid primary key, user_id uuid, created_at timestamptz);
create table book_configs (id uuid primary key, user_id uuid, created_at timestamptz);

-- u1: in window, pet, 3 entries, story, book config, plan print  -> counted everywhere
-- u2: in window, pet, 2 entries only                             -> stops at with_pet
-- u3: in window, nothing                                         -> signup only
-- u4: BEFORE the window, complete                                -> excluded entirely
-- u5: in window, yopmail test account, complete                  -> excluded entirely
insert into profiles values
  ('00000000-0000-0000-0000-000000000001','a@x.com','print', '2026-08-05'),
  ('00000000-0000-0000-0000-000000000002','b@x.com','free',  '2026-08-06'),
  ('00000000-0000-0000-0000-000000000003','c@x.com','free',  '2026-08-31 23:59'),
  ('00000000-0000-0000-0000-000000000004','d@x.com','print', '2026-07-31 23:59'),
  ('00000000-0000-0000-0000-000000000005','test-print@yopmail.com','print','2026-08-10');

insert into pets (id, user_id, created_at)
select gen_random_uuid(), id, '2026-08-20' from profiles where email in ('a@x.com','b@x.com','d@x.com','test-print@yopmail.com');

insert into entries (id, user_id, created_at)
select gen_random_uuid(), p.id, '2026-08-21'
from profiles p, generate_series(1,3) g where p.email in ('a@x.com','d@x.com','test-print@yopmail.com');
insert into entries (id, user_id, created_at)
select gen_random_uuid(), p.id, '2026-08-21'
from profiles p, generate_series(1,2) g where p.email = 'b@x.com';

insert into stories (id, user_id, created_at)
select gen_random_uuid(), id, '2026-08-22' from profiles where email in ('a@x.com','d@x.com','test-print@yopmail.com');

insert into book_configs (id, user_id, created_at)
select gen_random_uuid(), id, '2026-08-23' from profiles where email in ('a@x.com','d@x.com','test-print@yopmail.com');

-- Pages créées sans compte (docs/acquisition/specs.md, PP-0 pose la table, PP-1 l'écrit).
--
-- Un visiteur crée une page publique pour son animal avant d'avoir un compte,
-- puis la réclame en s'inscrivant. Ces lignes n'ont pas de propriétaire tant
-- qu'elles ne sont pas réclamées : elles vivent ici et jamais dans `pets`,
-- dont les policies RLS et funnel.sql supposent un `user_id`.
--
-- Service role only : RLS activée, aucune policy, même forme que rate_limits
-- et gift_deliveries. Toute lecture publique passe par un server component qui
-- filtre par slug ; toute écriture passe par une route API.

create table if not exists public_pages (
  id                uuid primary key default gen_random_uuid(),
  -- 10 caractères base62, généré côté serveur ; c'est l'URL partagée.
  slug              text not null unique,
  kind              text not null check (kind in ('memorial', 'living')),
  locale            text not null check (locale in ('en', 'fr')),
  pet_name          text not null,
  species           text,
  birthdate         date,
  deceased_at       date,
  photo_url         text,
  -- Tableau de 2 ou 3 chaînes, les souvenirs saisis par le créateur.
  memories          jsonb not null default '[]'::jsonb,
  story_title       text not null,
  story_content     text not null,
  -- sha256 hex du token remis au créateur ; le token brut n'est jamais stocké.
  claim_token_hash  text not null,
  -- Cascade : supprimer le compte supprime la page qu'il a réclamée, et
  -- supprimer l'animal supprime la page qui y redirige.
  claimed_by        uuid references auth.users(id) on delete cascade,
  claimed_pet_id    uuid references pets(id) on delete cascade,
  claimed_at        timestamptz,
  creator_ip_hash   text,
  country           text,
  view_count        int not null default 0,
  status            text not null default 'active'
                    check (status in ('active', 'claimed', 'hidden')),
  created_at        timestamptz not null default now(),
  -- Une page non réclamée est purgée après 30 jours (PP-5).
  expires_at        timestamptz not null default now() + interval '30 days'
);

alter table public_pages enable row level security;

-- Le cron de purge lit exactement une tranche : actives et expirées.
create index if not exists public_pages_expiry_idx
  on public_pages (expires_at)
  where status = 'active';

-- funnel.sql agrège par fenêtre de création.
create index if not exists public_pages_created_idx
  on public_pages (created_at);

-- Compteur d'ouvertures, incrément atomique depuis le server component.
-- On mesure des ouvertures, pas des personnes : aucune déduplication.
create or replace function public.increment_public_page_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.public_pages
  set view_count = view_count + 1
  where slug = p_slug;
$$;

-- Jamais exposée aux clients : le service role seul l'appelle. Sans ce revoke,
-- PostgREST l'offrirait à tout JWT anon (leçon du 2026-07-06 sur les RPC crédits).
revoke execute on function public.increment_public_page_view(text) from public, anon, authenticated;
grant execute on function public.increment_public_page_view(text) to service_role;

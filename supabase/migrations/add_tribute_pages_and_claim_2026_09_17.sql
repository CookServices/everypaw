-- Réclamation d'une page créée sans compte (docs/acquisition/specs.md, PP-2).
-- Idempotent.

-- ── 1. Un hommage peut viser une page publique au lieu d'un animal ──────────
alter table memorial_tributes add column if not exists page_id uuid
  references public_pages(id) on delete cascade;

alter table memorial_tributes alter column pet_id drop not null;

-- Un hommage vise exactement l'un des deux. La réclamation fait passer une
-- ligne de la page à l'animal, donc les deux peuvent être remplis un instant ;
-- la contrainte n'exige que la présence d'au moins une cible.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'memorial_tributes_target_check'
  ) then
    alter table memorial_tributes add constraint memorial_tributes_target_check
      check (pet_id is not null or page_id is not null);
  end if;
end $$;

create index if not exists memorial_tributes_page_id_idx
  on memorial_tributes (page_id) where page_id is not null;

-- ── 2. La réclamation échappe au plafond d'entrées du plan gratuit ─────────
-- Le corps ci-dessous est celui de restore_contributor_entry_exemption_2026_07_06.sql,
-- augmenté d'une seule sortie anticipée. Refuser les souvenirs d'un visiteur
-- parce que son compte gratuit est déjà à dix entrées reviendrait à perdre la
-- page qu'il vient d'écrire, au moment précis où il s'inscrit pour la garder.
-- Le drapeau est local à la transaction et aucun client ne peut le poser :
-- PostgREST n'expose pas set_config, et la seule fonction qui l'appelle est
-- révoquée pour anon et authenticated.
create or replace function public.enforce_free_entry_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_plan      text;
  v_count     int;
  v_pet_owner uuid;
BEGIN
  IF coalesce(current_setting('everypaw.claiming', true), '') = '1' THEN
    RETURN new;
  END IF;

  -- Contributor entries (adding to a pet the user does not own) never count.
  SELECT user_id INTO v_pet_owner FROM public.pets WHERE id = new.pet_id;
  IF v_pet_owner IS DISTINCT FROM new.user_id THEN
    RETURN new;
  END IF;

  SELECT plan INTO v_plan FROM public.profiles WHERE id = new.user_id;

  -- Only the free plan is capped; a missing profile is treated as free.
  IF coalesce(v_plan, 'free') <> 'free' THEN
    RETURN new;
  END IF;

  SELECT count(*) INTO v_count FROM public.entries WHERE user_id = new.user_id;

  -- Message 'entry_limit' is matched by the client to show the upsell.
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'entry_limit' USING errcode = 'check_violation';
  END IF;

  RETURN new;
END;
$$;

-- ── 3. La réclamation elle-même ────────────────────────────────────────────
create or replace function public.claim_public_page(
  p_slug text,
  p_token_hash text,
  p_user uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page      public_pages%rowtype;
  v_pet_id    uuid;
  v_entry     date;
  v_memory    text;
  v_message   text;
  v_type      text;
begin
  -- Verrou sur la ligne : deux réclamations simultanées se suivent au lieu de
  -- créer deux animaux. La seconde trouvera status <> 'active'.
  select * into v_page
  from public.public_pages
  where slug = p_slug and status = 'active'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_claimable');
  end if;

  -- Comparaison de deux chaînes hexadécimales de longueur fixe. Elle n'est pas
  -- à temps constant, mais l'attaquant devrait distinguer des écarts de
  -- nanosecondes à travers un aller-retour réseau et une requête SQL, pour un
  -- secret de 256 bits. Le jeton brut n'est jamais stocké ni comparé.
  if v_page.claim_token_hash is distinct from p_token_hash then
    return jsonb_build_object('ok', false, 'reason', 'bad_token');
  end if;

  -- À partir d'ici on écrit. Tout échec annule l'ensemble.
  perform set_config('everypaw.claiming', '1', true);

  insert into public.pets (user_id, name, species, birthdate, photo_url,
                           deceased_at, memorial_photo_url, memorial_message)
  values (
    p_user,
    v_page.pet_name,
    v_page.species,
    v_page.birthdate,
    v_page.photo_url,
    v_page.deceased_at,
    case when v_page.kind = 'memorial' then v_page.photo_url else null end,
    case when v_page.kind = 'memorial'
         then left(split_part(v_page.story_content, '.', 1), 300) || '.'
         else null end
  )
  returning id into v_pet_id;

  -- Les souvenirs deviennent des entrées. Pour un mémorial elles sont datées
  -- de la veille du départ, faute de mieux : ce sont des souvenirs d'avant.
  v_entry := case when v_page.deceased_at is not null
                  then v_page.deceased_at - 1
                  else current_date end;

  for v_memory in select jsonb_array_elements_text(v_page.memories)
  loop
    insert into public.entries (pet_id, user_id, content, entry_date)
    values (v_pet_id, p_user, v_memory, v_entry);
  end loop;

  v_type := case when v_page.kind = 'memorial' then 'memorial' else 'origins' end;

  insert into public.stories (pet_id, user_id, title, content, status,
                              story_type, period_start, period_end)
  values (v_pet_id, p_user, v_page.story_title, v_page.story_content,
          'published', v_type, v_entry, v_entry);

  -- Les hommages déposés pendant que la page était anonyme rejoignent l'animal,
  -- en attente : le nouveau propriétaire les modère dans l'onglet existant.
  update public.memorial_tributes
  set pet_id = v_pet_id
  where page_id = v_page.id;

  update public.public_pages
  set status = 'claimed',
      claimed_by = p_user,
      claimed_pet_id = v_pet_id,
      claimed_at = now()
  where id = v_page.id;

  -- L'animal existe, donc l'onboarding n'a plus de raison de s'afficher.
  update public.profiles
  set onboarding_completed = true,
      onboarding_dismissed = true
  where id = p_user;

  return jsonb_build_object('ok', true, 'pet_id', v_pet_id);
end;
$$;

-- Jamais exposée aux clients : elle écrit dans pets, entries, stories et
-- profiles au nom d'un utilisateur passé en paramètre. Laissée ouverte, tout
-- JWT pourrait réclamer la page d'un autre en devinant un slug.
revoke execute on function public.claim_public_page(text, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_public_page(text, text, uuid) to service_role;

-- Enforce the free-plan journal entry cap (10 entries) at the database level.
-- The client showed an upsell at 10 but never blocked the insert, so a free
-- user could bypass the cap by inserting directly via the anon key + RLS.
-- canAddEntry() in src/lib/plan.ts encodes the same rule but was never wired up.
-- A DB trigger is the only non-bypassable enforcement point for client inserts.

create or replace function public.enforce_free_entry_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_count int;
begin
  select plan into v_plan from public.profiles where id = new.user_id;

  -- Only the free plan is capped; a missing profile is treated as free.
  if coalesce(v_plan, 'free') <> 'free' then
    return new;
  end if;

  select count(*) into v_count from public.entries where user_id = new.user_id;

  -- Message 'entry_limit' is matched by the client to show the upsell.
  if v_count >= 10 then
    raise exception 'entry_limit' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_free_entry_limit on public.entries;
create trigger trg_enforce_free_entry_limit
  before insert on public.entries
  for each row execute function public.enforce_free_entry_limit();

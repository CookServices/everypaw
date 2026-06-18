-- Persistent, instance-shared rate limiting.
-- Replaces the in-memory limiter (lost on every serverless cold start) for
-- IP/user-keyed limits on contact, waitlist, gift-checkout, export-data,
-- memorial tributes, suggestion and unsubscribe.

create table if not exists public.rate_limits (
  key       text primary key,
  count     int not null default 0,
  reset_at  timestamptz not null default now()
);

-- No RLS policies: clients never touch this table directly. Only the
-- SECURITY DEFINER function below mutates it.
alter table public.rate_limits enable row level security;

-- Atomic check-and-increment. Returns true when the request is allowed
-- (i.e. the new count within the current window is <= p_max).
create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case
                  when public.rate_limits.reset_at < now() then 1
                  else public.rate_limits.count + 1
                end,
        reset_at = case
                     when public.rate_limits.reset_at < now()
                       then now() + make_interval(secs => p_window_seconds)
                     else public.rate_limits.reset_at
                   end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

-- Optional housekeeping: purge stale windows.
-- delete from public.rate_limits where reset_at < now() - interval '1 day';

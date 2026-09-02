-- Gifts bought for a future date.
--
-- Resend's own scheduling caps at 30 days, and a gift is routinely bought
-- months ahead (a birthday, Christmas). The email is therefore held here and
-- sent by /api/cron/gift-deliveries on the chosen day.
--
-- Service role only: nothing about a gift belongs to the recipient's session,
-- and the buyer has no account of their own in this flow. RLS is enabled with
-- no policy, same shape as rate_limits.

create table if not exists gift_deliveries (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id text not null unique,
  promo_code text not null,
  recipient_email text not null,
  sender_name text not null default '',
  message text not null default '',
  locale text not null default 'en',
  deliver_on date not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table gift_deliveries enable row level security;

-- The cron reads exactly one slice: due and not yet sent.
create index if not exists gift_deliveries_due_idx
  on gift_deliveries (deliver_on)
  where sent_at is null;

-- Push notifications: per-device subscriptions, per-person preferences, and a
-- send log for de-duplication. Sending happens server-side (service role).

alter table forkcast.households
  add column if not exists timezone text not null default 'Pacific/Auckland',
  -- Most meat lives in the freezer, so remind the night before to take it out.
  add column if not exists meat_from_freezer boolean not null default true;

create table forkcast.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references forkcast.households(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count   smallint not null default 0
);
create index on forkcast.push_subscriptions (user_id);

create table forkcast.notification_prefs (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  household_id     uuid not null references forkcast.households(id) on delete cascade,
  morning_at       time not null default '07:30',
  evening_at       time not null default '19:30',
  tonight          boolean not null default true,   -- morning: what's for dinner + same-day prep
  prep             boolean not null default true,   -- evening: take meat out / prep for tomorrow
  planning         boolean not null default true,   -- next plan isn't made yet
  produce          boolean not null default true,   -- fresh things that may be going off
  planning_lead_days smallint not null default 2 check (planning_lead_days between 0 and 7),
  updated_at       timestamptz not null default now()
);

create table forkcast.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  ref        text not null,           -- e.g. the local date it was for
  sent_at    timestamptz not null default now(),
  unique (user_id, kind, ref)
);

alter table forkcast.push_subscriptions enable row level security;
create policy "own subscriptions" on forkcast.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and household_id in (select forkcast.my_household_ids()));

alter table forkcast.notification_prefs enable row level security;
create policy "own prefs" on forkcast.notification_prefs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and household_id in (select forkcast.my_household_ids()));

alter table forkcast.notification_log enable row level security;
create policy "own log" on forkcast.notification_log for select to authenticated
  using (user_id = auth.uid());

grant all on forkcast.push_subscriptions, forkcast.notification_prefs, forkcast.notification_log
  to authenticated, service_role;

-- Forkcast v2 — core schema
-- Lives in the `forkcast` schema of the shared personal-apps Supabase project.
-- The v1 schema is preserved (renamed to `forkcast_v1`, no API access) so its
-- data can be imported; see 0002_import_v1.sql.
--
-- Tenancy: everything belongs to a household. Signed-in users reach a
-- household via household_users; RLS checks membership on every table through
-- forkcast.my_household_ids().

-- ---------------------------------------------------------------------------
-- Archive v1
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'forkcast')
     and not exists (select 1 from pg_namespace where nspname = 'forkcast_v1')
     and exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'forkcast' and c.relname = 'recipes') then
    alter schema forkcast rename to forkcast_v1;
    revoke all on schema forkcast_v1 from anon, authenticated;
  end if;
end $$;

create schema if not exists forkcast;

-- ---------------------------------------------------------------------------
-- Households & people
-- ---------------------------------------------------------------------------
create table forkcast.households (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  -- Planning cadence: 7 (weekly) or 14 (fortnightly) days.
  cycle_length_days smallint not null default 14 check (cycle_length_days in (7, 14)),
  -- Day the cycle starts, 0 = Sunday … 6 = Saturday.
  cycle_start_dow   smallint not null default 6 check (cycle_start_dow between 0 and 6),
  default_servings  smallint not null default 5 check (default_servings between 1 and 20),
  created_at        timestamptz not null default now()
);

-- Signed-in accounts that can see a household.
create table forkcast.household_users (
  household_id uuid not null references forkcast.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on forkcast.household_users (user_id);

-- Membership helper used by every RLS policy. security definer so it can read
-- household_users without recursing through that table's own policy.
create or replace function forkcast.my_household_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select household_id from forkcast.household_users where user_id = auth.uid()
$$;
revoke all on function forkcast.my_household_ids() from public, anon;
grant execute on function forkcast.my_household_ids() to authenticated, service_role;

-- The people in the house (not necessarily app users).
create table forkcast.members (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references forkcast.households(id) on delete cascade,
  name           text not null,
  user_id        uuid references auth.users(id) on delete set null,
  is_cook        boolean not null default false,
  gives_feedback boolean not null default true,
  colour         text,
  sort_order     smallint not null default 0,
  created_at     timestamptz not null default now(),
  unique (household_id, name)
);

-- ---------------------------------------------------------------------------
-- Meal library
-- ---------------------------------------------------------------------------
-- A meal is the unit of rotation ("Chilli", "Mince & Rice"). Variations are
-- different takes on it ("smoky chipotle", "Moroccan") that share rotation
-- but keep their own ingredients, notes and ratings.
create table forkcast.meals (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references forkcast.households(id) on delete cascade,
  name                 text not null,
  -- 'head': cooked from memory (notes + ingredients); 'recipe': follows a source.
  kind                 text not null default 'head' check (kind in ('head', 'recipe')),
  course               text not null default 'main' check (course in ('main', 'side', 'dessert')),
  description          text,
  notes                text,
  method               text,
  cuisine              text,
  protein              text,
  effort               text not null default 'medium' check (effort in ('quick', 'medium', 'project')),
  tags                 text[] not null default '{}',
  -- How often we'd like it: target days between servings. null = no preference.
  target_interval_days smallint check (target_interval_days > 0),
  servings             smallint check (servings between 1 and 30),
  -- Planner hints.
  weeknight_ok         boolean not null default true,
  batch_friendly       boolean not null default false,  -- makes good leftovers
  fresh_heavy          boolean not null default false,  -- needs fresh produce; plan early in cycle
  prep_note            text,                            -- e.g. "marinate overnight"
  prep_lead_hours      smallint check (prep_lead_hours >= 0),
  source_url           text,
  source_name          text,
  image_url            text,
  needs_recipe         boolean not null default false,  -- we cook it but haven't written it down
  archived             boolean not null default false,
  legacy_id            uuid,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on forkcast.meals (household_id) where not archived;

create table forkcast.meal_variations (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references forkcast.households(id) on delete cascade,
  meal_id      uuid not null references forkcast.meals(id) on delete cascade,
  name         text not null,
  notes        text,
  method       text,
  source_url   text,
  sort_order   smallint not null default 0,
  archived     boolean not null default false,
  legacy_id    uuid,
  created_at   timestamptz not null default now(),
  unique (meal_id, name)
);
create index on forkcast.meal_variations (meal_id);

-- Who usually cooks a meal. No rows = anyone.
create table forkcast.meal_cooks (
  household_id uuid not null references forkcast.households(id) on delete cascade,
  meal_id      uuid not null references forkcast.meals(id) on delete cascade,
  member_id    uuid not null references forkcast.members(id) on delete cascade,
  primary key (meal_id, member_id)
);

-- Ingredients. variation_id null = used by every version of the meal;
-- set = only for that variation (added on top of the shared ones).
create table forkcast.meal_ingredients (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references forkcast.households(id) on delete cascade,
  meal_id      uuid not null references forkcast.meals(id) on delete cascade,
  variation_id uuid references forkcast.meal_variations(id) on delete cascade,
  name         text not null,
  quantity     numeric check (quantity > 0),
  unit         text,
  note         text,
  section      text not null default 'other',
  optional     boolean not null default false,
  sort_order   smallint not null default 0
);
create index on forkcast.meal_ingredients (meal_id);

-- ---------------------------------------------------------------------------
-- Pantry
-- ---------------------------------------------------------------------------
-- 'always'  — never asked, never listed (salt, oil)
-- 'usually' — asked "got this?" when a planned meal needs it
-- 'regular' — added to every main shop (milk, bread)
create table forkcast.pantry_items (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references forkcast.households(id) on delete cascade,
  name              text not null,
  tier              text not null check (tier in ('always', 'usually', 'regular')),
  section           text not null default 'other',
  regular_quantity  text,
  shelf_life_days   smallint,
  last_confirmed_at timestamptz,
  created_at        timestamptz not null default now()
);
create unique index on forkcast.pantry_items (household_id, lower(name));

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
create table forkcast.plans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references forkcast.households(id) on delete cascade,
  start_date   date not null,
  length_days  smallint not null check (length_days in (7, 14)),
  status       text not null default 'draft' check (status in ('draft', 'active', 'done')),
  notes        text,
  created_at   timestamptz not null default now(),
  unique (household_id, start_date)
);

create table forkcast.plan_slots (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references forkcast.households(id) on delete cascade,
  plan_id             uuid not null references forkcast.plans(id) on delete cascade,
  date                date not null,
  slot_type           text not null default 'cook' check (slot_type in ('cook', 'leftovers', 'takeaway', 'out')),
  meal_id             uuid references forkcast.meals(id) on delete set null,
  variation_id        uuid references forkcast.meal_variations(id) on delete set null,
  cook_member_id      uuid references forkcast.members(id) on delete set null,
  leftovers_of_slot_id uuid references forkcast.plan_slots(id) on delete set null,
  is_busy_night       boolean not null default false,
  note                text,
  unique (plan_id, date)
);

-- ---------------------------------------------------------------------------
-- What we actually ate + feedback
-- ---------------------------------------------------------------------------
create table forkcast.meal_log (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references forkcast.households(id) on delete cascade,
  date           date not null,
  slot_type      text not null default 'cook' check (slot_type in ('cook', 'leftovers', 'takeaway', 'out')),
  meal_id        uuid references forkcast.meals(id) on delete set null,
  variation_id   uuid references forkcast.meal_variations(id) on delete set null,
  cook_member_id uuid references forkcast.members(id) on delete set null,
  plan_slot_id   uuid references forkcast.plan_slots(id) on delete set null,
  make_again     text check (make_again in ('yes', 'maybe', 'no')),
  notes          text,
  created_at     timestamptz not null default now(),
  unique (household_id, date)
);
create index on forkcast.meal_log (meal_id, date desc);

create table forkcast.meal_feedback (
  household_id uuid not null references forkcast.households(id) on delete cascade,
  log_id       uuid not null references forkcast.meal_log(id) on delete cascade,
  member_id    uuid not null references forkcast.members(id) on delete cascade,
  rating       smallint not null check (rating in (-1, 0, 1)),
  primary key (log_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Shopping
-- ---------------------------------------------------------------------------
create table forkcast.shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references forkcast.households(id) on delete cascade,
  plan_id      uuid references forkcast.plans(id) on delete set null,
  kind         text not null default 'main' check (kind in ('main', 'top_up', 'adhoc')),
  shop_on      date,
  status       text not null default 'open' check (status in ('open', 'done')),
  created_at   timestamptz not null default now()
);

create table forkcast.shopping_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references forkcast.households(id) on delete cascade,
  list_id      uuid not null references forkcast.shopping_lists(id) on delete cascade,
  name         text not null,
  quantity     text,
  section      text not null default 'other',
  source       text not null default 'manual' check (source in ('meal', 'regular', 'manual')),
  meal_ids     uuid[] not null default '{}',
  checked      boolean not null default false,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);
create index on forkcast.shopping_items (list_id);

-- ---------------------------------------------------------------------------
-- Derived: per-meal history for rotation and the library
-- ---------------------------------------------------------------------------
create view forkcast.meal_stats with (security_invoker = true) as
select
  m.id as meal_id,
  m.household_id,
  count(l.id) filter (where l.slot_type = 'cook')                         as times_cooked,
  max(l.date)                                                             as last_cooked,
  (current_date - max(l.date))                                            as days_since,
  round(avg(f.rating)::numeric, 2)                                        as avg_rating,
  (array_agg(l.make_again order by l.date desc) filter (where l.make_again is not null))[1] as latest_make_again
from forkcast.meals m
left join forkcast.meal_log l on l.meal_id = m.id
left join forkcast.meal_feedback f on f.log_id = l.id
group by m.id, m.household_id;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function forkcast.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create trigger meals_touch before update on forkcast.meals
  for each row execute function forkcast.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table forkcast.households enable row level security;
create policy "members read household" on forkcast.households
  for select to authenticated using (id in (select forkcast.my_household_ids()));
create policy "members update household" on forkcast.households
  for update to authenticated using (id in (select forkcast.my_household_ids()));

alter table forkcast.household_users enable row level security;
create policy "see own household's users" on forkcast.household_users
  for select to authenticated using (household_id in (select forkcast.my_household_ids()));

do $$
declare t text;
begin
  foreach t in array array[
    'members', 'meals', 'meal_variations', 'meal_cooks', 'meal_ingredients',
    'pantry_items', 'plans', 'plan_slots', 'meal_log', 'meal_feedback',
    'shopping_lists', 'shopping_items'
  ] loop
    execute format('alter table forkcast.%I enable row level security', t);
    execute format(
      'create policy "household access" on forkcast.%I for all to authenticated
         using (household_id in (select forkcast.my_household_ids()))
         with check (household_id in (select forkcast.my_household_ids()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Grants (RLS gates rows; anon gets nothing)
-- ---------------------------------------------------------------------------
grant usage on schema forkcast to authenticated, service_role;
grant all on all tables in schema forkcast to authenticated, service_role;
alter default privileges in schema forkcast grant all on tables to authenticated, service_role;

-- Live shopping list sync between phones.
alter publication supabase_realtime add table forkcast.shopping_items;

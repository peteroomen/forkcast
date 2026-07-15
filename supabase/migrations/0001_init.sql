-- Forkcast — initial schema
-- Lives in its own Postgres schema `forkcast` inside the shared `personal-apps`
-- Supabase project (schema-per-app convention). Shared auth.users; every row is
-- owner-scoped and gated by RLS so tenants never see each other's data.
--
-- Non-destructive to `public` (budget-app) and `stacks` (album tracker):
-- this only CREATEs the forkcast schema and its objects.

create schema if not exists forkcast;

-- ---------------------------------------------------------------------------
-- cooks
-- ---------------------------------------------------------------------------
create table if not exists forkcast.cooks (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  -- 0 = Monday ... 6 = Sunday. null = no fixed night.
  default_night smallint check (default_night between 0 and 6),
  role          text not null default 'cook' check (role in ('planner', 'cook')),
  created_at    timestamptz not null default now(),
  unique (owner_id, name)
);
create index if not exists cooks_owner_idx on forkcast.cooks (owner_id);

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
create table if not exists forkcast.recipes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  cuisine       text,
  source_url    text,
  time_minutes  integer check (time_minutes > 0),
  servings      integer not null default 4 check (servings > 0),
  ingredients   jsonb not null default '[]'::jsonb, -- [{name,qty,unit,category}]
  method        text,
  tags          text[] not null default '{}',
  notes         text,
  cooked_by     text not null default 'anyone'
                  check (cooked_by in ('peter', 'megan', 'jamie', 'anyone')),
  is_favourite  boolean not null default false,
  needs_recipe  boolean not null default false, -- "recipe owed" state (§10)
  created_at    timestamptz not null default now(),
  unique (owner_id, name)
);
create index if not exists recipes_owner_idx on forkcast.recipes (owner_id);
create index if not exists recipes_tags_idx on forkcast.recipes using gin (tags);

-- ---------------------------------------------------------------------------
-- plans + plan_days
-- ---------------------------------------------------------------------------
create table if not exists forkcast.plans (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  fortnight_start date not null, -- a Monday
  status          text not null default 'draft'
                    check (status in ('draft', 'published')),
  created_at      timestamptz not null default now(),
  unique (owner_id, fortnight_start)
);
create index if not exists plans_owner_idx on forkcast.plans (owner_id);

create table if not exists forkcast.plan_days (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  plan_id    uuid not null references forkcast.plans (id) on delete cascade,
  date       date not null,
  slot_type  text not null default 'meal'
               check (slot_type in ('meal', 'takeaway', 'leftover', 'games-night')),
  recipe_id  uuid references forkcast.recipes (id) on delete set null,
  cook_id    uuid references forkcast.cooks (id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists plan_days_owner_idx on forkcast.plan_days (owner_id);
create index if not exists plan_days_plan_idx on forkcast.plan_days (plan_id);

-- ---------------------------------------------------------------------------
-- pantry_items
-- ---------------------------------------------------------------------------
create table if not exists forkcast.pantry_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  category   text not null default 'Other'
               check (category in ('Produce','Meat & Fish','Dairy & Eggs','Pantry','Frozen','Other')),
  qty        text,
  status     text not null default 'in-stock'
               check (status in ('in-stock', 'low', 'out')),
  is_staple  boolean not null default false,
  is_food    boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);
create index if not exists pantry_owner_idx on forkcast.pantry_items (owner_id);

-- ---------------------------------------------------------------------------
-- shopping_items
-- ---------------------------------------------------------------------------
create table if not exists forkcast.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  plan_id    uuid references forkcast.plans (id) on delete cascade,
  name       text not null,
  category   text not null default 'Other'
               check (category in ('Produce','Meat & Fish','Dairy & Eggs','Pantry','Frozen','Other')),
  qty        text,
  done       boolean not null default false,
  source     text not null default 'generated'
               check (source in ('generated', 'manual')),
  created_at timestamptz not null default now()
);
create index if not exists shopping_owner_idx on forkcast.shopping_items (owner_id);
create index if not exists shopping_plan_idx on forkcast.shopping_items (plan_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only on EVERY table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'cooks','recipes','plans','plan_days','pantry_items','shopping_items'
  ]
  loop
    execute format('alter table forkcast.%I enable row level security;', t);
    execute format('drop policy if exists "own %1$s" on forkcast.%1$I;', t);
    execute format($f$
      create policy "own %1$s" on forkcast.%1$I
        for all
        using (auth.uid() = owner_id)
        with check (auth.uid() = owner_id);
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Grants — let PostgREST/API roles reach the schema (RLS still gates rows;
-- anon has no auth.uid() so it reads nothing).
-- ---------------------------------------------------------------------------
grant usage on schema forkcast to anon, authenticated, service_role;
grant all on all tables    in schema forkcast to anon, authenticated, service_role;
grant all on all sequences in schema forkcast to anon, authenticated, service_role;
alter default privileges in schema forkcast grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema forkcast grant all on sequences to anon, authenticated, service_role;

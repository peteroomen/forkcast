-- Forkcast — initial schema
-- Single-owner data model: every table carries owner_id -> auth.users, with
-- RLS policies `using (auth.uid() = owner_id)`. Designed for multi-user later
-- (each cook logs in with their own uuid) without a schema change.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (kept as text + CHECK to mirror the Zod enums 1:1 and stay migratable)
-- ---------------------------------------------------------------------------
-- category: Produce | Meat & Fish | Dairy & Eggs | Pantry | Frozen | Other
-- cook_key: peter | megan | jamie | anyone
-- slot_type: meal | takeaway | leftover | games-night
-- pantry_status: in-stock | low | out
-- plan_status: draft | published
-- cook_role: planner | cook

-- ---------------------------------------------------------------------------
-- cooks
-- ---------------------------------------------------------------------------
create table if not exists public.cooks (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  -- 0 = Monday ... 6 = Sunday. null = no fixed night.
  default_night smallint check (default_night between 0 and 6),
  role          text not null default 'cook' check (role in ('planner', 'cook')),
  created_at    timestamptz not null default now(),
  unique (owner_id, name)
);

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  cuisine       text,
  source_url    text,
  time_minutes  integer check (time_minutes > 0),
  servings      integer not null default 4 check (servings > 0),
  -- ingredients: [{ name, qty, unit, category }]
  ingredients   jsonb not null default '[]'::jsonb,
  method        text,
  tags          text[] not null default '{}',
  notes         text,
  cooked_by     text not null default 'anyone'
                  check (cooked_by in ('peter', 'megan', 'jamie', 'anyone')),
  is_favourite  boolean not null default false,
  -- "recipe missing" state — planned by name, details still owed (handoff §10)
  needs_recipe  boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (owner_id, name)
);

create index if not exists recipes_owner_idx on public.recipes (owner_id);
create index if not exists recipes_tags_idx on public.recipes using gin (tags);

-- ---------------------------------------------------------------------------
-- plans + plan_days
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  fortnight_start date not null, -- a Monday
  status          text not null default 'draft'
                    check (status in ('draft', 'published')),
  created_at      timestamptz not null default now(),
  unique (owner_id, fortnight_start)
);

create table if not exists public.plan_days (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  plan_id    uuid not null references public.plans (id) on delete cascade,
  date       date not null,
  slot_type  text not null default 'meal'
               check (slot_type in ('meal', 'takeaway', 'leftover', 'games-night')),
  recipe_id  uuid references public.recipes (id) on delete set null,
  cook_id    uuid references public.cooks (id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists plan_days_plan_idx on public.plan_days (plan_id);

-- ---------------------------------------------------------------------------
-- pantry_items
-- ---------------------------------------------------------------------------
create table if not exists public.pantry_items (
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

-- ---------------------------------------------------------------------------
-- shopping_items
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  plan_id    uuid references public.plans (id) on delete cascade,
  name       text not null,
  category   text not null default 'Other'
               check (category in ('Produce','Meat & Fish','Dairy & Eggs','Pantry','Frozen','Other')),
  qty        text,
  done       boolean not null default false,
  source     text not null default 'generated'
               check (source in ('generated', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_plan_idx on public.shopping_items (plan_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only access on every table
-- ---------------------------------------------------------------------------
alter table public.cooks          enable row level security;
alter table public.recipes        enable row level security;
alter table public.plans          enable row level security;
alter table public.plan_days      enable row level security;
alter table public.pantry_items   enable row level security;
alter table public.shopping_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'cooks','recipes','plans','plan_days','pantry_items','shopping_items'
  ]
  loop
    execute format($f$
      create policy %1$s_owner_all on public.%1$s
        for all
        using (auth.uid() = owner_id)
        with check (auth.uid() = owner_id);
    $f$, t);
  end loop;
end $$;

# ADR 001: Forkcast lives in its own schema in the shared personal-apps DB

Date: 2026-07-15
Status: Accepted

## Context

Forkcast needs a Postgres/Auth backend. Rather than spin up a dedicated
Supabase project, it reuses Peter's shared **`personal-apps`** project
(ref `ynsywxqgtsubzhibdjdz`, formerly "budget-app") which already hosts
multiple personal apps. That project follows a **schema-per-app** convention:

| Schema   | App           |
| -------- | ------------- |
| `public` | budget-app    |
| `stacks` | album tracker |
| `forkcast` | this app    |

Shared `auth.users`; each app's rows are owner-scoped and gated by RLS so
tenants never see each other's data.

## Decision

All Forkcast tables live in a dedicated **`forkcast`** schema (not table
prefixes in `public`). Following the shared-DB recipe:

- Every table has `owner_id → auth.users` + RLS `using (auth.uid() = owner_id)`.
- Schema-level grants to `anon, authenticated, service_role` (RLS still gates
  rows; anon has no `auth.uid()` so reads nothing).
- The schema is exposed to PostgREST by appending `forkcast` to
  `pgrst.db_schemas` (kept `public, graphql_public, stacks` intact).
- All Supabase clients set `db: { schema: "forkcast" }` once, centrally.
- Seeding resolves the owner by email at apply-time (no hardcoded uuid).

## Consequences

- **Isolation without a new project**: budget-app and stacks are untouched;
  Forkcast can't collide with their table names.
- **One-line client config**: `.from("recipes")` resolves inside `forkcast`.
- **Gotchas inherited** from the shared-DB handoff: any future
  `security definer` function must pin `search_path`; generic function names
  must be schema-qualified; never weaken owner RLS on the shared `auth.users`.
- **Env is keyed off the project ref**, not the name — the "budget-app →
  personal-apps" rename doesn't affect anything.

# Forkcast

Family dinner planning for a household where one person does most of the cooking
and others take the odd night. Remembers what we've eaten and how it went, keeps
variety up with a rotation, and (coming next) turns a fortnight plan into a
shopping list.

## What's here (v2, in progress)

- **Meal library**: meals are either *from my head* (notes + ingredients) or *from a
  recipe* (linked source). Meals can have **variations** (e.g. Mince & Rice:
  Moroccan / Indian / Mexican) that share rotation but keep their own ingredients.
- **Rotation**: each meal has a "how often" target; the library sorts by what's due.
- **Import from a link**: reads schema.org recipe data (RecipeTin Eats and most
  sites), converts to NZ names/metric, scales to the household.
- **At-the-table feedback**: "We had this" logs the dinner, who cooked, a
  👍/😐/👎 per person, make-again, and notes.
- **Settings**: weekly or fortnightly cycle, start day, servings, household members.

Next: fortnight planner (claimed nights, leftovers/takeaway nights) → shopping list
(main shop + mid-fortnight top-up, pantry check).

## Stack

Next.js 15 (App Router, server actions) · Tailwind 4 · Supabase (Postgres, Auth, RLS).

## Database

Lives in the `forkcast` schema of the shared personal-apps Supabase project
(ref `ynsywxqgtsubzhibdjdz`). Everything is household-scoped; RLS checks
membership through `forkcast.my_household_ids()`. v1 tables were kept as
`forkcast_v1` (not exposed to the API) and imported by `0002_import_v1.sql`.

Migrations in `supabase/migrations` were applied in order.

## Development

```bash
pnpm install
cp .env.example .env.local   # fill in the anon key
pnpm dev
pnpm test                    # ingredient parser + recipe import
```

Sign-in is Google or email magic link (existing accounts only). Add the deploy
URL + `/auth/callback` to Supabase Auth redirect URLs.

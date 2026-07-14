# 🍴 Forkcast

A persistent, family-facing web app for **fortnightly dinner planning**. The
recipe library, meal history, pantry, and shopping list live in a real
database instead of a chat assistant's memory — so planning a fortnight takes
minutes, not a conversation.

Built for one household (single-owner data model), designed so extra family
logins (Google SSO) are a cheap add later.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first) + **daisyUI 5** — `garden` theme (with
  `forest` as the dark companion)
- **Supabase** — Postgres + Row Level Security + Auth (Google SSO + magic link)
- **Vercel AI SDK** (`ai` v4) + `@ai-sdk/anthropic` for server-side meal
  suggestions (model `claude-sonnet-4-6`)
- **Zod** for schema validation at every edge
- Mobile-first: bottom tab bar, big touch targets, one-handed shopping list

## What's built

| Surface        | Route        | Notes                                                        |
| -------------- | ------------ | ------------------------------------------------------------ |
| Home           | `/`          | Plan status, quick tiles, "recipes owed" nudge               |
| Planner        | `/planner`   | 14-day grid, cook-night auto-fill, per-day AI suggest, publish |
| Recipe Library | `/library`   | Search/filter, structured ingredients, celery auto-flag      |
| Shopping       | `/shopping`  | Auto-generated + consolidated, categorised, one-hand check-off |
| Pantry         | `/pantry`    | in-stock / low / out; push low items to the list             |
| Discover       | `/discover`  | Swipe-card quiz → favourites                                  |
| History        | `/history`   | Published fortnights (feeds repeat-avoidance)                |
| Settings       | `/settings`  | Editable cook nights + house rules                           |

### House rules baked in (`src/lib/constants.ts`)

No celery (auto-flagged + substitutes) · Jamie's nights ≤30 min · games night is
a shopping-list item, not a slot · side pairings (sourdough/garlic bread) ·
kransky+saveloy same-week clash detection · seafood = treat not dinner ·
big-lift → Sunday · **never invent a recipe** (the AI only suggests names that
exist in the library; unknown suggestions are rejected server-side).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in the values (see runbook below)
pnpm dev                     # http://localhost:3000
```

Scripts: `pnpm typecheck` · `pnpm lint` · `pnpm build` · `pnpm seed`

## Deploy runbook

1. **Create a Supabase project.**
2. **Run the migration** — paste `supabase/migrations/0001_init.sql` into the
   Supabase SQL editor (or `supabase db push` with the CLL). Creates all tables,
   RLS policies, and indexes.
3. **Create the owner user** — Supabase → Auth → Users → add Peter (or sign in
   once via the app). Copy the user's UUID.
4. **Fill `.env.local`** from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `OWNER_ID` = the UUID from step 3
   - `ANTHROPIC_API_KEY`
5. **Seed the library** — `pnpm seed`. Idempotent (safe to re-run); stamps every
   row with `OWNER_ID` and upserts ~90 recipes, 3 cooks, and pantry staples.
6. **Enable Google OAuth** (optional for MVP) — Supabase → Auth → Providers →
   Google. Add `https://<your-domain>/auth/callback` as a redirect URL.
7. **Push to GitHub, import to Vercel**, add the same env vars, deploy.

> Cook nights seed as **Jamie = Tuesday, Megan = Saturday** (editable in
> Settings — they shift often, so they're data, not constants).

## Architecture notes

- **Single-owner + RLS**: every table has `owner_id → auth.users`, policies are
  `using (auth.uid() = owner_id)`. Multi-user is a data change, not a schema one.
- **AI grounding (RAG-lite)**: `src/lib/digest.ts` builds a compact digest
  (library names + tags + planned/recent) and injects it into the system
  prompt. The route (`/api/ai/suggest`) rejects any suggested meal not in the
  library — the model never invents a dish or ingredients.
- **Server-side AI key**: the Anthropic key lives only in the route handler,
  never the browser (unlike the throwaway prototypes).

## Roadmap (from the handoff)

Phase 1 (core) and much of Phase 2/3 are in. Deferred: external recipe-URL
import + auto-parse, ingredient scaling to serving size, seasonal suggestions,
per-member logins/views, and a future **Megan lunch planner** (swipe lunch quiz,
no seafood, pack-ahead — 2 lunches + 2 sandwich days).

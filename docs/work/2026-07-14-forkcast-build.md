# Forkcast — initial full build

**Date:** 2026-07-14
**Roadmap item:** Phase 1 (core) + most of Phase 2/3, in one build (rules
broken deliberately at the owner's request — "build the entire app").

## Goal

Replace the ad-hoc fortnightly meal-planning conversation with a persistent,
mobile-first web app: recipe library, planner, shopping list, pantry, discovery
quiz, history, and a server-side AI suggestion feature — all backed by Supabase.

## Approach

- Next.js 15 App Router (chosen over the handoff's Vite so the Anthropic key
  stays server-side in a route handler with no separate serverless setup).
- daisyUI 5 `garden` theme (owner request) + `forest` dark companion.
- Single-owner data model + RLS throughout; single-user MVP, designed for multi.
- House rules encoded in `src/lib/constants.ts` and enforced in UI + the AI route.
- Structured ingredients so shopping-list consolidation is mechanical.
- AI grounding via a compact digest; the route rejects any suggested meal that
  isn't already in the library (never invent recipes).

## Steps

- [x] Scaffold (Next 15, TS strict, Tailwind v4 + daisyUI garden)
- [x] Supabase migration (6 tables, RLS, indexes) + Zod types
- [x] Seed data from handoff §8 (~90 recipes, cooks, pantry) + idempotent script
- [x] Server data layer + all server actions
- [x] Pages: Home, Planner, Library, Shopping, Pantry, Discover, History, Settings
- [x] Auth (magic link + Google OAuth), middleware gate, callback
- [x] Server-side AI suggestion route with library-only enforcement
- [x] typecheck + lint + build all green; login smoke-tested

## Manual test steps

- [ ] Run the deploy runbook (Supabase project, migration, seed).
- [ ] Sign in (magic link) → land on Home.
- [ ] Planner → Start planning → confirm Jamie (Tue) & Megan (Sat) auto-fill.
- [ ] Assign a meal via picker; press ✨ for an AI suggestion on a Jamie night
      → verify it only offers ≤30-min library meals.
- [ ] Generate shopping list → categorised, consolidated, lemons/herbs skipped.
- [ ] Edge: add a recipe with "celery" → expect the no-celery flag everywhere.
- [ ] Edge: schedule kransky + saveloy same week → expect the clash banner.
- [ ] Publish → appears in History.
- [ ] Mobile: check bottom tab bar + one-handed shopping check-off.

## What actually happened

Built end-to-end in one session per the owner's "build the entire app" call.
Chose tap-to-assign (mobile-friendly) over desktop drag-and-drop for the planner.
The AI route is defensive: validates JSON shape with Zod and rejects
out-of-library suggestions with a 422.

## Files created / modified

Whole project (see `README.md`). Key: `src/lib/{constants,types,digest,
shopping,actions,data}.ts`, `src/app/api/ai/suggest/route.ts`,
`supabase/migrations/0001_init.sql`, `scripts/seed.ts`, and all page/component
trees under `src/app` and `src/components`.

## Deferred to next session

External recipe-URL import + auto-parse (celery-flag on import), ingredient
scaling to serving size, seasonal suggestions, per-member logins/views, and the
Megan lunch planner. Confirm the still-owed recipes with Peter (§10).

## Status

- [x] Complete (Phase 1 + most of 2/3); deploy runbook pending owner run.

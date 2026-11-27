-- Shopping list details: pantry "got this?" checks, and when fresh things were bought.
alter table forkcast.shopping_items
  -- A "usually have" pantry item waiting for a have/need answer.
  add column if not exists needs_check boolean not null default false,
  -- Answered "we've got it": kept for reference, hidden from the list.
  add column if not exists have boolean not null default false,
  -- When it was ticked off in the shop (fresh-food reminders count from here).
  add column if not exists checked_at timestamptz,
  add column if not exists note text;

-- One main list and one top-up per plan.
create unique index if not exists shopping_lists_plan_kind on forkcast.shopping_lists (plan_id, kind) where plan_id is not null;

alter table forkcast.shopping_lists add column if not exists built_at timestamptz;

-- Realtime needs the full row on updates for filtered subscriptions.
alter table forkcast.shopping_items replica identity full;

notify pgrst, 'reload schema';

-- Total time in minutes (planner uses it for busy nights). Backfilled from v1.
alter table forkcast.meals add column if not exists total_minutes smallint check (total_minutes > 0);

update forkcast.meals m set total_minutes = r.time_minutes
from forkcast_v1.recipes r
where m.legacy_id = r.id and r.time_minutes > 0 and m.total_minutes is null;

update forkcast.meals set total_minutes = 40
where name = 'Mince & Rice' and total_minutes is null;

notify pgrst, 'reload schema';

-- v1 used plural units in a few rows; the app's canonical unit is singular.
update forkcast.meal_ingredients set unit = 'clove' where unit = 'cloves';

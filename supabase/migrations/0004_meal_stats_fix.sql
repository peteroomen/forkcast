-- times_cooked was multiplied by the number of feedback rows; aggregate ratings separately.
create or replace view forkcast.meal_stats with (security_invoker = true) as
with logs as (
  select meal_id,
         count(*) filter (where slot_type = 'cook') as times_cooked,
         max(date) as last_cooked,
         (array_agg(make_again order by date desc) filter (where make_again is not null))[1] as latest_make_again
  from forkcast.meal_log
  where meal_id is not null
  group by meal_id
),
ratings as (
  select l.meal_id, round(avg(f.rating)::numeric, 2) as avg_rating
  from forkcast.meal_feedback f
  join forkcast.meal_log l on l.id = f.log_id
  group by l.meal_id
)
select
  m.id as meal_id,
  m.household_id,
  coalesce(lg.times_cooked, 0) as times_cooked,
  lg.last_cooked,
  ((now() at time zone 'Pacific/Auckland')::date - lg.last_cooked) as days_since,  -- household is in NZ
  r.avg_rating,
  lg.latest_make_again
from forkcast.meals m
left join logs lg on lg.meal_id = m.id
left join ratings r on r.meal_id = m.id;

import "server-only";
import { requireHousehold } from "./data";
import { addDays, localDate } from "./notifications";
import type { PlannerMeal, SlotType } from "./planner";

export interface PlanSlot {
  id: string;
  plan_id: string;
  date: string;
  slot_type: SlotType;
  meal_id: string | null;
  variation_id: string | null;
  cook_member_id: string | null;
  leftovers_of_slot_id: string | null;
  is_busy_night: boolean;
  note: string | null;
}

export interface Plan {
  id: string;
  start_date: string;
  length_days: 7 | 14;
  status: "draft" | "active" | "done";
  slots: PlanSlot[];
}

export interface PlanMeal extends PlannerMeal {
  kind: "head" | "recipe";
  prep_note: string | null;
  variations: { id: string; name: string }[];
}

export interface PlanPageData {
  today: string;
  primaryCookId: string | null;
  plans: Plan[];
  /** Where a new plan would start by default. */
  nextStart: string;
  meals: PlanMeal[];
  /** Last date each variation was cooked. */
  variationLast: Record<string, string>;
  /** Dates (in shown plans) that already have a meal logged. */
  logged: Record<string, { meal_id: string | null }>;
}

/** The plan covering today plus any upcoming one, with everything the editor needs. */
export async function getPlanPage(): Promise<PlanPageData> {
  const { supabase, household, members } = await requireHousehold();
  const today = localDate(new Date(), household.timezone);
  const hid = household.id;

  const [plansRes, mealsRes, cooksRes, varsRes, statsRes, logRes] = await Promise.all([
    supabase.from("plans").select("*, plan_slots(*)").eq("household_id", hid).gte("start_date", addDays(today, -13)).order("start_date"),
    supabase.from("meals").select("*").eq("household_id", hid).eq("archived", false).order("name"),
    supabase.from("meal_cooks").select("meal_id, member_id").eq("household_id", hid),
    supabase.from("meal_variations").select("id, meal_id, name, sort_order").eq("household_id", hid).eq("archived", false).order("sort_order"),
    supabase.from("meal_stats").select("*").eq("household_id", hid),
    supabase.from("meal_log").select("date, meal_id, variation_id").eq("household_id", hid).gte("date", addDays(today, -365)),
  ]);

  const plans: Plan[] = (plansRes.data ?? [])
    .map(({ plan_slots, ...p }) => ({ ...p, slots: [...(plan_slots as PlanSlot[])].sort((a, b) => a.date.localeCompare(b.date)) }) as Plan)
    .filter((p) => addDays(p.start_date, p.length_days) > today); // still running or upcoming

  const cookMap = new Map<string, string[]>();
  for (const c of cooksRes.data ?? []) cookMap.set(c.meal_id, [...(cookMap.get(c.meal_id) ?? []), c.member_id]);
  const varMap = new Map<string, { id: string; name: string }[]>();
  for (const v of varsRes.data ?? []) varMap.set(v.meal_id, [...(varMap.get(v.meal_id) ?? []), { id: v.id, name: v.name }]);
  const statMap = new Map((statsRes.data ?? []).map((s) => [s.meal_id, s]));

  const meals: PlanMeal[] = (mealsRes.data ?? []).map((m) => {
    const s = statMap.get(m.id);
    return {
      id: m.id, name: m.name, kind: m.kind, course: m.course, effort: m.effort, total_minutes: m.total_minutes,
      weeknight_ok: m.weeknight_ok, fresh_heavy: m.fresh_heavy, batch_friendly: m.batch_friendly, protein: m.protein,
      cuisine: m.cuisine, target_interval_days: m.target_interval_days, prep_note: m.prep_note,
      cook_ids: cookMap.get(m.id) ?? [], variations: varMap.get(m.id) ?? [],
      days_since: s?.days_since ?? null, avg_rating: s?.avg_rating == null ? null : Number(s.avg_rating),
      latest_make_again: s?.latest_make_again ?? null,
    };
  });

  const variationLast: Record<string, string> = {};
  const logged: Record<string, { meal_id: string | null }> = {};
  for (const l of logRes.data ?? []) {
    if (l.variation_id && (variationLast[l.variation_id] ?? "") < l.date) variationLast[l.variation_id] = l.date;
    logged[l.date] = { meal_id: l.meal_id };
  }

  const last = plans[plans.length - 1];
  const nextStart = last ? addDays(last.start_date, last.length_days) : today;
  const primaryCookId = members.find((m) => m.is_cook)?.id ?? null;

  return { today, primaryCookId, plans, nextStart, meals, variationLast, logged };
}

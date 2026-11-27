/**
 * The meal planner's brain: ranks meals for a night given rotation history,
 * ratings, who's cooking, how busy the night is and what else is in the plan.
 * Pure and deterministic (a seed varies ties) so it can be tested.
 */
import { addDays } from "./notifications";

export type SlotType = "cook" | "leftovers" | "takeaway" | "out";

export interface PlannerMeal {
  id: string;
  name: string;
  course: "main" | "side" | "dessert";
  effort: "quick" | "medium" | "project";
  total_minutes: number | null;
  weeknight_ok: boolean;
  fresh_heavy: boolean;
  batch_friendly: boolean;
  protein: string | null;
  cuisine: string | null;
  target_interval_days: number | null;
  cook_ids: string[];
  /** Days since last cooked, as of today. null = never logged. */
  days_since: number | null;
  avg_rating: number | null;
  latest_make_again: "yes" | "maybe" | "no" | null;
}

export interface PlannerDay {
  date: string; // yyyy-mm-dd
  slot_type: SlotType;
  cook_member_id: string | null;
  is_busy_night: boolean;
  meal_id: string | null;
}

export interface PlannerContext {
  today: string;
  /** The household's main cook; their nights can use "anyone" meals. */
  primaryCookId: string | null;
  memberNames: Record<string, string>;
  seed?: number;
}

export interface Ranked {
  meal_id: string;
  score: number;
  reasons: string[];
  /** Had too recently to suggest automatically; still pickable by hand. */
  tooRecent: boolean;
}

const DEFAULT_INTERVAL = 30;

export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

const isWeekend = (date: string) => [0, 6].includes(dayOfWeek(date)); // Sat, Sun
const isFriSatSun = (date: string) => [5, 6, 0].includes(dayOfWeek(date));

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);
}

function weeksLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/** Small deterministic jitter so equal meals don't always come out in the same order. */
function jitter(key: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000 * 0.2;
}

/** Which meals this cook can be given: their own, or "anyone" meals for the main cook. */
function cookCanMake(meal: PlannerMeal, cookId: string | null, primaryCookId: string | null): boolean {
  if (!cookId || cookId === primaryCookId) {
    return meal.cook_ids.length === 0 || (primaryCookId !== null && meal.cook_ids.includes(primaryCookId));
  }
  return meal.cook_ids.includes(cookId);
}

/**
 * Rank every eligible meal for day [index] of [days]. Meals already planned on
 * other days are excluded. Highest score first.
 */
export function rankMeals(days: PlannerDay[], index: number, meals: PlannerMeal[], ctx: PlannerContext): Ranked[] {
  const day = days[index];
  const seed = ctx.seed ?? 0;
  const usedElsewhere = new Set(days.filter((_, i) => i !== index).map((d) => d.meal_id).filter(Boolean));
  const offset = Math.max(0, daysBetween(ctx.today, day.date));
  const neighbour = (delta: number) => {
    const d = days[index + delta];
    return d?.meal_id ? meals.find((m) => m.id === d.meal_id) ?? null : null;
  };
  const near = [neighbour(-1), neighbour(1)].filter(Boolean) as PlannerMeal[];
  const near2 = [neighbour(-2), neighbour(2)].filter(Boolean) as PlannerMeal[];
  const proteinCounts = new Map<string, number>();
  days.forEach((d, i) => {
    if (i === index || !d.meal_id) return;
    const p = meals.find((m) => m.id === d.meal_id)?.protein;
    if (p) proteinCounts.set(p, (proteinCounts.get(p) ?? 0) + 1);
  });
  const ownCookNight = day.cook_member_id !== null && day.cook_member_id !== ctx.primaryCookId;

  const out: Ranked[] = [];
  for (const m of meals) {
    if (m.course !== "main" || usedElsewhere.has(m.id) || m.latest_make_again === "no") continue;
    if (!cookCanMake(m, day.cook_member_id, ctx.primaryCookId)) continue;
    if (day.is_busy_night && m.effort === "project") continue;
    if (!m.weeknight_ok && !isFriSatSun(day.date)) continue;

    const reasons: string[] = [];
    let score = 0;
    const target = m.target_interval_days ?? DEFAULT_INTERVAL;
    const since = m.days_since === null ? null : m.days_since + offset;
    let tooRecent = false;

    if (since === null) {
      score += 0.7;
      reasons.push("Not logged yet");
    } else {
      const ratio = since / target;
      score += Math.min(ratio, 2.5);
      if (ratio < 0.5) tooRecent = true;
      const when = weeksLabel(since);
      reasons.push(ratio >= 1 ? `Due: last had ${when}` : since <= 1 ? `Had ${when}` : `Last had ${when}`);
    }

    if (m.avg_rating !== null) {
      score += m.avg_rating * 0.6;
      if (m.avg_rating >= 0.5) reasons.push("Family 👍");
      else if (m.avg_rating < 0) reasons.push("Mixed reviews");
    }
    if (m.latest_make_again === "yes") score += 0.2;
    if (m.latest_make_again === "maybe") score -= 0.1;

    // Variety
    if (m.protein && near.some((n) => n.protein === m.protein)) score -= 0.7;
    if (m.cuisine && [...near, ...near2].some((n) => n.cuisine === m.cuisine)) score -= 0.35;
    if (m.protein && (proteinCounts.get(m.protein) ?? 0) >= 3) score -= 0.3 * ((proteinCounts.get(m.protein) ?? 0) - 2);

    // Fit the night
    if (day.is_busy_night) {
      if (m.effort === "quick") {
        score += 0.4;
        reasons.push("Quick for a busy night");
      } else if ((m.total_minutes ?? 40) > 45) score -= 0.5;
      else score -= 0.15;
    } else if (isWeekend(day.date) && m.effort === "project") {
      score += 0.35;
      reasons.push("Weekend cook");
    }
    if (m.fresh_heavy) {
      const pos = daysBetween(days[0].date, day.date);
      if (pos >= 7) score -= 0.6;
      else if (pos <= 3) {
        score += 0.15;
        reasons.push("Fresh: early in the fortnight");
      }
    }
    if (ownCookNight) {
      score += 0.3;
      reasons.push(`${ctx.memberNames[day.cook_member_id!] ?? "Their"} meal`);
    }
    if (tooRecent) score -= 3;

    score += jitter(m.id + day.date, seed);
    out.push({ meal_id: m.id, score, reasons, tooRecent });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Fill every cook night that has no meal, in date order, keeping meals that are
 * already chosen. Returns the meal id per day (null where nothing fits).
 */
export function suggestPlan(days: PlannerDay[], meals: PlannerMeal[], ctx: PlannerContext): (string | null)[] {
  const working = days.map((d) => ({ ...d }));
  // Busy nights and other cooks' nights first: they have the fewest options.
  const order = working
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.slot_type === "cook" && !d.meal_id)
    .sort((a, b) => constraint(b.d, ctx) - constraint(a.d, ctx) || a.i - b.i)
    .map(({ i }) => i);
  for (const i of order) {
    const best = rankMeals(working, i, meals, ctx).find((r) => !r.tooRecent) ?? null;
    working[i].meal_id = best?.meal_id ?? null;
  }
  return working.map((d) => (d.slot_type === "cook" ? d.meal_id : null));
}

function constraint(d: PlannerDay, ctx: PlannerContext): number {
  return (d.is_busy_night ? 2 : 0) + (d.cook_member_id && d.cook_member_id !== ctx.primaryCookId ? 3 : 0);
}

/** Dates for a plan starting on [start]. */
export function planDates(start: string, length: number): string[] {
  return Array.from({ length }, (_, i) => addDays(start, i));
}

/**
 * For a leftovers night, the most recent earlier cook night (within 3 days),
 * preferring meals that make good leftovers.
 */
export function leftoversSource(days: PlannerDay[], index: number, meals: PlannerMeal[]): number | null {
  let fallback: number | null = null;
  for (let i = index - 1; i >= Math.max(0, index - 3); i--) {
    const d = days[i];
    if (d.slot_type !== "cook" || !d.meal_id) continue;
    if (meals.find((m) => m.id === d.meal_id)?.batch_friendly) return i;
    fallback ??= i;
  }
  return fallback;
}

/** The variation to cook next: the one had least recently (never-had first). */
export function nextVariation(variationIds: string[], lastCooked: Record<string, string | undefined>): string | null {
  if (!variationIds.length) return null;
  return [...variationIds].sort((a, b) => (lastCooked[a] ?? "").localeCompare(lastCooked[b] ?? ""))[0];
}

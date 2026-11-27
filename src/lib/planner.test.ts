import { test } from "node:test";
import assert from "node:assert/strict";
import { leftoversSource, nextVariation, planDates, rankMeals, suggestPlan, type PlannerDay, type PlannerMeal } from "./planner";

const meal = (id: string, over: Partial<PlannerMeal> = {}): PlannerMeal => ({
  id, name: id, course: "main", effort: "medium", total_minutes: 40, weeknight_ok: true, fresh_heavy: false,
  batch_friendly: false, protein: null, cuisine: null, target_interval_days: 21, cook_ids: [], days_since: null,
  avg_rating: null, latest_make_again: null, ...over,
});

const PETER = "peter", MEGAN = "megan", JAMIE = "jamie";
const ctx = { today: "2026-11-28", primaryCookId: PETER, memberNames: { peter: "Peter", megan: "Megan", jamie: "Jamie" } };
const days = (n: number, start = "2026-11-28", over: Partial<PlannerDay>[] = []): PlannerDay[] =>
  planDates(start, n).map((date, i) => ({ date, slot_type: "cook", cook_member_id: PETER, is_busy_night: false, meal_id: null, ...over[i] }));

test("overdue favourites beat recent ones; too-recent are flagged", () => {
  const meals = [
    meal("recent", { days_since: 4, target_interval_days: 21 }),
    meal("overdue", { days_since: 40, target_interval_days: 21, avg_rating: 1 }),
    meal("ok", { days_since: 18 }),
  ];
  const r = rankMeals(days(1), 0, meals, ctx);
  assert.equal(r[0].meal_id, "overdue");
  assert.ok(r[0].reasons.some((x) => x.startsWith("Due")));
  assert.ok(r[0].reasons.includes("Family 👍"));
  assert.equal(r.find((x) => x.meal_id === "recent")!.tooRecent, true);
});

test("never suggests retired meals, sides, or the same meal twice", () => {
  const meals = [meal("a"), meal("retired", { latest_make_again: "no" }), meal("side", { course: "side" })];
  const plan = suggestPlan(days(3), meals, ctx);
  assert.deepEqual(plan.filter(Boolean), ["a"]);
});

test("other cooks get their own meals; main cook gets anyone/own meals", () => {
  const meals = [
    meal("pizza", { cook_ids: [MEGAN] }),
    meal("tacos", { cook_ids: [JAMIE] }),
    meal("roast", { cook_ids: [PETER] }),
    meal("anyone"),
  ];
  const d = days(3, "2026-11-28", [{ cook_member_id: MEGAN }, { cook_member_id: JAMIE }, {}]);
  const plan = suggestPlan(d, meals, ctx);
  assert.equal(plan[0], "pizza");
  assert.equal(plan[1], "tacos");
  assert.ok(["roast", "anyone"].includes(plan[2]!));
  assert.ok(rankMeals(d, 0, meals, ctx)[0].reasons.includes("Megan meal"));
});

test("busy nights get quick meals and never weekend projects", () => {
  const meals = [meal("project", { effort: "project", days_since: 90 }), meal("quick", { effort: "quick", days_since: 25 })];
  const d = days(1, "2026-12-01", [{ is_busy_night: true }]); // Tuesday
  const r = rankMeals(d, 0, meals, ctx);
  assert.deepEqual(r.map((x) => x.meal_id), ["quick"]);
  assert.ok(r[0].reasons.includes("Quick for a busy night"));
});

test("weekend-only meals stay off weeknights", () => {
  const meals = [meal("bourguignon", { weeknight_ok: false, effort: "project" })];
  assert.equal(rankMeals(days(1, "2026-12-01"), 0, meals, ctx).length, 0); // Tue
  assert.equal(rankMeals(days(1, "2026-11-29"), 0, meals, ctx).length, 1); // Sun
});

test("spreads proteins: no beef two nights running when there's a choice", () => {
  const meals = [
    meal("b1", { protein: "beef", days_since: 30 }),
    meal("b2", { protein: "beef", days_since: 30 }),
    meal("c1", { protein: "chicken", days_since: 25 }),
  ];
  const plan = suggestPlan(days(2), meals, ctx);
  const proteins = plan.map((id) => meals.find((m) => m.id === id)!.protein);
  assert.notEqual(proteins[0], proteins[1]);
});

test("fresh-heavy meals go in the first week", () => {
  const meals = [meal("salad", { fresh_heavy: true, days_since: 30 }), meal("stew", { days_since: 30 })];
  const d = days(14);
  const early = rankMeals(d, 1, meals, ctx);
  const late = rankMeals(d, 10, meals, ctx);
  assert.equal(early[0].meal_id, "salad");
  assert.equal(late[0].meal_id, "stew");
});

test("keeps chosen meals and skips non-cook nights", () => {
  const meals = [meal("a"), meal("b"), meal("c")];
  const d = days(3, "2026-11-28", [{ meal_id: "b" }, { slot_type: "takeaway" }, {}]);
  const plan = suggestPlan(d, meals, ctx);
  assert.equal(plan[0], "b");
  assert.equal(plan[1], null);
  assert.ok(plan[2] && plan[2] !== "b");
});

test("days-since accounts for how far ahead the night is", () => {
  // Had 10 days ago, 21-day target: too recent today, fine in 2 weeks.
  const meals = [meal("x", { days_since: 10 })];
  const d = days(14);
  assert.equal(rankMeals(d, 0, meals, ctx)[0].tooRecent, true);
  assert.equal(rankMeals(d, 13, meals, ctx)[0].tooRecent, false);
});

test("leftovers link back to the latest batch-friendly meal", () => {
  const meals = [meal("bolognese", { batch_friendly: true }), meal("tacos")];
  const d = days(4, "2026-11-28", [{ meal_id: "bolognese" }, { meal_id: "tacos" }, { slot_type: "leftovers" }, {}]);
  assert.equal(leftoversSource(d, 2, meals), 0);
});

test("next variation is the one had least recently", () => {
  assert.equal(nextVariation(["moroccan", "indian", "mexican"], { moroccan: "2026-11-01", indian: "2026-10-01" }), "mexican");
  assert.equal(nextVariation(["moroccan", "indian"], { moroccan: "2026-11-01", indian: "2026-10-01" }), "indian");
  assert.equal(nextVariation([], {}), null);
});

test("recent wording reads naturally", () => {
  assert.equal(rankMeals(days(1), 0, [meal("x", { days_since: 0 })], ctx)[0].reasons[0], "Had today");
  assert.equal(rankMeals(days(1), 0, [meal("x", { days_since: 1 })], ctx)[0].reasons[0], "Had yesterday");
});

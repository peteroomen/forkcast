import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays, isDue, localDate, localMinutes, planningMessage, prepMessage, tonightMessage, type PlanContext,
} from "./notifications";

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  today: "2026-12-03",
  meatFromFreezer: true,
  plans: [{ start_date: "2026-11-28", length_days: 14 }],
  slots: [
    { date: "2026-12-03", slot_type: "cook", meal_id: "pizza", variation_id: null, cook_member_id: "megan" },
    { date: "2026-12-04", slot_type: "cook", meal_id: "roast", variation_id: null, cook_member_id: "peter" },
    { date: "2026-12-05", slot_type: "takeaway", meal_id: null, variation_id: null, cook_member_id: null },
    { date: "2026-12-06", slot_type: "cook", meal_id: "mr", variation_id: "mexican", cook_member_id: null },
  ],
  meals: [
    { id: "pizza", name: "Butter Chicken Pizza", prep_note: null, prep_lead_hours: null },
    { id: "roast", name: "Roast Chicken", prep_note: "Dry-brine the chicken overnight", prep_lead_hours: 18 },
    { id: "mr", name: "Mince & Rice", prep_note: null, prep_lead_hours: null },
  ],
  ingredients: [
    { meal_id: "pizza", variation_id: null, name: "chicken breast", section: "meat_seafood" },
    { meal_id: "roast", variation_id: null, name: "whole chicken (~1.8kg)", section: "meat_seafood" },
    { meal_id: "roast", variation_id: null, name: "potatoes", section: "produce" },
    { meal_id: "mr", variation_id: null, name: "beef mince", section: "meat_seafood" },
    { meal_id: "mr", variation_id: "mexican", name: "chorizo", section: "meat_seafood" },
    { meal_id: "mr", variation_id: "indian", name: "lamb mince", section: "meat_seafood" },
  ],
  members: [{ id: "megan", name: "Megan" }, { id: "peter", name: "Peter" }],
  ...over,
});

test("tonight names the meal and the cook", () => {
  const n = tonightMessage(ctx())!;
  assert.equal(n.title, "Tonight: Butter Chicken Pizza");
  assert.equal(n.body, "Megan's cooking.");
  assert.equal(n.ref, "2026-12-03");
});

test("evening prep: meat out of the freezer + overnight prep", () => {
  const n = prepMessage(ctx())!;
  assert.equal(n.title, "Tomorrow: Roast Chicken (Peter)");
  assert.equal(n.body, "Take the whole chicken out of the freezer. Dry-brine the chicken overnight");
});

test("prep uses the planned variation's meat only", () => {
  const n = prepMessage(ctx({ today: "2026-12-05" }))!;
  assert.equal(n.body, "Take the beef mince and chorizo out of the freezer.");
});

test("no prep message for takeaway or when meat isn't frozen", () => {
  assert.equal(prepMessage(ctx({ today: "2026-12-04" })), null);
  assert.equal(prepMessage(ctx({ today: "2026-12-05", meatFromFreezer: false })), null);
});

test("takeaway night", () => assert.equal(tonightMessage(ctx({ today: "2026-12-05" }))!.title, "Takeaway night tonight"));

test("planning nudge when the next days aren't covered", () => {
  assert.equal(planningMessage(ctx(), 2), null);
  const n = planningMessage(ctx({ today: "2026-12-10" }), 2)!; // plan ends after 12-11
  assert.equal(n.ref, "2026-12-12");
  assert.match(n.body, /Sat 12 Dec/);
  assert.equal(planningMessage(ctx({ plans: [] }), 2)!.title, "Nothing planned for tonight");
});

test("date + time helpers", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  const now = new Date("2026-11-26T19:00:00Z"); // 8am NZDT on the 27th
  assert.equal(localDate(now, "Pacific/Auckland"), "2026-11-27");
  assert.equal(localMinutes(now, "Pacific/Auckland"), 8 * 60);
  assert.equal(isDue(8 * 60, "07:30"), true);
  assert.equal(isDue(7 * 60, "07:30"), false);
  assert.equal(isDue(11 * 60, "07:30"), false);
});

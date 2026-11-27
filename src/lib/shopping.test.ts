import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLists, normName, pantryCovers, type PantryEntry, type ShopIngredient, type ShopSlot } from "./shopping";

const slot = (id: string, date: string, meal_id: string | null, over: Partial<ShopSlot> = {}): ShopSlot => ({
  id, date, slot_type: "cook", meal_id, variation_id: null, leftovers_of_slot_id: null, ...over,
});
const ing = (meal_id: string, name: string, quantity: number | null, unit: string | null, section: string, over: Partial<ShopIngredient> = {}): ShopIngredient => ({
  meal_id, variation_id: null, name, quantity, unit, section, optional: false, ...over,
});

const meals = [
  { id: "bol", name: "Bolognese", servings: 4 },
  { id: "taco", name: "Tacos", servings: 5 },
  { id: "salad", name: "Tabbouleh", servings: 5 },
  { id: "mr", name: "Mince & Rice", servings: 4 },
  { id: "empty", name: "Baked Potatoes", servings: 4 },
];
const ingredients: ShopIngredient[] = [
  ing("bol", "beef mince", 500, "g", "meat_seafood"),
  ing("bol", "onion", 1, null, "produce"),
  ing("bol", "garlic cloves", 2, null, "produce"),
  ing("bol", "olive oil", 2, "tbsp", "pantry"),
  ing("taco", "beef mince", 500, "g", "meat_seafood"),
  ing("taco", "lettuce", 1, null, "produce"),
  ing("taco", "sour cream", null, null, "dairy_eggs"),
  ing("salad", "parsley", 2, "bunch", "produce"),
  ing("salad", "bulgur wheat", 1, "cup", "pantry"),
  ing("mr", "beef mince", 500, "g", "meat_seafood"),
  ing("mr", "dried apricots", 0.5, "cup", "pantry", { variation_id: "moroccan" }),
  ing("mr", "black beans", 1, "tin", "pantry", { variation_id: "mexican" }),
];
const pantry: PantryEntry[] = [
  { name: "Olive oil", tier: "always", section: "pantry", regular_quantity: null },
  { name: "Garlic", tier: "usually", section: "produce", regular_quantity: null },
  { name: "Milk", tier: "regular", section: "dairy_eggs", regular_quantity: "3L" },
];
const base = { meals, ingredients, pantry, servings: 5, startDate: "2026-11-28", lengthDays: 14, from: "2026-11-28" };

test("names and pantry matching", () => {
  assert.equal(normName("Tomatoes, diced"), "tomato diced");
  assert.ok(pantryCovers("Garlic", "garlic cloves"));
  assert.ok(pantryCovers("Rice", "white rice"));
  assert.ok(!pantryCovers("Rice", "rice noodles extra") === false); // words subset still matches
  assert.ok(!pantryCovers("Chicken stock", "chicken thighs"));
});

test("merges, scales to the household and skips always-have items", () => {
  const r = buildLists({ ...base, slots: [slot("a", "2026-11-28", "bol"), slot("b", "2026-11-29", "taco")] });
  const mince = r.items.find((i) => i.name === "Beef mince")!;
  // Bolognese 500g for 4 → 625g for 5, plus tacos 500g (already for 5).
  assert.equal(mince.quantity, "1.13kg");
  assert.deepEqual(mince.meal_ids.sort(), ["bol", "taco"]);
  assert.ok(!r.items.some((i) => i.name.toLowerCase() === "olive oil"));
  assert.deepEqual(r.assumed, ["Olive oil"]);
  assert.equal(r.items.find((i) => i.name === "Sour cream")!.quantity, null);
});

test("usually-have items are flagged for a have/need check under the pantry name", () => {
  const r = buildLists({ ...base, slots: [slot("a", "2026-11-28", "bol")] });
  const garlic = r.items.find((i) => i.name === "Garlic")!;
  assert.equal(garlic.needs_check, true);
});

test("regulars always go on the main list", () => {
  const r = buildLists({ ...base, slots: [] });
  assert.deepEqual(r.items.map((i) => [i.name, i.quantity, i.source]), [["Milk", "3L", "regular"]]);
});

test("leftovers nights double the source meal", () => {
  const r = buildLists({
    ...base,
    slots: [slot("a", "2026-11-28", "taco"), slot("b", "2026-11-29", null, { slot_type: "leftovers", leftovers_of_slot_id: "a" })],
  });
  assert.equal(r.items.find((i) => i.name === "Beef mince")!.quantity, "1kg");
  assert.equal(r.items.find((i) => i.name === "Lettuce")!.quantity, "2");
});

test("fresh food for week two goes on the top-up list", () => {
  const r = buildLists({ ...base, slots: [slot("a", "2026-11-29", "salad"), slot("b", "2026-12-06", "taco")] });
  const lettuce = r.items.find((i) => i.name === "Lettuce")!;
  assert.equal(lettuce.list, "top_up");
  assert.equal(r.items.find((i) => i.name === "Parsley")!.list, "main");
  assert.equal(r.items.find((i) => i.name === "Beef mince")!.list, "main"); // meat keeps in the freezer
  assert.equal(r.topUpOn, "2026-12-04");
});

test("variations add their own ingredients; meals without ingredients are reported", () => {
  const r = buildLists({ ...base, slots: [slot("a", "2026-11-28", "mr", { variation_id: "mexican" }), slot("b", "2026-11-30", "empty")] });
  assert.ok(r.items.some((i) => i.name === "Black beans"));
  assert.ok(!r.items.some((i) => i.name === "Dried apricots"));
  assert.deepEqual(r.missing, [{ meal_id: "empty", name: "Baked Potatoes" }]);
});

test("past nights aren't shopped for; sorted in store order", () => {
  const r = buildLists({ ...base, from: "2026-11-29", slots: [slot("a", "2026-11-28", "bol"), slot("b", "2026-11-29", "salad")] });
  assert.ok(!r.items.some((i) => i.name === "Beef mince"));
  const sections = r.items.map((i) => i.section);
  assert.equal(sections[0], "produce");
});

test("list names read naturally", async () => {
  const { tidyName } = await import("./shopping");
  assert.equal(tidyName("Bone in Chicken"), "Bone in chicken");
  assert.equal(tidyName("Corriander"), "Coriander");
  assert.equal(tidyName("tinned tomatos"), "Tinned tomatoes");
  assert.equal(tidyName("LKK honey soy sauce packet"), "LKK honey soy sauce packet");
  assert.equal(tidyName("2 scallions".replace("2 ", "")), "Spring onions");
});

test("usually-have items are asked once, on the main shop", () => {
  const r = buildLists({ ...base, slots: [slot("a", "2026-11-28", "bol"), slot("b", "2026-12-06", "bol")] });
  const garlic = r.items.filter((i) => i.name === "Garlic");
  assert.equal(garlic.length, 1);
  assert.equal(garlic[0].list, "main");
});

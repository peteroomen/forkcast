/**
 * Turns a plan into shopping lists. Pure, so it can be tested.
 *
 * - Scales each meal to the household and doubles it for linked leftovers nights.
 * - "Always have" pantry items are skipped; "usually have" ones are flagged to check;
 *   "regular" items (milk, bread) are added to every main shop.
 * - On a fortnight plan, fresh things for week-two meals go on a mid-fortnight top-up.
 */
import { formatQuantity, formatUnit, nzName, scaleQuantity } from "./ingredients";
import { SECTIONS } from "./sections";
import { addDays } from "./notifications";

export interface ShopSlot {
  id: string;
  date: string;
  slot_type: "cook" | "leftovers" | "takeaway" | "out";
  meal_id: string | null;
  variation_id: string | null;
  leftovers_of_slot_id: string | null;
}
export interface ShopMeal { id: string; name: string; servings: number | null }
export interface ShopIngredient {
  meal_id: string;
  variation_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  section: string;
  optional: boolean;
}
export interface PantryEntry { name: string; tier: "always" | "usually" | "regular"; section: string; regular_quantity: string | null }

export type ListKind = "main" | "top_up";

export interface BuiltItem {
  list: ListKind;
  name: string;
  quantity: string | null;
  section: string;
  source: "meal" | "regular";
  meal_ids: string[];
  needs_check: boolean;
  note: string | null;
}

export interface BuiltLists {
  items: BuiltItem[];
  /** Always-have pantry items the plan uses (not listed). */
  assumed: string[];
  /** Planned meals with no ingredients written down. */
  missing: { meal_id: string; name: string }[];
  /** Suggested day for the top-up shop (fortnight plans only). */
  topUpOn: string | null;
}

/** Sections that don't keep for two weeks. */
const PERISHABLE = new Set(["produce", "bakery", "deli"]);

export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("oes") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
}

/**
 * How a name reads on the list: NZ terms and spelling fixed, sentence case
 * ("Bone in Chicken" → "Bone in chicken"), but acronyms like LKK kept.
 */
export function tidyName(name: string): string {
  const fixed = nzName(name.trim());
  const words = fixed.split(/\s+/).map((w, i) => (i > 0 && /^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w));
  const out = words.join(" ");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Does pantry item [pantry] cover ingredient [ingredient]? ("garlic" covers "garlic cloves"). */
export function pantryCovers(pantry: string, ingredient: string): boolean {
  const p = normName(pantry);
  const i = normName(ingredient);
  if (!p) return false;
  if (p === i) return true;
  const iWords = new Set(i.split(" "));
  return p.split(" ").every((w) => iWords.has(w));
}

type Family = "mass" | "volume" | string;
function toBase(q: number, unit: string | null): { family: Family; value: number } {
  switch (unit) {
    case "g": return { family: "mass", value: q };
    case "kg": return { family: "mass", value: q * 1000 };
    case "ml": return { family: "volume", value: q };
    case "l": return { family: "volume", value: q * 1000 };
    default: return { family: unit ?? "count", value: q };
  }
}

function formatFamily(family: Family, value: number): string {
  if (family === "mass") return value >= 1000 ? `${formatQuantity(value / 1000, "kg")}kg` : `${formatQuantity(value, "g")}g`;
  if (family === "volume") return value >= 1000 ? `${formatQuantity(value / 1000, "l")}l` : `${formatQuantity(value, "ml")}ml`;
  if (family === "count") return formatQuantity(Math.ceil(value - 0.05), null);
  const unit = formatUnit(family, value);
  return `${formatQuantity(value, family)} ${unit}`;
}

const SECTION_ORDER = new Map<string, number>(SECTIONS.map((s, i) => [s.id, i]));

export function buildLists(input: {
  slots: ShopSlot[];
  meals: ShopMeal[];
  ingredients: ShopIngredient[];
  pantry: PantryEntry[];
  servings: number;
  startDate: string;
  lengthDays: number;
  /** Only nights from this date on are shopped for. */
  from: string;
}): BuiltLists {
  const { slots, meals, ingredients, pantry, servings, startDate, lengthDays, from } = input;
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const fortnight = lengthDays >= 14;
  const topUpFrom = addDays(startDate, 7);

  type Acc = {
    list: ListKind; name: string; section: string; meal_ids: Set<string>;
    amounts: Map<Family, number>; unknown: boolean; optional: boolean; needs_check: boolean;
  };
  const acc = new Map<string, Acc>();
  const assumed = new Set<string>();
  const missing = new Map<string, string>();

  for (const slot of slots) {
    if (slot.slot_type !== "cook" || !slot.meal_id || slot.date < from) continue;
    const meal = mealById.get(slot.meal_id);
    if (!meal) continue;
    const mine = ingredients.filter((i) => i.meal_id === meal.id && (i.variation_id === null || i.variation_id === slot.variation_id));
    if (!mine.length) {
      missing.set(meal.id, meal.name);
      continue;
    }
    const batches = 1 + slots.filter((s) => s.slot_type === "leftovers" && s.leftovers_of_slot_id === slot.id).length;

    for (const ing of mine) {
      const cover = pantry.find((p) => pantryCovers(p.name, ing.name));
      if (cover?.tier === "always") {
        assumed.add(cover.name);
        continue;
      }
      const name = tidyName(ing.name);
      // Things you usually have are checked once, on the main shop.
      const list: ListKind =
        fortnight && slot.date >= topUpFrom && PERISHABLE.has(ing.section) && cover?.tier !== "usually" ? "top_up" : "main";
      const key = `${list}|${normName(cover?.tier === "usually" ? cover.name : name)}`;
      let a = acc.get(key);
      if (!a) {
        const display = cover?.tier === "usually" ? cover.name : name;
        a = {
          list, name: tidyName(display), section: cover?.section ?? ing.section,
          meal_ids: new Set(), amounts: new Map(), unknown: false, optional: true, needs_check: cover?.tier === "usually",
        };
        acc.set(key, a);
      }
      a.meal_ids.add(meal.id);
      if (!ing.optional) a.optional = false;
      if (ing.quantity === null) {
        a.unknown = true;
      } else {
        const scaled = (scaleQuantity(ing.quantity, meal.servings, servings, ing.unit) ?? ing.quantity) * batches;
        const { family, value } = toBase(scaled, ing.unit);
        a.amounts.set(family, (a.amounts.get(family) ?? 0) + value);
      }
    }
  }

  const items: BuiltItem[] = [...acc.values()].map((a) => {
    const parts = [...a.amounts.entries()].map(([f, v]) => formatFamily(f, v));
    return {
      list: a.list,
      name: a.name,
      quantity: parts.length ? parts.join(" + ") : null,
      section: a.section,
      source: "meal",
      meal_ids: [...a.meal_ids],
      needs_check: a.needs_check,
      note: a.optional ? "optional" : null,
    };
  });

  for (const p of pantry.filter((x) => x.tier === "regular")) {
    if (items.some((i) => i.list === "main" && normName(i.name) === normName(p.name))) continue;
    items.push({ list: "main", name: p.name, quantity: p.regular_quantity, section: p.section, source: "regular", meal_ids: [], needs_check: false, note: null });
  }

  items.sort((x, y) =>
    (SECTION_ORDER.get(x.section) ?? 99) - (SECTION_ORDER.get(y.section) ?? 99) || x.name.localeCompare(y.name),
  );

  return {
    items,
    assumed: [...assumed].sort(),
    missing: [...missing.entries()].map(([meal_id, name]) => ({ meal_id, name })),
    topUpOn: fortnight && items.some((i) => i.list === "top_up") ? addDays(startDate, 6) : null,
  };
}

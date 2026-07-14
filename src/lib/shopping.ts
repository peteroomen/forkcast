/**
 * Shopping-list generation: consolidate structured ingredients across all
 * planned meals into one categorised list (handoff §6 shopping rules).
 *
 * Rules baked in:
 *  - Skip always-in-stock items (lemon, rosemary, thyme).
 *  - Consolidate duplicate ingredient names into a single line, summing qty
 *    where units match; otherwise concatenate the quantities.
 *  - Flag frequent restocks (rice/garlic/onions) — kept but marked.
 */
import { isAlwaysInStock, isFrequentRestock, type Category } from "./constants";
import type { Ingredient, Recipe } from "./types";

export type ConsolidatedLine = {
  name: string;
  category: Category;
  qty: string | null;
  fromMeals: string[];
  isRestock: boolean;
};

type Acc = {
  name: string;
  category: Category;
  quantities: { qty: number | null; unit: string | null }[];
  fromMeals: Set<string>;
};

function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

function formatQuantities(
  quantities: { qty: number | null; unit: string | null }[],
): string | null {
  // Group by unit, sum numeric qty per unit.
  const byUnit = new Map<string, number>();
  const freeform: string[] = [];
  for (const q of quantities) {
    if (q.qty == null) {
      if (q.unit) freeform.push(q.unit);
      continue;
    }
    const unit = q.unit ?? "";
    byUnit.set(unit, (byUnit.get(unit) ?? 0) + q.qty);
  }
  const parts: string[] = [];
  for (const [unit, total] of byUnit) {
    const rounded = Math.round(total * 100) / 100;
    parts.push(unit ? `${rounded} ${unit}` : `${rounded}`);
  }
  const freeformUnique = [...new Set(freeform)].filter(
    (f) => f !== "garnish" && f !== "optional",
  );
  const all = [...parts, ...freeformUnique];
  return all.length ? all.join(" + ") : null;
}

/**
 * @param recipes Recipes referenced by the plan (deduped is fine; each
 *   appearance should be passed once per meal slot so quantities scale).
 */
export function consolidateIngredients(recipes: Recipe[]): ConsolidatedLine[] {
  const acc = new Map<string, Acc>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients as Ingredient[]) {
      if (isAlwaysInStock(ing.name)) continue; // skip lemon/herbs
      const key = normaliseName(ing.name);
      const existing = acc.get(key);
      if (existing) {
        existing.quantities.push({ qty: ing.qty, unit: ing.unit });
        existing.fromMeals.add(recipe.name);
      } else {
        acc.set(key, {
          name: ing.name,
          category: ing.category,
          quantities: [{ qty: ing.qty, unit: ing.unit }],
          fromMeals: new Set([recipe.name]),
        });
      }
    }
  }

  return [...acc.values()]
    .map((a) => ({
      name: a.name,
      category: a.category,
      qty: formatQuantities(a.quantities),
      fromMeals: [...a.fromMeals],
      isRestock: isFrequentRestock(a.name),
    }))
    .sort((x, y) => x.name.localeCompare(y.name));
}

export const CATEGORY_ORDER: Category[] = [
  "Produce",
  "Meat & Fish",
  "Dairy & Eggs",
  "Pantry",
  "Frozen",
  "Other",
];

export function groupByCategory<T extends { category: Category }>(
  items: T[],
): Record<Category, T[]> {
  const out = {
    Produce: [],
    "Meat & Fish": [],
    "Dairy & Eggs": [],
    Pantry: [],
    Frozen: [],
    Other: [],
  } as Record<Category, T[]>;
  for (const item of items) out[item.category].push(item);
  return out;
}

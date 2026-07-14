/**
 * Forkcast domain constants & guardrails.
 *
 * These encode the household's hard rules (handoff §3) so they are enforced
 * in code, not left to memory. Anything that "should be flagged automatically"
 * lives here.
 */

// ---- Enums shared across the schema -----------------------------------------

export const CATEGORIES = [
  "Produce",
  "Meat & Fish",
  "Dairy & Eggs",
  "Pantry",
  "Frozen",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SLOT_TYPES = ["meal", "takeaway", "leftover", "games-night"] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export const COOKS = ["peter", "megan", "jamie", "anyone"] as const;
export type CookKey = (typeof COOKS)[number];

export const RECIPE_TAGS = [
  "megan-friendly",
  "jamie-friendly",
  "kid-friendly",
  "weekend-cook",
  "quick", // <= 30 min
  "new",
] as const;
export type RecipeTag = (typeof RECIPE_TAGS)[number];

export const PANTRY_STATUS = ["in-stock", "low", "out"] as const;
export type PantryStatus = (typeof PANTRY_STATUS)[number];

// ---- Hard rules (handoff §3) ------------------------------------------------

/** NO CELERY — ever. Auto-flag on any imported recipe. */
export const BANNED_INGREDIENTS = ["celery"];

/** Substitutions offered when a banned ingredient is detected. */
export const CELERY_SUBSTITUTES = ["carrot", "zucchini", "corn"];

/** Jamie's nights must be quick. */
export const JAMIE_MAX_MINUTES = 30;

/** Always in stock — never on a shopping list, skip in pantry quiz. */
export const ALWAYS_IN_STOCK = ["lemon", "lemons", "rosemary", "thyme"];

/** Frequent restock items — surfaced as reminders each cycle. */
export const FREQUENT_RESTOCK = ["rice", "garlic", "onions", "onion"];

/** Items that must never be scheduled in the same week. */
export const CONFLICTING_PAIRS: [string, string][] = [["kransky", "saveloy"]];

/** Side-pairing reminders keyed by a substring match on the recipe name. */
export const SIDE_PAIRINGS: { match: string; side: string }[] = [
  { match: "soup", side: "sourdough" },
  { match: "pasta", side: "garlic bread" },
  { match: "bolognaise", side: "garlic bread" },
  { match: "spaghetti", side: "garlic bread" },
];

/** Chicken thigh cutlets are bone-in / skin-off — roasting/braising only. */
export const THIGH_CUTLET_NOTE =
  "Chicken thigh cutlets are bone-in, skin-off — best roasted, braised, baked or in tray bakes. Not for stir-fry/chopped dishes (debone or swap for boneless thigh).";

/** Seafood is a Peter + eldest-child treat, not a family dinner. */
export const SEAFOOD_KEYWORDS = ["mussels", "salmon quiche", "quiche"];

// ---- Detection helpers ------------------------------------------------------

export function detectBannedIngredients(
  ingredients: { name: string }[],
): string[] {
  const found: string[] = [];
  for (const ing of ingredients) {
    const n = ing.name.toLowerCase();
    for (const banned of BANNED_INGREDIENTS) {
      if (n.includes(banned)) found.push(banned);
    }
  }
  return [...new Set(found)];
}

/** True when an ingredient should be skipped on shopping lists. */
export function isAlwaysInStock(name: string): boolean {
  const n = name.toLowerCase();
  return ALWAYS_IN_STOCK.some((s) => n.includes(s));
}

export function isFrequentRestock(name: string): boolean {
  const n = name.toLowerCase();
  return FREQUENT_RESTOCK.some((s) => n.includes(s));
}

/** Returns a side reminder for a recipe name, if any. */
export function sidePairingFor(recipeName: string): string | null {
  const n = recipeName.toLowerCase();
  const hit = SIDE_PAIRINGS.find((p) => n.includes(p.match));
  return hit ? hit.side : null;
}

/** Detects same-week conflicts (e.g. kransky + saveloy) across meal names. */
export function detectConflicts(recipeNames: string[]): [string, string][] {
  const lower = recipeNames.map((r) => r.toLowerCase());
  const conflicts: [string, string][] = [];
  for (const [a, b] of CONFLICTING_PAIRS) {
    if (lower.some((n) => n.includes(a)) && lower.some((n) => n.includes(b))) {
      conflicts.push([a, b]);
    }
  }
  return conflicts;
}

/**
 * Zod schemas + inferred types for Forkcast.
 * DB columns are snake_case; these mirror the Supabase tables (see
 * supabase/migrations/0001_init.sql). Validate at the edges (API routes,
 * seed script, AI output) so bad shapes never reach the UI.
 */
import { z } from "zod";
import {
  CATEGORIES,
  COOKS,
  PANTRY_STATUS,
  RECIPE_TAGS,
  SLOT_TYPES,
} from "./constants";

// Re-export the string-literal union types so callers can pull domain enums
// and row types from a single module.
export type {
  Category,
  CookKey,
  SlotType,
  RecipeTag,
  PantryStatus,
} from "./constants";

export const categorySchema = z.enum(CATEGORIES);
export const cookKeySchema = z.enum(COOKS);
export const slotTypeSchema = z.enum(SLOT_TYPES);
export const recipeTagSchema = z.enum(RECIPE_TAGS);
export const pantryStatusSchema = z.enum(PANTRY_STATUS);

// ---- Ingredient -------------------------------------------------------------

export const ingredientSchema = z.object({
  name: z.string().min(1),
  qty: z.number().nonnegative().nullable().default(null),
  unit: z.string().nullable().default(null),
  category: categorySchema.default("Other"),
});
export type Ingredient = z.infer<typeof ingredientSchema>;

// ---- Cook -------------------------------------------------------------------

export const cookSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  // 0 = Monday ... 6 = Sunday. Nullable = no fixed night.
  default_night: z.number().int().min(0).max(6).nullable(),
  role: z.enum(["planner", "cook"]),
});
export type Cook = z.infer<typeof cookSchema>;

// ---- Recipe -----------------------------------------------------------------

export const recipeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  cuisine: z.string().nullable().default(null),
  source_url: z.string().url().nullable().default(null),
  time_minutes: z.number().int().positive().nullable().default(null),
  servings: z.number().int().positive().default(4),
  ingredients: z.array(ingredientSchema).default([]),
  method: z.string().nullable().default(null),
  tags: z.array(recipeTagSchema).default([]),
  notes: z.string().nullable().default(null),
  cooked_by: cookKeySchema.default("anyone"),
  is_favourite: z.boolean().default(false),
  // "recipe missing" state — a name we plan around but don't yet have details for.
  needs_recipe: z.boolean().default(false),
});
export type Recipe = z.infer<typeof recipeSchema>;

/** Shape used when creating a recipe (id/owner assigned by DB). */
export const recipeInsertSchema = recipeSchema.omit({ id: true }).partial({
  cuisine: true,
  source_url: true,
  time_minutes: true,
  method: true,
  notes: true,
});
export type RecipeInsert = z.infer<typeof recipeInsertSchema>;

// ---- Plan + plan days -------------------------------------------------------

export const planSchema = z.object({
  id: z.string().uuid(),
  fortnight_start: z.string(), // ISO date (YYYY-MM-DD), a Monday
  status: z.enum(["draft", "published"]),
});
export type Plan = z.infer<typeof planSchema>;

export const planDaySchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  date: z.string(), // ISO date
  slot_type: slotTypeSchema,
  recipe_id: z.string().uuid().nullable(),
  cook_id: z.string().uuid().nullable(),
  note: z.string().nullable().default(null),
});
export type PlanDay = z.infer<typeof planDaySchema>;

// ---- Pantry -----------------------------------------------------------------

export const pantryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category: categorySchema,
  qty: z.string().nullable().default(null), // freeform e.g. "2 tins"
  status: pantryStatusSchema,
  is_staple: z.boolean().default(false), // skip in quiz
  is_food: z.boolean().default(true),
});
export type PantryItem = z.infer<typeof pantryItemSchema>;

// ---- Shopping ---------------------------------------------------------------

export const shoppingItemSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  category: categorySchema,
  qty: z.string().nullable().default(null),
  done: z.boolean().default(false),
  source: z.enum(["generated", "manual"]),
});
export type ShoppingItem = z.infer<typeof shoppingItemSchema>;

// ---- AI suggestion ----------------------------------------------------------

/**
 * The AI may only suggest a MEAL NAME from the known library — never invent
 * ingredients (handoff §3, §9). The route validates the returned name against
 * the library and drops anything unknown.
 */
export const aiSuggestionSchema = z.object({
  meal: z.string().min(1),
  reason: z.string().min(1),
  time: z.number().int().positive().nullable(),
});
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;

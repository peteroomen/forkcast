/**
 * Server-side data access. All queries run through the RLS-enforced server
 * client, so they are automatically scoped to the signed-in owner.
 */
import "server-only";
import { z } from "zod";
import { createClient } from "./supabase/server";
import {
  cookSchema,
  pantryItemSchema,
  planDaySchema,
  planSchema,
  recipeSchema,
  shoppingItemSchema,
  type Cook,
  type PantryItem,
  type Plan,
  type PlanDay,
  type Recipe,
  type ShoppingItem,
} from "./types";

export async function getRecipes(): Promise<Recipe[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("*").order("name");
  return z.array(recipeSchema).parse(data ?? []);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? recipeSchema.parse(data) : null;
}

export async function getCooks(): Promise<Cook[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cooks").select("*").order("name");
  return z.array(cookSchema).parse(data ?? []);
}

export async function getPantry(): Promise<PantryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pantry_items")
    .select("*")
    .order("name");
  return z.array(pantryItemSchema).parse(data ?? []);
}

/** The current draft plan, or the most recent plan of any status. */
export async function getActivePlan(): Promise<Plan | null> {
  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("plans")
    .select("*")
    .eq("status", "draft")
    .order("fortnight_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (draft) return planSchema.parse(draft);

  const { data: latest } = await supabase
    .from("plans")
    .select("*")
    .order("fortnight_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return latest ? planSchema.parse(latest) : null;
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? planSchema.parse(data) : null;
}

export async function getPlanDays(planId: string): Promise<PlanDay[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_days")
    .select("*")
    .eq("plan_id", planId)
    .order("date");
  return z.array(planDaySchema).parse(data ?? []);
}

export async function getPublishedPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("status", "published")
    .order("fortnight_start", { ascending: false });
  return z.array(planSchema).parse(data ?? []);
}

export async function getShoppingItems(
  planId: string,
): Promise<ShoppingItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("plan_id", planId)
    .order("category");
  return z.array(shoppingItemSchema).parse(data ?? []);
}

/** Names cooked in the last N published fortnights (for repeat-avoidance). */
export async function getRecentMealNames(limit = 20): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_days")
    .select("date, recipes(name)")
    .not("recipe_id", "is", null)
    .order("date", { ascending: false })
    .limit(limit);
  type Row = { recipes: { name: string } | { name: string }[] | null };
  return ((data ?? []) as Row[])
    .map((d) => (Array.isArray(d.recipes) ? d.recipes[0]?.name : d.recipes?.name))
    .filter((n): n is string => Boolean(n));
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Household, Ingredient, LogEntry, Meal, MealStats, Member, Variation } from "./types";

/** Signed-in user + their household + members. One query set per request. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: link } = await supabase
    .from("household_users")
    .select("household_id, role, households(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const household = (link?.households ?? null) as unknown as Household | null;
  let members: Member[] = [];
  if (household) {
    const { data } = await supabase.from("members").select("*").eq("household_id", household.id).order("sort_order");
    members = (data ?? []) as Member[];
  }
  return { supabase, user, household, members, role: (link?.role ?? null) as "owner" | "member" | null };
});

export async function requireHousehold() {
  const ctx = await getContext();
  if (!ctx.household) redirect("/welcome");
  return ctx as typeof ctx & { household: Household };
}

export interface LibraryMeal extends Meal {
  cook_ids: string[];
  variation_names: string[];
  stats: MealStats | null;
}

export async function getLibrary(): Promise<LibraryMeal[]> {
  const { supabase, household } = await requireHousehold();
  const [meals, cooks, variations, stats] = await Promise.all([
    supabase.from("meals").select("*").eq("household_id", household.id).eq("archived", false).order("name"),
    supabase.from("meal_cooks").select("meal_id, member_id").eq("household_id", household.id),
    supabase.from("meal_variations").select("meal_id, name, sort_order").eq("household_id", household.id).eq("archived", false).order("sort_order"),
    supabase.from("meal_stats").select("*").eq("household_id", household.id),
  ]);
  if (meals.error) throw meals.error;

  const cookMap = new Map<string, string[]>();
  for (const c of cooks.data ?? []) cookMap.set(c.meal_id, [...(cookMap.get(c.meal_id) ?? []), c.member_id]);
  const varMap = new Map<string, string[]>();
  for (const v of variations.data ?? []) varMap.set(v.meal_id, [...(varMap.get(v.meal_id) ?? []), v.name]);
  const statMap = new Map<string, MealStats>((stats.data ?? []).map((s) => [s.meal_id, s as MealStats]));

  return (meals.data as Meal[]).map((m) => ({
    ...m,
    cook_ids: cookMap.get(m.id) ?? [],
    variation_names: varMap.get(m.id) ?? [],
    stats: statMap.get(m.id) ?? null,
  }));
}

export interface MealDetail {
  meal: Meal;
  variations: Variation[];
  ingredients: Ingredient[];
  cook_ids: string[];
  stats: MealStats | null;
  log: (LogEntry & { ratings: { member_id: string; rating: number }[] })[];
}

export async function getMeal(id: string): Promise<MealDetail | null> {
  const { supabase } = await requireHousehold();
  const [meal, variations, ingredients, cooks, stats, log] = await Promise.all([
    supabase.from("meals").select("*").eq("id", id).maybeSingle(),
    supabase.from("meal_variations").select("*").eq("meal_id", id).eq("archived", false).order("sort_order"),
    supabase.from("meal_ingredients").select("*").eq("meal_id", id).order("sort_order"),
    supabase.from("meal_cooks").select("member_id").eq("meal_id", id),
    supabase.from("meal_stats").select("*").eq("meal_id", id).maybeSingle(),
    supabase
      .from("meal_log")
      .select("*, meal_feedback(member_id, rating)")
      .eq("meal_id", id)
      .order("date", { ascending: false })
      .limit(20),
  ]);
  if (!meal.data) return null;
  return {
    meal: meal.data as Meal,
    variations: (variations.data ?? []) as Variation[],
    ingredients: (ingredients.data ?? []) as Ingredient[],
    cook_ids: (cooks.data ?? []).map((c) => c.member_id),
    stats: (stats.data ?? null) as MealStats | null,
    log: (log.data ?? []).map((l) => {
      const { meal_feedback, ...rest } = l as LogEntry & { meal_feedback: { member_id: string; rating: number }[] };
      return { ...rest, ratings: meal_feedback ?? [] };
    }),
  };
}

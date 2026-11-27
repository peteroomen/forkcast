import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Household, Ingredient, LogEntry, Meal, MealStats, Member, Variation } from "./types";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** The signed-in user from the session cookie's access token (no network call). */
function userFromToken(token: string): SessionUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) return null;
    return { id: payload.sub as string, email: (payload.email as string) ?? null };
  } catch {
    return null;
  }
}

/**
 * Signed-in user + their household + members, once per request. The user comes
 * from the session cookie rather than an Auth round trip: middleware has just
 * refreshed it, and every query is still checked against the token by RLS.
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session ? userFromToken(session.access_token) : null;
  if (!user) redirect("/login");

  const { data: link } = await supabase
    .from("household_users")
    .select("role, households(*, members(*))")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const raw = (link?.households ?? null) as unknown as (Household & { members: Member[] }) | null;
  const members = (raw?.members ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const household = raw ? (({ members: _m, ...h }) => h)(raw) as Household : null;
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

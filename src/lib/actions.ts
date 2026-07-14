"use server";

/**
 * Server Actions — every mutation. Auth is enforced by RLS + an explicit
 * getUser() guard (owner_id is stamped from the session, never the client).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { detectConflicts } from "./constants";
import { consolidateIngredients } from "./shopping";
import { createClient } from "./supabase/server";
import { fortnightDates, toISODate, weekdayIndex } from "./dates";
import {
  recipeInsertSchema,
  type Recipe,
  type SlotType,
} from "./types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// ---- Plans ------------------------------------------------------------------

/** Create a fortnight plan starting on the given Monday, auto-seeding cook
 * nights per each cook's default_night. Returns the new plan id. */
export async function createPlan(fortnightStartISO: string): Promise<string> {
  const { supabase, userId } = await requireUser();

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      owner_id: userId,
      fortnight_start: fortnightStartISO,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !plan) throw new Error(error?.message ?? "Could not create plan");

  const { data: cooks } = await supabase.from("cooks").select("*");
  const start = new Date(fortnightStartISO);
  const dates = fortnightDates(start);

  const rows = dates.map((date) => {
    const wd = weekdayIndex(date);
    const cook = (cooks ?? []).find((c) => c.default_night === wd);
    return {
      owner_id: userId,
      plan_id: plan.id,
      date: toISODate(date),
      slot_type: "meal" as SlotType,
      recipe_id: null,
      cook_id: cook?.id ?? null,
      note: null,
    };
  });
  await supabase.from("plan_days").insert(rows);

  revalidatePath("/planner");
  return plan.id;
}

export async function assignMeal(
  planDayId: string,
  recipeId: string | null,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("plan_days")
    .update({ recipe_id: recipeId })
    .eq("id", planDayId);
  revalidatePath("/planner");
}

export async function setSlotType(
  planDayId: string,
  slotType: SlotType,
): Promise<void> {
  const { supabase } = await requireUser();
  const patch: Record<string, unknown> = { slot_type: slotType };
  // Non-meal slots don't hold a recipe.
  if (slotType !== "meal") patch.recipe_id = null;
  await supabase.from("plan_days").update(patch).eq("id", planDayId);
  revalidatePath("/planner");
}

export async function setSlotCook(
  planDayId: string,
  cookId: string | null,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("plan_days").update({ cook_id: cookId }).eq("id", planDayId);
  revalidatePath("/planner");
}

export async function setSlotNote(
  planDayId: string,
  note: string,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("plan_days")
    .update({ note: note.trim() || null })
    .eq("id", planDayId);
  revalidatePath("/planner");
}

export async function publishPlan(planId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("plans").update({ status: "published" }).eq("id", planId);
  revalidatePath("/planner");
  revalidatePath("/history");
}

// ---- Shopping list ----------------------------------------------------------

/**
 * Regenerate the shopping list for a plan from its meal slots. Wipes previous
 * *generated* rows (keeps manual additions), consolidates ingredients, skips
 * always-in-stock items, then re-inserts.
 */
export async function generateShoppingList(planId: string): Promise<void> {
  const { supabase, userId } = await requireUser();

  const { data: days } = await supabase
    .from("plan_days")
    .select("recipe_id, slot_type")
    .eq("plan_id", planId)
    .eq("slot_type", "meal")
    .not("recipe_id", "is", null);

  const recipeIds = [...new Set((days ?? []).map((d) => d.recipe_id))].filter(
    Boolean,
  ) as string[];

  let recipes: Recipe[] = [];
  if (recipeIds.length) {
    const { data: recipeRows } = await supabase
      .from("recipes")
      .select("*")
      .in("id", recipeIds);
    recipes = (recipeRows ?? []) as unknown as Recipe[];
  }

  // One appearance per meal slot so quantities scale with repeats.
  const perSlot: Recipe[] = [];
  for (const d of days ?? []) {
    const r = recipes.find((x) => x.id === d.recipe_id);
    if (r) perSlot.push(r);
  }
  const lines = consolidateIngredients(perSlot);

  // Clear previous generated rows only.
  await supabase
    .from("shopping_items")
    .delete()
    .eq("plan_id", planId)
    .eq("source", "generated");

  if (lines.length) {
    await supabase.from("shopping_items").insert(
      lines.map((l) => ({
        owner_id: userId,
        plan_id: planId,
        name: l.isRestock ? `${l.name} (restock)` : l.name,
        category: l.category,
        qty: l.qty,
        done: false,
        source: "generated" as const,
      })),
    );
  }

  revalidatePath("/shopping");
}

export async function toggleShoppingItem(
  itemId: string,
  done: boolean,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("shopping_items").update({ done }).eq("id", itemId);
  revalidatePath("/shopping");
}

const addShoppingSchema = z.object({
  planId: z.string().uuid().nullable(),
  name: z.string().min(1),
  category: z.string(),
});

export async function addShoppingItem(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireUser();
  const parsed = addShoppingSchema.safeParse({
    planId: (formData.get("planId") as string) || null,
    name: formData.get("name"),
    category: formData.get("category") || "Other",
  });
  if (!parsed.success) return;
  await supabase.from("shopping_items").insert({
    owner_id: userId,
    plan_id: parsed.data.planId,
    name: parsed.data.name,
    category: parsed.data.category,
    qty: null,
    done: false,
    source: "manual",
  });
  revalidatePath("/shopping");
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("shopping_items").delete().eq("id", itemId);
  revalidatePath("/shopping");
}

// ---- Recipes ----------------------------------------------------------------

export async function upsertRecipe(input: unknown): Promise<void> {
  const { supabase, userId } = await requireUser();
  const parsed = recipeInsertSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid recipe");
  const r = parsed.data;

  const idSchema = z.object({ id: z.string().uuid() });
  const maybeId = idSchema.safeParse(input);

  const row = {
    owner_id: userId,
    name: r.name,
    cuisine: r.cuisine ?? null,
    source_url: r.source_url ?? null,
    time_minutes: r.time_minutes ?? null,
    servings: r.servings ?? 4,
    ingredients: r.ingredients ?? [],
    method: r.method ?? null,
    tags: r.tags ?? [],
    notes: r.notes ?? null,
    cooked_by: r.cooked_by ?? "anyone",
    is_favourite: r.is_favourite ?? false,
    needs_recipe: r.needs_recipe ?? false,
  };

  if (maybeId.success) {
    await supabase.from("recipes").update(row).eq("id", maybeId.data.id);
  } else {
    await supabase.from("recipes").insert(row);
  }
  revalidatePath("/library");
  revalidatePath("/planner");
}

export async function deleteRecipe(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("recipes").delete().eq("id", id);
  revalidatePath("/library");
}

export async function toggleFavourite(
  id: string,
  isFavourite: boolean,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("recipes")
    .update({ is_favourite: isFavourite })
    .eq("id", id);
  revalidatePath("/library");
  revalidatePath("/discover");
}

// ---- Pantry -----------------------------------------------------------------

export async function setPantryStatus(
  id: string,
  status: "in-stock" | "low" | "out",
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("pantry_items").update({ status }).eq("id", id);
  revalidatePath("/pantry");
}

export async function addPantryItem(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireUser();
  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string) || "Other";
  const isFood = formData.get("is_food") !== "off";
  if (!name) return;
  await supabase.from("pantry_items").insert({
    owner_id: userId,
    name,
    category,
    status: "out",
    is_staple: false,
    is_food: isFood,
  });
  revalidatePath("/pantry");
}

export async function deletePantryItem(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePath("/pantry");
}

/** Push out/low pantry items onto the active plan's shopping list. */
export async function addLowStockToShopping(planId: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { data: items } = await supabase
    .from("pantry_items")
    .select("*")
    .neq("status", "in-stock")
    .eq("is_staple", false);
  if (!items?.length) return;
  await supabase.from("shopping_items").insert(
    items.map((i) => ({
      owner_id: userId,
      plan_id: planId,
      name: i.name,
      category: i.category,
      qty: i.qty,
      done: false,
      source: "manual" as const,
    })),
  );
  revalidatePath("/shopping");
}

// ---- Cooks / settings -------------------------------------------------------

export async function setCookNight(
  cookId: string,
  night: number | null,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("cooks")
    .update({ default_night: night })
    .eq("id", cookId);
  revalidatePath("/settings");
  revalidatePath("/planner");
}

// ---- Conflict check (used by the planner UI) --------------------------------

export async function checkWeekConflicts(
  recipeNames: string[],
): Promise<[string, string][]> {
  return detectConflicts(recipeNames);
}

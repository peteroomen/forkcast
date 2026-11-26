"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireHousehold } from "@/lib/data";
import { parseIngredient } from "@/lib/ingredients";
import { importRecipeFromUrl, type ImportedRecipe } from "@/lib/recipe-import";

const nullableText = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const IngredientInput = z.object({
  text: z.string(),
  section: z.string().default("other"),
  optional: z.boolean().default(false),
});

const MealInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Give the meal a name"),
  kind: z.enum(["head", "recipe"]),
  course: z.enum(["main", "side", "dessert"]),
  description: nullableText,
  notes: nullableText,
  method: nullableText,
  cuisine: nullableText,
  protein: nullableText,
  effort: z.enum(["quick", "medium", "project"]),
  tags: z.array(z.string().trim().toLowerCase().min(1)).default([]),
  target_interval_days: z.number().int().positive().nullable(),
  servings: z.number().int().min(1).max(30).nullable(),
  total_minutes: z.number().int().positive().max(2000).nullable(),
  weeknight_ok: z.boolean(),
  batch_friendly: z.boolean(),
  fresh_heavy: z.boolean(),
  needs_recipe: z.boolean(),
  prep_note: nullableText,
  source_url: nullableText,
  source_name: nullableText,
  image_url: nullableText,
  cook_ids: z.array(z.string().uuid()),
  ingredients: z.array(IngredientInput),
  variations: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1, "Variations need a name"),
      notes: nullableText,
      method: nullableText,
      ingredients: z.array(IngredientInput),
    }),
  ),
});

export type MealInputT = z.input<typeof MealInput>;

export type SaveResult = { ok: false; error: string } | { ok: true; id: string };

function ingredientRows(
  list: z.infer<typeof IngredientInput>[],
  base: { household_id: string; meal_id: string; variation_id: string | null },
) {
  return list
    .map((i) => ({ ...i, text: i.text.trim() }))
    .filter((i) => i.text)
    .map((i, idx) => {
      const p = parseIngredient(i.text);
      return {
        ...base,
        name: p.name || i.text,
        quantity: p.quantity,
        unit: p.unit,
        note: p.note,
        section: i.section,
        optional: i.optional,
        sort_order: idx,
      };
    });
}

export async function saveMeal(input: MealInputT): Promise<SaveResult> {
  const parsed = MealInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { supabase, household, user } = await requireHousehold();
  const { id, cook_ids, ingredients, variations, ...fields } = parsed.data;
  const household_id = household.id;

  let mealId = id;
  if (mealId) {
    const { error } = await supabase.from("meals").update(fields).eq("id", mealId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("meals")
      .insert({ ...fields, household_id, created_by: user.id })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    mealId = data.id as string;
  }

  // Cooks: replace.
  await supabase.from("meal_cooks").delete().eq("meal_id", mealId);
  if (cook_ids.length) {
    const { error } = await supabase
      .from("meal_cooks")
      .insert(cook_ids.map((member_id) => ({ household_id, meal_id: mealId, member_id })));
    if (error) return { ok: false, error: error.message };
  }

  // Variations: upsert kept ones, archive removed ones (keeps their log history).
  const { data: existing } = await supabase.from("meal_variations").select("id").eq("meal_id", mealId);
  const keepIds = new Set(variations.map((v) => v.id).filter(Boolean));
  const removed = (existing ?? []).map((v) => v.id as string).filter((vid) => !keepIds.has(vid));
  if (removed.length) {
    await supabase.from("meal_variations").update({ archived: true }).in("id", removed);
  }

  const variationIds: string[] = [];
  for (const [idx, v] of variations.entries()) {
    const row = { name: v.name, notes: v.notes, method: v.method, sort_order: idx, archived: false };
    if (v.id) {
      const { error } = await supabase.from("meal_variations").update(row).eq("id", v.id);
      if (error) return { ok: false, error: error.message };
      variationIds.push(v.id);
    } else {
      const { data, error } = await supabase
        .from("meal_variations")
        .insert({ ...row, household_id, meal_id: mealId })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message.includes("duplicate") ? `Two variations called “${v.name}”` : error.message };
      variationIds.push(data.id as string);
    }
  }

  // Ingredients: replace wholesale.
  await supabase.from("meal_ingredients").delete().eq("meal_id", mealId);
  const rows = [
    ...ingredientRows(ingredients, { household_id, meal_id: mealId, variation_id: null }),
    ...variations.flatMap((v, idx) =>
      ingredientRows(v.ingredients, { household_id, meal_id: mealId!, variation_id: variationIds[idx] }),
    ),
  ];
  if (rows.length) {
    const { error } = await supabase.from("meal_ingredients").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/library");
  revalidatePath(`/library/${mealId}`);
  return { ok: true, id: mealId };
}

export async function archiveMeal(id: string) {
  const { supabase } = await requireHousehold();
  await supabase.from("meals").update({ archived: true }).eq("id", id);
  revalidatePath("/library");
  redirect("/library");
}

export async function importFromUrl(url: string): Promise<{ ok: true; recipe: ImportedRecipe } | { ok: false; error: string }> {
  await requireHousehold();
  try {
    return { ok: true, recipe: await importRecipeFromUrl(url.trim()) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

const LogInput = z.object({
  meal_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  variation_id: z.string().uuid().nullable(),
  cook_member_id: z.string().uuid().nullable(),
  make_again: z.enum(["yes", "maybe", "no"]).nullable(),
  notes: nullableText,
  ratings: z.array(z.object({ member_id: z.string().uuid(), rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]) })),
});

export async function logMeal(input: z.input<typeof LogInput>): Promise<{ ok: boolean; error?: string }> {
  const parsed = LogInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const { supabase, household } = await requireHousehold();
  const { ratings, ...entry } = parsed.data;

  // One dinner per night: logging a date replaces whatever was there.
  const { data, error } = await supabase
    .from("meal_log")
    .upsert({ ...entry, household_id: household.id, slot_type: "cook" }, { onConflict: "household_id,date" })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("meal_feedback").delete().eq("log_id", data.id);
  if (ratings.length) {
    const { error: fErr } = await supabase
      .from("meal_feedback")
      .insert(ratings.map((r) => ({ ...r, household_id: household.id, log_id: data.id })));
    if (fErr) return { ok: false, error: fErr.message };
  }
  revalidatePath("/library");
  revalidatePath(`/library/${entry.meal_id}`);
  return { ok: true };
}

export async function deleteLog(id: string, mealId: string) {
  const { supabase } = await requireHousehold();
  await supabase.from("meal_log").delete().eq("id", id);
  revalidatePath("/library");
  revalidatePath(`/library/${mealId}`);
}

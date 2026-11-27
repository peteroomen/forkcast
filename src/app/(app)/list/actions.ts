"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/data";
import { localDate } from "@/lib/notifications";
import { guessSection } from "@/lib/sections";
import { buildLists, normName } from "@/lib/shopping";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Build (or rebuild) the main and top-up lists for a plan. Manual items and
 * anything already ticked off or answered are kept.
 */
export async function buildShopping(planId: string): Promise<Result & { missing?: { meal_id: string; name: string }[] }> {
  const { supabase, household } = await requireHousehold();
  const hid = household.id;
  const today = localDate(new Date(), household.timezone);

  const { data: plan } = await supabase.from("plans").select("id, start_date, length_days, plan_slots(*)").eq("id", planId).single();
  if (!plan) return { ok: false, error: "Plan not found" };
  const slots = plan.plan_slots as { id: string; date: string; slot_type: "cook" | "leftovers" | "takeaway" | "out"; meal_id: string | null; variation_id: string | null; leftovers_of_slot_id: string | null }[];
  const mealIds = [...new Set(slots.map((s) => s.meal_id).filter(Boolean))] as string[];

  const [mealsRes, ingRes, pantryRes] = await Promise.all([
    mealIds.length ? supabase.from("meals").select("id, name, servings").in("id", mealIds) : Promise.resolve({ data: [] }),
    mealIds.length ? supabase.from("meal_ingredients").select("meal_id, variation_id, name, quantity, unit, section, optional").in("meal_id", mealIds) : Promise.resolve({ data: [] }),
    supabase.from("pantry_items").select("name, tier, section, regular_quantity").eq("household_id", hid),
  ]);

  const built = buildLists({
    slots,
    meals: mealsRes.data ?? [],
    ingredients: (ingRes.data ?? []).map((i) => ({ ...i, quantity: i.quantity === null ? null : Number(i.quantity) })),
    pantry: pantryRes.data ?? [],
    servings: household.default_servings,
    startDate: plan.start_date,
    lengthDays: plan.length_days,
    from: plan.start_date > today ? plan.start_date : today,
  });

  for (const kind of ["main", "top_up"] as const) {
    const wanted = built.items.filter((i) => i.list === kind);
    const { data: existing } = await supabase.from("shopping_lists").select("id").eq("plan_id", planId).eq("kind", kind).maybeSingle();
    if (!wanted.length && !existing) continue;

    let listId = existing?.id as string | undefined;
    const shopOn = kind === "top_up" ? built.topUpOn : plan.start_date > today ? plan.start_date : today;
    if (!listId) {
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert({ household_id: hid, plan_id: planId, kind, shop_on: shopOn, status: "open", built_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      listId = data.id;
    } else {
      await supabase.from("shopping_lists").update({ shop_on: shopOn, status: "open", built_at: new Date().toISOString() }).eq("id", listId);
    }

    // Keep manual items and anything already dealt with; replace the rest.
    const { data: current } = await supabase.from("shopping_items").select("id, name, source, checked, have, needs_check").eq("list_id", listId);
    const settled = (current ?? []).filter((i) => i.source === "manual" || i.checked || i.have);
    const settledNames = new Set(settled.map((i) => normName(i.name)));
    const stale = (current ?? []).filter((i) => !settled.includes(i)).map((i) => i.id);
    if (stale.length) await supabase.from("shopping_items").delete().in("id", stale);

    const rows = wanted
      .filter((i) => !settledNames.has(normName(i.name)))
      .map((i, idx) => ({
        household_id: hid, list_id: listId, name: i.name, quantity: i.quantity, section: i.section, source: i.source,
        meal_ids: i.meal_ids, needs_check: i.needs_check, note: i.note, sort_order: idx,
      }));
    if (rows.length) {
      const { error } = await supabase.from("shopping_items").insert(rows);
      if (error) return { ok: false, error: error.message };
    }
  }

  revalidatePath("/list");
  return { ok: true, missing: built.missing };
}

export async function setChecked(id: string, checked: boolean): Promise<Result> {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("shopping_items").update({ checked, checked_at: checked ? new Date().toISOString() : null }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Answer a "got this?" pantry check. */
export async function answerCheck(id: string, have: boolean): Promise<Result> {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("shopping_items").update({ needs_check: false, have }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function addItem(listId: string, text: string): Promise<Result> {
  const name = text.trim();
  if (!name) return { ok: false, error: "Type something to add" };
  const { supabase, household } = await requireHousehold();
  const { error } = await supabase.from("shopping_items").insert({
    household_id: household.id, list_id: listId, name: name.charAt(0).toUpperCase() + name.slice(1),
    section: guessSection(name), source: "manual", sort_order: 999,
  });
  revalidatePath("/list");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** A list for things that aren't tied to a plan (or before any plan exists). */
export async function ensureAdhocList(): Promise<Result & { id?: string }> {
  const { supabase, household } = await requireHousehold();
  const { data: existing } = await supabase.from("shopping_lists").select("id").eq("household_id", household.id).eq("kind", "adhoc").eq("status", "open").maybeSingle();
  if (existing) return { ok: true, id: existing.id };
  const { data, error } = await supabase.from("shopping_lists").insert({ household_id: household.id, kind: "adhoc", status: "open" }).select("id").single();
  revalidatePath("/list");
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function removeItem(id: string): Promise<Result> {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  revalidatePath("/list");
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** "We always have this": add to the always-have pantry and drop it from the list. */
export async function alwaysHave(itemId: string): Promise<Result> {
  const { supabase, household } = await requireHousehold();
  const { data: item } = await supabase.from("shopping_items").select("name, section").eq("id", itemId).single();
  if (!item) return { ok: false, error: "Item not found" };
  await savePantry({ name: item.name, tier: "always", section: item.section, regular_quantity: null });
  await supabase.from("shopping_items").delete().eq("id", itemId);
  void household;
  revalidatePath("/list");
  return { ok: true };
}

export async function finishList(listId: string): Promise<Result> {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("shopping_lists").update({ status: "done" }).eq("id", listId);
  revalidatePath("/list");
  return error ? { ok: false, error: error.message } : { ok: true };
}

const Pantry = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Give it a name"),
  tier: z.enum(["always", "usually", "regular"]),
  section: z.string().nullable().optional(),
  regular_quantity: z.string().trim().nullable().optional(),
});

export async function savePantry(input: z.input<typeof Pantry>): Promise<Result> {
  const p = Pantry.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the item" };
  const { supabase, household } = await requireHousehold();
  const row = {
    household_id: household.id,
    name: p.data.name.charAt(0).toUpperCase() + p.data.name.slice(1),
    tier: p.data.tier,
    section: p.data.section || guessSection(p.data.name),
    regular_quantity: p.data.regular_quantity || null,
  };
  let error;
  if (p.data.id) ({ error } = await supabase.from("pantry_items").update(row).eq("id", p.data.id));
  else {
    // Same name already there? Update its tier instead of failing on the unique name.
    const { data: same } = await supabase.from("pantry_items").select("id").eq("household_id", household.id).ilike("name", p.data.name).maybeSingle();
    ({ error } = same ? await supabase.from("pantry_items").update(row).eq("id", same.id) : await supabase.from("pantry_items").insert(row));
  }
  revalidatePath("/list");
  revalidatePath("/list/pantry");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deletePantry(id: string): Promise<Result> {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePath("/list/pantry");
  return error ? { ok: false, error: error.message } : { ok: true };
}

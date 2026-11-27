"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/data";
import { addDays } from "@/lib/notifications";
import { planDates } from "@/lib/planner";

type Result = { ok: true } | { ok: false; error: string };

export async function createPlan(startDate: string, lengthDays: 7 | 14): Promise<Result & { id?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || ![7, 14].includes(lengthDays)) return { ok: false, error: "Pick a start date" };
  const { supabase, household, members } = await requireHousehold();
  const end = addDays(startDate, lengthDays);

  // No overlapping plans: one dinner per night.
  const { data: existing } = await supabase.from("plans").select("start_date, length_days").eq("household_id", household.id).gte("start_date", addDays(startDate, -14));
  const clash = (existing ?? []).find((p) => p.start_date < end && addDays(p.start_date, p.length_days) > startDate);
  if (clash) return { ok: false, error: `That overlaps the plan starting ${clash.start_date}` };

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({ household_id: household.id, start_date: startDate, length_days: lengthDays, status: "draft" })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const primary = members.find((m) => m.is_cook)?.id ?? null;
  const { error: sErr } = await supabase.from("plan_slots").insert(
    planDates(startDate, lengthDays).map((date) => ({
      household_id: household.id, plan_id: plan.id, date, slot_type: "cook", cook_member_id: primary,
    })),
  );
  if (sErr) return { ok: false, error: sErr.message };
  revalidatePath("/plan");
  return { ok: true, id: plan.id };
}

const SlotPatch = z
  .object({
    slot_type: z.enum(["cook", "leftovers", "takeaway", "out"]),
    meal_id: z.string().uuid().nullable(),
    variation_id: z.string().uuid().nullable(),
    cook_member_id: z.string().uuid().nullable(),
    leftovers_of_slot_id: z.string().uuid().nullable(),
    is_busy_night: z.boolean(),
    note: z.string().max(300).nullable(),
  })
  .partial();
export type SlotPatchT = z.infer<typeof SlotPatch>;

export async function updateSlots(updates: { id: string; patch: SlotPatchT }[]): Promise<Result> {
  const parsed = z.array(z.object({ id: z.string().uuid(), patch: SlotPatch })).safeParse(updates);
  if (!parsed.success) return { ok: false, error: "Bad update" };
  const { supabase } = await requireHousehold();
  for (const { id, patch } of parsed.data) {
    const { error } = await supabase.from("plan_slots").update(patch).eq("id", id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/plan");
  return { ok: true };
}

export async function deletePlan(id: string): Promise<Result> {
  const { supabase } = await requireHousehold();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/plan");
  return { ok: true };
}

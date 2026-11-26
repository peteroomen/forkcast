"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/data";

const HouseholdInput = z.object({
  name: z.string().trim().min(1),
  cycle_length_days: z.union([z.literal(7), z.literal(14)]),
  cycle_start_dow: z.number().int().min(0).max(6),
  default_servings: z.number().int().min(1).max(20),
});

const MemberInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Every person needs a name"),
  colour: z.string().regex(/^#[0-9a-f]{6}$/i).nullable(),
  is_cook: z.boolean(),
  gives_feedback: z.boolean(),
});

export async function saveSettings(input: {
  household: z.input<typeof HouseholdInput>;
  members: z.input<typeof MemberInput>[];
  removed: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const h = HouseholdInput.safeParse(input.household);
  if (!h.success) return { ok: false, error: h.error.issues[0]?.message };
  const ms = z.array(MemberInput).safeParse(input.members);
  if (!ms.success) return { ok: false, error: ms.error.issues[0]?.message };

  const { supabase, household } = await requireHousehold();
  const { error } = await supabase.from("households").update(h.data).eq("id", household.id);
  if (error) return { ok: false, error: error.message };

  if (input.removed.length) {
    const { error: dErr } = await supabase.from("members").delete().in("id", input.removed);
    if (dErr) return { ok: false, error: dErr.message };
  }
  for (const [idx, m] of ms.data.entries()) {
    const row = { name: m.name, colour: m.colour, is_cook: m.is_cook, gives_feedback: m.gives_feedback, sort_order: idx };
    const res = m.id
      ? await supabase.from("members").update(row).eq("id", m.id)
      : await supabase.from("members").insert({ ...row, household_id: household.id });
    if (res.error) return { ok: false, error: res.error.message.includes("duplicate") ? `Two people called “${m.name}”` : res.error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOut() {
  const { supabase } = await requireHousehold();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

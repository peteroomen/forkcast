"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/data";
import { sendPush } from "@/lib/push";

const Sub = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function savePushSubscription(sub: unknown, userAgent: string) {
  const parsed = Sub.safeParse(sub);
  if (!parsed.success) return { ok: false, error: "Bad subscription" };
  const { supabase, household, user } = await requireHousehold();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      household_id: household.id,
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };
  // Make sure there's a prefs row so the defaults are visible and editable.
  await supabase.from("notification_prefs").upsert({ user_id: user.id, household_id: household.id }, { onConflict: "user_id", ignoreDuplicates: true });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const { supabase } = await requireHousehold();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  revalidatePath("/settings");
}

const Prefs = z.object({
  morning_at: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  evening_at: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  tonight: z.boolean(),
  prep: z.boolean(),
  planning: z.boolean(),
  produce: z.boolean(),
  planning_lead_days: z.number().int().min(0).max(7),
});
export type PrefsT = z.infer<typeof Prefs>;

export async function saveNotificationPrefs(input: PrefsT, meatFromFreezer: boolean) {
  const parsed = Prefs.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the times" };
  const { supabase, household, user } = await requireHousehold();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ ...parsed.data, user_id: user.id, household_id: household.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };
  await supabase.from("households").update({ meat_from_freezer: meatFromFreezer }).eq("id", household.id);
  revalidatePath("/settings");
  return { ok: true };
}

export async function sendTestNotification() {
  const { supabase, user } = await requireHousehold();
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", user.id);
  if (!subs?.length) return { ok: false, error: "No devices are signed up yet" };
  try {
    const delivered = await sendPush(supabase, subs, {
      kind: "test",
      ref: new Date().toISOString(),
      title: "Tomorrow: Roast Chicken",
      body: "Take the whole chicken out of the freezer. (This is a test.)",
      url: "/settings",
    });
    return delivered ? { ok: true } : { ok: false, error: "The device didn't accept it. Try turning notifications off and on." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}

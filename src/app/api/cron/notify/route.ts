import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, type StoredSubscription } from "@/lib/push";
import {
  addDays, isDue, localDate, localMinutes, planningMessage, prepMessage, tonightMessage,
  type NotificationPayload, type PlanContext,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Run hourly (Supabase pg_cron or any scheduler) with
 * `Authorization: Bearer $CRON_SECRET`. Each person gets each message at most
 * once (notification_log), at or after their chosen time.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date();
  const summary: { household: string; user: string; kind: string; delivered: number }[] = [];

  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id, household_id");
  // Surface config problems (e.g. a bad service key) instead of silently sending nothing.
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs.length) return NextResponse.json({ sent: [], devices: 0 });

  const householdIds = [...new Set(subs.map((s) => s.household_id as string))];
  for (const hid of householdIds) {
    const { data: hh } = await db.from("households").select("*").eq("id", hid).single();
    if (!hh) continue;
    const today = localDate(now, hh.timezone);
    const minutes = localMinutes(now, hh.timezone);

    const [plans, slots, members, prefs] = await Promise.all([
      db.from("plans").select("start_date, length_days").eq("household_id", hid).gte("start_date", addDays(today, -14)),
      db.from("plan_slots").select("*").eq("household_id", hid).gte("date", today).lte("date", addDays(today, 1)),
      db.from("members").select("id, name").eq("household_id", hid),
      db.from("notification_prefs").select("*").eq("household_id", hid),
    ]);

    // Leftovers slots point at the slot they came from; resolve to its meal.
    const slotRows = slots.data ?? [];
    const leftoverSources = slotRows.map((s) => s.leftovers_of_slot_id).filter(Boolean);
    const sourceMeals = new Map<string, string | null>();
    if (leftoverSources.length) {
      const { data } = await db.from("plan_slots").select("id, meal_id").in("id", leftoverSources);
      for (const r of data ?? []) sourceMeals.set(r.id, r.meal_id);
    }
    const mealIds = [...new Set([...slotRows.map((s) => s.meal_id), ...sourceMeals.values()].filter(Boolean))] as string[];
    const [meals, ingredients] = mealIds.length
      ? await Promise.all([
          db.from("meals").select("id, name, prep_note, prep_lead_hours").in("id", mealIds),
          db.from("meal_ingredients").select("meal_id, variation_id, name, section").in("meal_id", mealIds),
        ])
      : [{ data: [] }, { data: [] }];

    const ctx: PlanContext = {
      today,
      meatFromFreezer: hh.meat_from_freezer,
      plans: plans.data ?? [],
      slots: slotRows.map((s) => ({ ...s, leftovers_of_meal_id: s.leftovers_of_slot_id ? sourceMeals.get(s.leftovers_of_slot_id) ?? null : null })),
      meals: meals.data ?? [],
      ingredients: ingredients.data ?? [],
      members: members.data ?? [],
    };

    const users = [...new Set(subs.filter((s) => s.household_id === hid).map((s) => s.user_id as string))];
    for (const userId of users) {
      const p = prefs.data?.find((x) => x.user_id === userId) ?? {
        morning_at: "07:30", evening_at: "19:30", tonight: true, prep: true, planning: true, planning_lead_days: 2,
      };
      const due: NotificationPayload[] = [];
      if (p.tonight && isDue(minutes, p.morning_at)) {
        const n = tonightMessage(ctx);
        if (n) due.push(n);
      }
      if (isDue(minutes, p.evening_at)) {
        if (p.prep) {
          const n = prepMessage(ctx);
          if (n) due.push(n);
        }
        if (p.planning) {
          const n = planningMessage(ctx, p.planning_lead_days);
          if (n) due.push({ ...n, ref: `${n.ref}@${today}` }); // at most one nudge a day
        }
      }

      const userSubs = subs.filter((s) => s.user_id === userId) as StoredSubscription[];
      for (const n of due) {
        // Claim the send first so overlapping runs can't double up.
        const { data: claimed } = await db
          .from("notification_log")
          .upsert({ user_id: userId, kind: n.kind, ref: n.ref }, { onConflict: "user_id,kind,ref", ignoreDuplicates: true })
          .select("id");
        if (!claimed?.length) continue;
        const delivered = await sendPush(db, userSubs, n);
        summary.push({ household: hid, user: userId, kind: n.kind, delivered });
      }
    }
  }

  return NextResponse.json({ sent: summary });
}

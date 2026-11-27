/**
 * What to tell the household, and when. Pure functions over plan data so they
 * can be tested; the cron route does the fetching and sending.
 */

export interface NotificationPayload {
  kind: "tonight" | "prep" | "planning" | "produce" | "test";
  ref: string; // de-dupe key, usually the local date it's about
  title: string;
  body: string;
  url: string;
}

export interface PlanLite { start_date: string; length_days: number }
export interface SlotLite {
  date: string;
  slot_type: "cook" | "leftovers" | "takeaway" | "out";
  meal_id: string | null;
  variation_id: string | null;
  cook_member_id: string | null;
  leftovers_of_meal_id?: string | null;
}
export interface MealLite { id: string; name: string; prep_note: string | null; prep_lead_hours: number | null }
export interface IngredientLite { meal_id: string; variation_id: string | null; name: string; section: string }
export interface MemberLite { id: string; name: string }

export interface PlanContext {
  today: string; // household-local yyyy-mm-dd
  meatFromFreezer: boolean;
  plans: PlanLite[];
  slots: SlotLite[];
  meals: MealLite[];
  ingredients: IngredientLite[];
  members: MemberLite[];
}

// ---------- dates (plain yyyy-mm-dd strings, no timezone surprises) ----------

export function localDate(now: Date, timeZone: string): string {
  return now.toLocaleDateString("en-CA", { timeZone });
}

export function localMinutes(now: Date, timeZone: string): number {
  const [h, m] = now
    .toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-NZ", { ...o, timeZone: "UTC" });
  return `${part({ weekday: "short" })} ${d.getUTCDate()} ${part({ month: "short" })}`;
}

/** "07:30" / "07:30:00" → minutes after midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Is it time to send something scheduled for `at`? True from `at` until a
 * few hours later, so a late or missed cron tick still delivers (the send log
 * stops repeats).
 */
export function isDue(nowMinutes: number, at: string, graceMinutes = 180): boolean {
  const start = timeToMinutes(at);
  return nowMinutes >= start && nowMinutes < start + graceMinutes;
}

// ---------- helpers ----------

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function slotOn(ctx: PlanContext, date: string) {
  return ctx.slots.find((s) => s.date === date) ?? null;
}

function meatFor(ctx: PlanContext, slot: SlotLite): string[] {
  const names = ctx.ingredients
    .filter((i) => i.meal_id === slot.meal_id && (i.variation_id === null || i.variation_id === slot.variation_id))
    .filter((i) => i.section === "meat_seafood")
    .map((i) => i.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").trim());
  return [...new Set(names)];
}

const meal = (ctx: PlanContext, id: string | null) => ctx.meals.find((m) => m.id === id) ?? null;
const member = (ctx: PlanContext, id: string | null) => ctx.members.find((m) => m.id === id) ?? null;

// ---------- messages ----------

/** Morning: tonight's dinner, who's cooking, and any same-day prep. */
export function tonightMessage(ctx: PlanContext): NotificationPayload | null {
  const slot = slotOn(ctx, ctx.today);
  if (!slot || slot.slot_type === "out") return null;
  const base = { kind: "tonight" as const, ref: ctx.today, url: "/plan" };

  if (slot.slot_type === "takeaway") return { ...base, title: "Takeaway night tonight", body: "No cooking. Enjoy the night off." };
  if (slot.slot_type === "leftovers") {
    const from = meal(ctx, slot.leftovers_of_meal_id ?? slot.meal_id);
    return { ...base, title: "Leftovers tonight", body: from ? `${from.name}, round two.` : "Clear out the fridge." };
  }

  const m = meal(ctx, slot.meal_id);
  if (!m) return null;
  const cook = member(ctx, slot.cook_member_id);
  const parts = [cook ? `${cook.name}'s cooking.` : null];
  if (m.prep_note && (m.prep_lead_hours === null || m.prep_lead_hours < 12)) parts.push(`Prep: ${m.prep_note}`);
  return { ...base, title: `Tonight: ${m.name}`, body: parts.filter(Boolean).join(" ") || "Dinner's planned.", url: `/library/${m.id}` };
}

/** Evening: what to do tonight for tomorrow (meat out of the freezer, marinades). */
export function prepMessage(ctx: PlanContext): NotificationPayload | null {
  const tomorrow = addDays(ctx.today, 1);
  const slot = slotOn(ctx, tomorrow);
  if (!slot || slot.slot_type !== "cook") return null;
  const m = meal(ctx, slot.meal_id);
  if (!m) return null;

  const lines: string[] = [];
  const meat = ctx.meatFromFreezer ? meatFor(ctx, slot) : [];
  if (meat.length) lines.push(`Take the ${joinNames(meat)} out of the freezer.`);
  if (m.prep_note && (m.prep_lead_hours ?? 0) >= 12) lines.push(m.prep_note);
  if (!lines.length) return null;

  const cook = member(ctx, slot.cook_member_id);
  return {
    kind: "prep",
    ref: tomorrow,
    title: `Tomorrow: ${m.name}${cook ? ` (${cook.name})` : ""}`,
    body: lines.join(" "),
    url: `/library/${m.id}`,
  };
}

/** Nudge when the next few days aren't covered by any plan. */
export function planningMessage(ctx: PlanContext, leadDays: number): NotificationPayload | null {
  const covered = (d: string) =>
    ctx.plans.some((p) => d >= p.start_date && d < addDays(p.start_date, p.length_days));
  for (let i = 0; i <= leadDays; i++) {
    const d = addDays(ctx.today, i);
    if (!covered(d)) {
      return {
        kind: "planning",
        ref: d,
        title: i === 0 ? "Nothing planned for tonight" : "Time to plan dinners",
        body:
          i === 0
            ? "Ten minutes now saves the scramble. Who's cooking, and what?"
            : `Nothing's planned from ${dayLabel(d)}. Sort the plan and the shopping list in one go.`,
        url: "/plan",
      };
    }
  }
  return null;
}

// ---------- fresh food ----------

export interface BoughtItem { name: string; section: string; boughtOn: string }

/**
 * Morning nudge for fresh things that are about to turn: due the day before
 * their typical shelf life runs out. Mentions tonight's dinner if there is one.
 */
export function produceMessage(
  today: string,
  bought: BoughtItem[],
  shelfLife: (name: string, section: string) => number | null,
  tonight: string | null,
): NotificationPayload | null {
  const due = bought.filter((b) => {
    const days = shelfLife(b.name, b.section);
    return days !== null && addDays(b.boughtOn, Math.max(1, days - 1)) === today;
  });
  if (!due.length) return null;
  const names = [...new Set(due.map((d) => d.name.toLowerCase()))];
  const listed = names.length <= 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const days = Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${due[0].boughtOn}T00:00:00Z`).getTime()) / 86400000);
  return {
    kind: "produce",
    ref: today,
    title: "Use these up soon",
    body: `The ${listed} from ${days} days ago ${names.length === 1 ? "is" : "are"} probably near the end.${tonight ? ` Tonight: ${tonight}.` : ""}`,
    url: "/plan",
  };
}

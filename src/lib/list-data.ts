import "server-only";
import { requireHousehold } from "./data";
import { addDays, localDate } from "./notifications";

export interface ShopItem {
  id: string;
  list_id: string;
  name: string;
  quantity: string | null;
  section: string;
  source: "meal" | "regular" | "manual";
  meal_ids: string[];
  checked: boolean;
  needs_check: boolean;
  have: boolean;
  note: string | null;
  sort_order: number;
}

export interface ShopList {
  id: string;
  plan_id: string | null;
  kind: "main" | "top_up" | "adhoc";
  shop_on: string | null;
  status: "open" | "done";
  built_at: string | null;
  items: ShopItem[];
}

export interface PantryItem {
  id: string;
  name: string;
  tier: "always" | "usually" | "regular";
  section: string;
  regular_quantity: string | null;
}

export interface ListPageData {
  today: string;
  householdId: string;
  plans: { id: string; start_date: string; length_days: number; planned: number }[];
  lists: ShopList[];
  pantry: PantryItem[];
  mealNames: Record<string, string>;
}

export async function getListPage(): Promise<ListPageData> {
  const { supabase, household } = await requireHousehold();
  const hid = household.id;
  const today = localDate(new Date(), household.timezone);

  const [plansRes, listsRes, pantryRes, mealsRes] = await Promise.all([
    supabase.from("plans").select("id, start_date, length_days, plan_slots(meal_id, slot_type)").eq("household_id", hid).gte("start_date", addDays(today, -13)).order("start_date"),
    supabase.from("shopping_lists").select("*, shopping_items(*)").eq("household_id", hid).eq("status", "open").order("created_at"),
    supabase.from("pantry_items").select("id, name, tier, section, regular_quantity").eq("household_id", hid).order("name"),
    supabase.from("meals").select("id, name").eq("household_id", hid),
  ]);

  const plans = (plansRes.data ?? [])
    .filter((p) => addDays(p.start_date, p.length_days) > today)
    .map(({ plan_slots, ...p }) => ({
      ...p,
      planned: (plan_slots as { meal_id: string | null; slot_type: string }[]).filter((s) => s.slot_type === "cook" && s.meal_id).length,
    }));

  const lists: ShopList[] = (listsRes.data ?? []).map(({ shopping_items, ...l }) => ({
    ...l,
    items: [...(shopping_items as ShopItem[])].sort((a, b) => a.sort_order - b.sort_order),
  })) as ShopList[];

  return {
    today,
    householdId: hid,
    plans,
    lists,
    pantry: (pantryRes.data ?? []) as PantryItem[],
    mealNames: Object.fromEntries((mealsRes.data ?? []).map((m) => [m.id, m.name])),
  };
}

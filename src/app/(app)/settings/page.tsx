import { requireHousehold } from "@/lib/data";
import { SettingsForm } from "./SettingsForm";
import { PhoneSettings } from "./PhoneSettings";
import type { PrefsT } from "./notify-actions";

export const metadata = { title: "Settings · Forkcast" };

const DEFAULT_PREFS: PrefsT = {
  morning_at: "07:30",
  evening_at: "19:30",
  tonight: true,
  prep: true,
  planning: true,
  produce: true,
  planning_lead_days: 2,
};

export default async function SettingsPage() {
  const { supabase, household, members, user } = await requireHousehold();
  const { data } = await supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
  const prefs: PrefsT = data
    ? {
        morning_at: data.morning_at.slice(0, 5),
        evening_at: data.evening_at.slice(0, 5),
        tonight: data.tonight,
        prep: data.prep,
        planning: data.planning,
        produce: data.produce,
        planning_lead_days: data.planning_lead_days,
      }
    : DEFAULT_PREFS;
  return (
    <SettingsForm
      household={household}
      members={members}
      email={user.email ?? ""}
      phone={<PhoneSettings prefs={prefs} meatFromFreezer={household.meat_from_freezer} />}
    />
  );
}

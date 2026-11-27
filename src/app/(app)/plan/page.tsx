import { requireHousehold } from "@/lib/data";
import { getPlanPage } from "@/lib/plan-data";
import { PlanScreen } from "./PlanScreen";

export const metadata = { title: "Plan · Forkcast" };

export default async function PlanPage() {
  const [{ members, household }, data] = await Promise.all([requireHousehold(), getPlanPage()]);
  return <PlanScreen data={data} members={members} cycleLength={household.cycle_length_days} />;
}

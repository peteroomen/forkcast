import { PlannerClient } from "@/components/planner/PlannerClient";
import { StartPlan } from "@/components/planner/StartPlan";
import { getActivePlan, getCooks, getPlanDays, getRecipes } from "@/lib/data";
import { nextMonday, toISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const [plan, recipes, cooks] = await Promise.all([
    getActivePlan(),
    getRecipes(),
    getCooks(),
  ]);

  if (!plan) {
    const suggested = toISODate(nextMonday(new Date()));
    return <StartPlan suggestedStartISO={suggested} />;
  }

  const days = await getPlanDays(plan.id);

  return (
    <PlannerClient
      plan={plan}
      days={days}
      recipes={recipes}
      cooks={cooks}
      newPlanStartISO={toISODate(nextMonday(new Date()))}
    />
  );
}

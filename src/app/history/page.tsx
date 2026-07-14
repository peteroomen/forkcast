import { AppShell } from "@/components/AppShell";
import { getPublishedPlans, getPlanDays, getRecipes } from "@/lib/data";
import { addDays, formatDate, fromISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [plans, recipes] = await Promise.all([
    getPublishedPlans(),
    getRecipes(),
  ]);
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  const withMeals = await Promise.all(
    plans.map(async (plan) => {
      const days = await getPlanDays(plan.id);
      const meals = days
        .filter((d) => d.slot_type === "meal" && d.recipe_id)
        .map((d) => recipeById.get(d.recipe_id!)?.name)
        .filter((n): n is string => Boolean(n));
      return { plan, meals };
    }),
  );

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-base-content/60">
            Published fortnights — used to avoid repeating meals too soon.
          </p>
        </div>

        {withMeals.length === 0 ? (
          <p className="py-10 text-center text-sm text-base-content/50">
            No published plans yet. Publish a fortnight from the planner.
          </p>
        ) : (
          withMeals.map(({ plan, meals }) => {
            const start = fromISODate(plan.fortnight_start);
            return (
              <section key={plan.id} className="card bg-base-100 shadow-sm">
                <div className="card-body gap-2 p-4">
                  <h2 className="card-title text-base">
                    {formatDate(start)} – {formatDate(addDays(start, 13))}
                  </h2>
                  <p className="text-sm text-base-content/70">
                    {meals.length ? meals.join(" · ") : "No meals recorded."}
                  </p>
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

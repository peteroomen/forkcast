import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getActivePlan, getPlanDays, getRecipes } from "@/lib/data";
import { fromISODate, formatDate, addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recipes, plan] = await Promise.all([getRecipes(), getActivePlan()]);
  const missing = recipes.filter((r) => r.needs_recipe);
  const planDays = plan ? await getPlanDays(plan.id) : [];
  const filled = planDays.filter(
    (d) => d.slot_type !== "meal" || d.recipe_id,
  ).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Evening, kitchen 👋
          </h1>
          <p className="text-sm text-base-content/60">
            {recipes.length} recipes in the library · plan a fortnight in
            minutes.
          </p>
        </div>

        {/* Current plan card */}
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {plan ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="card-title text-base">
                    Fortnight from{" "}
                    {formatDate(fromISODate(plan.fortnight_start))} –{" "}
                    {formatDate(addDays(fromISODate(plan.fortnight_start), 13))}
                  </h2>
                  <span
                    className={`badge ${
                      plan.status === "published"
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
                <progress
                  className="progress progress-primary w-full"
                  value={filled}
                  max={14}
                />
                <p className="text-sm text-base-content/60">
                  {filled}/14 nights sorted
                </p>
                <Link href="/planner" className="btn btn-primary btn-sm mt-2">
                  Open planner
                </Link>
              </>
            ) : (
              <>
                <h2 className="card-title text-base">No plan yet</h2>
                <p className="text-sm text-base-content/60">
                  Start your first fortnight — cook nights auto-fill for Jamie
                  &amp; Megan.
                </p>
                <Link href="/planner" className="btn btn-primary btn-sm mt-2">
                  Start planning
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Quick tiles */}
        <section className="grid grid-cols-2 gap-3">
          <Tile href="/library" icon="📖" label="Recipe library" />
          <Tile href="/shopping" icon="🛒" label="Shopping list" />
          <Tile href="/discover" icon="✨" label="Discover meals" />
          <Tile href="/pantry" icon="🧺" label="Pantry check" />
        </section>

        {/* Missing recipes nudge */}
        {missing.length > 0 && (
          <section className="alert border border-warning/30 bg-warning/10">
            <div>
              <h3 className="font-semibold">
                {missing.length} recipes owed by Peter
              </h3>
              <p className="text-sm text-base-content/70">
                Planned by name, details still needed:{" "}
                {missing.map((m) => m.name).join(", ")}.
              </p>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Tile({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card touch-row items-start justify-center gap-1 bg-base-100 p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

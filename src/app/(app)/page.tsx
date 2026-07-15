import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Package,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evening, kitchen</h1>
        <p className="text-sm text-base-content/60">
          {recipes.length} recipes in the library · plan a fortnight in minutes.
        </p>
      </div>

      {/* Current plan card */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {plan ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="card-title text-base">
                  Fortnight from {formatDate(fromISODate(plan.fortnight_start))}{" "}
                  – {formatDate(addDays(fromISODate(plan.fortnight_start), 13))}
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
        <Tile href="/library" icon={BookOpen} label="Recipe library" />
        <Tile href="/shopping" icon={ShoppingCart} label="Shopping list" />
        <Tile href="/discover" icon={Sparkles} label="Discover meals" />
        <Tile href="/pantry" icon={Package} label="Pantry check" />
      </section>

      {/* Missing recipes nudge — compact, tappable through to the library */}
      {missing.length > 0 && (
        <Link
          href="/library?filter=owed"
          className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10"
        >
          <TriangleAlert className="size-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {missing.length} recipes owed by Peter
            </p>
            <p className="truncate text-xs text-base-content/50">
              {missing
                .slice(0, 4)
                .map((m) => m.name)
                .join(", ")}
              {missing.length > 4 ? `, +${missing.length - 4} more` : ""}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-base-content/40" />
        </Link>
      )}
    </div>
  );
}

function Tile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card bg-base-100 p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="mt-2 text-sm font-medium">{label}</span>
    </Link>
  );
}

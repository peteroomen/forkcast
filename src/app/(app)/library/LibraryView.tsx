"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Brain, Link2, Plus, Search, X } from "lucide-react";
import type { LibraryMeal } from "@/lib/data";
import type { Member } from "@/lib/types";
import { dueInfo, dueSortKey } from "@/lib/rotation";
import { CookDots, DueBadge, EffortTag, PROTEIN_LABEL } from "@/components/bits";

type Sort = "due" | "az" | "recent";

export function LibraryView({ meals, members }: { meals: LibraryMeal[]; members: Member[] }) {
  const [q, setQ] = useState("");
  const [cook, setCook] = useState<string | null>(null);
  const [protein, setProtein] = useState<string | null>(null);
  const [quick, setQuick] = useState(false);
  const [needsRecipe, setNeedsRecipe] = useState(false);
  const [course, setCourse] = useState<"main" | "other">("main");
  const [sort, setSort] = useState<Sort>("due");

  const cooks = members.filter((m) => m.is_cook);
  const proteins = useMemo(
    () => [...new Set(meals.map((m) => m.protein).filter(Boolean) as string[])].sort(),
    [meals],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = meals
      .filter((m) => (course === "main" ? m.course === "main" : m.course !== "main"))
      .filter((m) => !cook || m.cook_ids.includes(cook))
      .filter((m) => !protein || m.protein === protein)
      .filter((m) => !quick || m.effort === "quick")
      .filter((m) => !needsRecipe || m.needs_recipe)
      .filter(
        (m) =>
          !needle ||
          m.name.toLowerCase().includes(needle) ||
          m.cuisine?.toLowerCase().includes(needle) ||
          m.variation_names.some((v) => v.toLowerCase().includes(needle)) ||
          m.tags.some((t) => t.includes(needle)),
      )
      .map((m) => ({ meal: m, due: dueInfo(m.stats?.days_since ?? null, m.target_interval_days) }));

    if (sort === "az") list.sort((a, b) => a.meal.name.localeCompare(b.meal.name));
    else if (sort === "recent")
      list.sort((a, b) => (b.meal.stats?.last_cooked ?? "").localeCompare(a.meal.stats?.last_cooked ?? ""));
    else list.sort((a, b) => dueSortKey(a.due) - dueSortKey(b.due) || a.meal.name.localeCompare(b.meal.name));
    return list;
  }, [meals, q, cook, protein, quick, needsRecipe, course, sort]);

  const filtersOn = !!(cook || protein || quick || needsRecipe || q);
  const dueCount = rows.filter((r) => r.due.state === "due" || r.due.state === "overdue").length;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Meals</h1>
          <p className="mt-1 text-[14px] text-muted">
            {meals.filter((m) => m.course === "main").length} dinners
            {dueCount > 0 && <> · <span className="text-warn">{dueCount} due</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/library/new?import=1" className="btn-ghost px-3" aria-label="Import from a link">
            <Link2 className="size-4" /> <span className="hidden sm:inline">Import</span>
          </Link>
          <Link href="/library/new" className="btn-primary px-3">
            <Plus className="size-4" /> <span className="hidden sm:inline">Add meal</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search meals, cuisines, variations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted" aria-label="Clear search">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {cooks.map((c) => (
          <button key={c.id} className="chip" data-on={cook === c.id} onClick={() => setCook(cook === c.id ? null : c.id)}>
            <span className="size-2 rounded-full" style={{ background: c.colour ?? "var(--muted)" }} />
            {c.name}&apos;s
          </button>
        ))}
        <button className="chip" data-on={quick} onClick={() => setQuick(!quick)}>Quick</button>
        {proteins.map((p) => (
          <button key={p} className="chip" data-on={protein === p} onClick={() => setProtein(protein === p ? null : p)}>
            {PROTEIN_LABEL[p] ?? p}
          </button>
        ))}
        <button className="chip" data-on={needsRecipe} onClick={() => setNeedsRecipe(!needsRecipe)}>Needs writing down</button>
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px]">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {(["main", "other"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCourse(c)}
              className={`rounded-md px-3 py-1 font-medium ${course === c ? "bg-surface-2 text-ink" : "text-muted"}`}
            >
              {c === "main" ? "Dinners" : "Sides & desserts"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-muted">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-line bg-surface px-2 py-1 text-ink">
            <option value="due">Due first</option>
            <option value="recent">Last cooked</option>
            <option value="az">A–Z</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-[15px] text-muted">
          {filtersOn ? "No meals match those filters." : "No meals yet. Add your first one."}
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {rows.map(({ meal, due }) => (
            <li key={meal.id} className="min-w-0">
              <Link href={`/library/${meal.id}`} className="card flex items-start gap-3 p-3.5 transition hover:border-brand/40">
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${meal.kind === "recipe" ? "bg-accent-soft text-accent" : "bg-brand-soft text-brand"}`}
                  title={meal.kind === "recipe" ? "From a recipe" : "From my head"}
                >
                  {meal.kind === "recipe" ? <BookOpen className="size-[18px]" /> : <Brain className="size-[18px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-[16px] font-semibold">{meal.name}</span>
                    <CookDots ids={meal.cook_ids} members={members} />
                  </span>
                  {meal.variation_names.length > 0 && (
                    <span className="mt-0.5 block truncate text-[13px] text-muted">{meal.variation_names.join(" · ")}</span>
                  )}
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <DueBadge info={due} />
                    <EffortTag effort={meal.effort} minutes={meal.total_minutes} />
                    {meal.needs_recipe && <span className="text-[12px] text-warn">Needs writing down</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

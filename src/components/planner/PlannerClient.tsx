"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Croissant, Sparkles, Timer, TriangleAlert, X } from "lucide-react";
import {
  assignMeal,
  createPlan,
  generateShoppingList,
  publishPlan,
  setSlotNote,
  setSlotType,
} from "@/lib/actions";
import {
  detectBannedIngredients,
  detectConflicts,
  sidePairingFor,
  SLOT_TYPES,
  type SlotType,
} from "@/lib/constants";
import {
  addDays,
  dayName,
  formatDate,
  fromISODate,
  weekdayIndex,
} from "@/lib/dates";
import type { Cook, Plan, PlanDay, Recipe } from "@/lib/types";
import { RecipePicker } from "./RecipePicker";

type Props = {
  plan: Plan;
  days: PlanDay[];
  recipes: Recipe[];
  cooks: Cook[];
  newPlanStartISO: string;
};

const SLOT_LABEL: Record<SlotType, string> = {
  meal: "Meal",
  takeaway: "Takeaway",
  leftover: "Leftovers",
  "games-night": "Games night",
};

export function PlannerClient({
  plan,
  days,
  recipes,
  cooks,
  newPlanStartISO,
}: Props) {
  const router = useRouter();
  const [pickerFor, setPickerFor] = useState<PlanDay | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recipeById = useMemo(
    () => new Map(recipes.map((r) => [r.id, r])),
    [recipes],
  );
  const cookById = useMemo(() => new Map(cooks.map((c) => [c.id, c])), [cooks]);

  const start = fromISODate(plan.fortnight_start);

  const assignedNames = days
    .filter((d) => d.slot_type === "meal" && d.recipe_id)
    .map((d) => recipeById.get(d.recipe_id!)?.name ?? "")
    .filter(Boolean);
  const conflicts = detectConflicts(assignedNames);

  const filledCount = days.filter(
    (d) => d.slot_type !== "meal" || d.recipe_id,
  ).length;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function suggest(day: PlanDay) {
    setSuggestingId(day.id);
    try {
      const cook = day.cook_id ? cookById.get(day.cook_id) : null;
      const isJamie = cook?.name.toLowerCase() === "jamie";
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookName: cook?.name ?? null,
          quickOnly: isJamie,
          weekend: weekdayIndex(fromISODate(day.date)) === 6,
          plannedNames: assignedNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Suggestion failed.");
        return;
      }
      if (data.recipe_id) {
        startTransition(async () => {
          await assignMeal(day.id, data.recipe_id);
          router.refresh();
        });
      }
      flash(`${data.meal} — ${data.reason}`);
    } catch {
      flash("Suggestion failed. Try again.");
    } finally {
      setSuggestingId(null);
    }
  }

  const weeks = [days.slice(0, 7), days.slice(7, 14)];

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planner</h1>
          <p className="text-sm text-base-content/60">
            {formatDate(start)} – {formatDate(addDays(start, 13))} ·{" "}
            {filledCount}/14 sorted
          </p>
        </div>
        <span
          className={`badge ${
            plan.status === "published" ? "badge-success" : "badge-warning"
          }`}
        >
          {plan.status}
        </span>
      </div>

      {/* Conflict banner */}
      {conflicts.length > 0 && (
        <div className="alert alert-error text-sm">
          <TriangleAlert className="size-4" />
          Same-week clash:{" "}
          {conflicts.map(([a, b]) => `${a} + ${b}`).join(", ")} — house rule says
          not in the same week.
        </div>
      )}

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <section key={wi} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-base-content/40">
            Week {wi + 1}
          </h2>
          {week.map((day) => {
            const recipe = day.recipe_id ? recipeById.get(day.recipe_id) : null;
            const cook = day.cook_id ? cookById.get(day.cook_id) : null;
            const wd = weekdayIndex(fromISODate(day.date));
            const celery = recipe
              ? detectBannedIngredients(recipe.ingredients)
              : [];
            const side = recipe ? sidePairingFor(recipe.name) : null;
            const isJamie = cook?.name.toLowerCase() === "jamie";

            return (
              <div
                key={day.id}
                className="card bg-base-100 shadow-sm"
              >
                <div className="card-body gap-2 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {dayName(wd)}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {formatDate(fromISODate(day.date))}
                      </span>
                      {cook && (
                        <span className="badge badge-ghost badge-sm">
                          {cook.name}
                        </span>
                      )}
                      {wd === 6 && (
                        <span className="badge badge-outline badge-sm">
                          big-lift ok
                        </span>
                      )}
                    </div>
                    <select
                      className="select select-ghost select-xs"
                      value={day.slot_type}
                      onChange={(e) =>
                        startTransition(async () => {
                          await setSlotType(day.id, e.target.value as SlotType);
                          router.refresh();
                        })
                      }
                    >
                      {SLOT_TYPES.map((s) => (
                        <option key={s} value={s}>
                          {SLOT_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {day.slot_type === "meal" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          className={`flex-1 rounded-lg border border-dashed border-base-300 px-3 py-2 text-left text-sm ${
                            recipe ? "font-medium" : "text-base-content/40"
                          }`}
                          onClick={() => setPickerFor(day)}
                        >
                          {recipe ? recipe.name : "Tap to add a meal…"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-square"
                          disabled={suggestingId === day.id}
                          onClick={() => suggest(day)}
                          title="AI suggestion"
                          aria-label="AI suggestion"
                        >
                          {suggestingId === day.id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                        </button>
                        {recipe && (
                          <button
                            className="btn btn-ghost btn-sm btn-square"
                            onClick={() =>
                              startTransition(async () => {
                                await assignMeal(day.id, null);
                                router.refresh();
                              })
                            }
                            aria-label="Clear"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                      {celery.length > 0 && (
                        <p className="flex items-center gap-1 text-xs text-error">
                          <TriangleAlert className="size-3.5" />
                          {recipe?.name} has {celery.join(", ")} — swap it out.
                        </p>
                      )}
                      {side && (
                        <p className="flex items-center gap-1 text-xs text-base-content/50">
                          <Croissant className="size-3.5" /> Pair with {side}.
                        </p>
                      )}
                      {isJamie &&
                        recipe &&
                        (recipe.time_minutes == null ||
                          recipe.time_minutes > 30) && (
                          <p className="flex items-center gap-1 text-xs text-warning">
                            <Timer className="size-3.5" />
                            Jamie&apos;s night — this looks over 30 min.
                          </p>
                        )}
                    </>
                  ) : (
                    <NoteRow day={day} onSaved={() => router.refresh()} />
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {/* Actions */}
      <div className="sticky bottom-20 z-10 flex gap-2 lg:bottom-4">
        <button
          className="btn btn-outline flex-1"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await generateShoppingList(plan.id);
              flash("Shopping list generated.");
              router.push("/shopping");
            })
          }
        >
          Generate list
        </button>
        {plan.status === "draft" ? (
          <button
            className="btn btn-primary flex-1"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await generateShoppingList(plan.id);
                await publishPlan(plan.id);
                flash("Fortnight published.");
                router.refresh();
              })
            }
          >
            Publish
          </button>
        ) : (
          <button
            className="btn btn-primary flex-1"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await createPlan(newPlanStartISO);
                router.refresh();
              })
            }
          >
            New fortnight
          </button>
        )}
      </div>

      {pickerFor && (
        <RecipePicker
          recipes={recipes}
          quickOnly={
            pickerFor.cook_id
              ? cookById.get(pickerFor.cook_id)?.name.toLowerCase() === "jamie"
              : false
          }
          onPick={(recipeId) => {
            const dayId = pickerFor.id;
            setPickerFor(null);
            startTransition(async () => {
              await assignMeal(dayId, recipeId);
              router.refresh();
            });
          }}
          onClose={() => setPickerFor(null)}
        />
      )}

      {toast && (
        <div className="toast toast-center z-50">
          <div className="alert alert-info">
            <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteRow({ day, onSaved }: { day: PlanDay; onSaved: () => void }) {
  const [note, setNote] = useState(day.note ?? "");
  const [, startTransition] = useTransition();
  const isGames = day.slot_type === "games-night";
  return (
    <div>
      {isGames && (
        <p className="mb-1 text-xs text-base-content/50">
          Snacks go on the shopping list, not the dinner grid.
        </p>
      )}
      <input
        className="input input-bordered input-sm w-full"
        placeholder={isGames ? "Snacks to buy…" : "Note (e.g. Thai takeaway)"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() =>
          startTransition(async () => {
            await setSlotNote(day.id, note);
            onSaved();
          })
        }
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteRecipe, toggleFavourite } from "@/lib/actions";
import { detectBannedIngredients, CELERY_SUBSTITUTES } from "@/lib/constants";
import type { Recipe } from "@/lib/types";
import { RecipeBadges } from "./RecipeBadges";
import { RecipeEditor } from "./RecipeEditor";

type Filter = "all" | "favourites" | "quick" | "kid" | "owed";

export function LibraryClient({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Recipe | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.cuisine ?? "").toLowerCase().includes(q))
        return false;
      switch (filter) {
        case "favourites":
          return r.is_favourite;
        case "quick":
          return r.time_minutes != null && r.time_minutes <= 30;
        case "kid":
          return r.tags.includes("kid-friendly");
        case "owed":
          return r.needs_recipe;
        default:
          return true;
      }
    });
  }, [recipes, query, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Recipe library</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
          + Add
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search recipes…"
        className="input input-bordered w-full"
      />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {(
          [
            ["all", "All"],
            ["favourites", "★ Favourites"],
            ["quick", "≤30 min"],
            ["kid", "Kid-friendly"],
            ["owed", "Recipe owed"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`btn btn-sm whitespace-nowrap ${
              filter === key ? "btn-primary" : "btn-ghost"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-base-content/50">
        {filtered.length} of {recipes.length} recipes
      </p>

      <ul className="space-y-2">
        {filtered.map((r) => {
          const celery = detectBannedIngredients(r.ingredients);
          return (
            <li key={r.id} className="card bg-base-100 shadow-sm">
              <div className="card-body gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="text-left font-semibold hover:underline"
                    onClick={() => setEditing(r)}
                  >
                    {r.name}
                    {r.cuisine && (
                      <span className="ml-2 text-xs font-normal text-base-content/50">
                        {r.cuisine}
                      </span>
                    )}
                  </button>
                  <button
                    aria-label="Toggle favourite"
                    className="text-lg"
                    onClick={() =>
                      startTransition(() =>
                        toggleFavourite(r.id, !r.is_favourite),
                      )
                    }
                  >
                    {r.is_favourite ? "★" : "☆"}
                  </button>
                </div>
                <RecipeBadges recipe={r} />
                {celery.length > 0 && (
                  <div className="alert alert-error px-3 py-2 text-xs">
                    ⚠️ Contains {celery.join(", ")} — swap for{" "}
                    {CELERY_SUBSTITUTES.join(" / ")} (house rule: no celery).
                  </div>
                )}
                {r.notes && (
                  <p className="text-xs text-base-content/60">{r.notes}</p>
                )}
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-base-content/50">
            No recipes match.
          </li>
        )}
      </ul>

      {editing && (
        <RecipeEditor
          recipe={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={
            editing === "new"
              ? undefined
              : () => {
                  const id = editing.id;
                  startTransition(async () => {
                    await deleteRecipe(id);
                    setEditing(null);
                  });
                }
          }
          busy={isPending}
        />
      )}
    </div>
  );
}

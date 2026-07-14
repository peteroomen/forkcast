"use client";

import { useState, useTransition } from "react";
import { upsertRecipe } from "@/lib/actions";
import {
  CATEGORIES,
  CELERY_SUBSTITUTES,
  COOKS,
  RECIPE_TAGS,
  detectBannedIngredients,
  type Category,
  type CookKey,
  type RecipeTag,
} from "@/lib/constants";
import type { Ingredient, Recipe } from "@/lib/types";

type Props = {
  recipe: Recipe | null;
  onClose: () => void;
  onDelete?: () => void;
  busy?: boolean;
};

const TAG_LABEL: Record<RecipeTag, string> = {
  "megan-friendly": "Megan",
  "jamie-friendly": "Jamie",
  "kid-friendly": "Kid-friendly",
  "weekend-cook": "Weekend",
  quick: "≤30 min",
  new: "New",
};

export function RecipeEditor({ recipe, onClose, onDelete, busy }: Props) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [cuisine, setCuisine] = useState(recipe?.cuisine ?? "");
  const [timeMinutes, setTimeMinutes] = useState<string>(
    recipe?.time_minutes != null ? String(recipe.time_minutes) : "",
  );
  const [servings, setServings] = useState<string>(
    String(recipe?.servings ?? 4),
  );
  const [cookedBy, setCookedBy] = useState<CookKey>(recipe?.cooked_by ?? "anyone");
  const [tags, setTags] = useState<RecipeTag[]>(recipe?.tags ?? []);
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url ?? "");
  const [needsRecipe, setNeedsRecipe] = useState(recipe?.needs_recipe ?? false);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const celery = detectBannedIngredients(ingredients);

  function updateIngredient(i: number, patch: Partial<Ingredient>) {
    setIngredients((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)),
    );
  }

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const payload = {
      ...(recipe ? { id: recipe.id } : {}),
      name: name.trim(),
      cuisine: cuisine.trim() || null,
      source_url: sourceUrl.trim() || null,
      time_minutes: timeMinutes ? Number(timeMinutes) : null,
      servings: Number(servings) || 4,
      cooked_by: cookedBy,
      tags,
      notes: notes.trim() || null,
      needs_recipe: needsRecipe,
      is_favourite: recipe?.is_favourite ?? false,
      ingredients: ingredients.filter((i) => i.name.trim()),
    };
    startTransition(async () => {
      try {
        await upsertRecipe(payload);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-h-[90vh] max-w-lg">
        <h3 className="text-lg font-bold">
          {recipe ? "Edit recipe" : "New recipe"}
        </h3>

        <div className="mt-3 space-y-3">
          <input
            className="input input-bordered w-full"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input input-bordered w-full"
              placeholder="Cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
            />
            <select
              className="select select-bordered w-full"
              value={cookedBy}
              onChange={(e) => setCookedBy(e.target.value as CookKey)}
            >
              {COOKS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input input-bordered w-full"
              placeholder="Time (min)"
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(e.target.value)}
            />
            <input
              type="number"
              className="input input-bordered w-full"
              placeholder="Servings"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
          <input
            className="input input-bordered w-full"
            placeholder="Source URL (optional)"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {RECIPE_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setTags((prev) =>
                    prev.includes(t)
                      ? prev.filter((x) => x !== t)
                      : [...prev, t],
                  )
                }
                className={`btn btn-xs ${
                  tags.includes(t) ? "btn-primary" : "btn-outline"
                }`}
              >
                {TAG_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Ingredients */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold">Ingredients</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() =>
                  setIngredients((prev) => [
                    ...prev,
                    { name: "", qty: null, unit: null, category: "Other" },
                  ])
                }
              >
                + row
              </button>
            </div>
            {celery.length > 0 && (
              <div className="alert alert-error mb-2 px-3 py-2 text-xs">
                ⚠️ No celery allowed — swap for {CELERY_SUBSTITUTES.join(" / ")}.
              </div>
            )}
            <div className="space-y-1">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    className="input input-bordered input-sm flex-1"
                    placeholder="name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  />
                  <input
                    className="input input-bordered input-sm w-14"
                    placeholder="qty"
                    value={ing.qty ?? ""}
                    onChange={(e) =>
                      updateIngredient(i, {
                        qty: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <input
                    className="input input-bordered input-sm w-16"
                    placeholder="unit"
                    value={ing.unit ?? ""}
                    onChange={(e) =>
                      updateIngredient(i, { unit: e.target.value || null })
                    }
                  />
                  <select
                    className="select select-bordered select-sm w-24"
                    value={ing.category}
                    onChange={(e) =>
                      updateIngredient(i, {
                        category: e.target.value as Category,
                      })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-2"
                    onClick={() =>
                      setIngredients((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Notes / next-time tips…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={needsRecipe}
              onChange={(e) => setNeedsRecipe(e.target.checked)}
            />
            Recipe still owed (plan by name, no ingredients yet)
          </label>

          {error && <p className="text-sm text-error">{error}</p>}
        </div>

        <div className="modal-action">
          {onDelete && (
            <button
              className="btn btn-ghost text-error"
              onClick={onDelete}
              disabled={busy || isPending}
            >
              Delete
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Star, X } from "lucide-react";
import { JAMIE_MAX_MINUTES } from "@/lib/constants";
import type { Recipe } from "@/lib/types";

type Props = {
  recipes: Recipe[];
  quickOnly?: boolean;
  onPick: (recipeId: string) => void;
  onClose: () => void;
};

export function RecipePicker({ recipes, quickOnly, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (quickOnly && !(r.time_minutes != null && r.time_minutes <= JAMIE_MAX_MINUTES))
        return false;
      if (favOnly && !r.is_favourite) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recipes, query, favOnly, quickOnly]);

  return (
    <div className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box max-h-[85vh] sm:max-w-lg">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            Pick a meal
            {quickOnly && (
              <span className="ml-2 badge badge-warning badge-sm">
                ≤{JAMIE_MAX_MINUTES} min (Jamie)
              </span>
            )}
          </h3>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <input
          autoFocus
          className="input input-bordered mb-2 w-full"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
          />
          Favourites only
        </label>

        <ul className="max-h-[55vh] space-y-1 overflow-y-auto">
          {list.map((r) => (
            <li key={r.id}>
              <button
                className="touch-row flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-base-200"
                onClick={() => onPick(r.id)}
              >
                <span className="min-w-0">
                  <span className="font-medium">{r.name}</span>
                  {r.needs_recipe && (
                    <span className="ml-2 badge badge-error badge-xs">owed</span>
                  )}
                  {r.cuisine && (
                    <span className="ml-2 text-xs text-base-content/50">
                      {r.cuisine}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {r.is_favourite && (
                    <Star className="size-3.5 fill-warning text-warning" />
                  )}
                  {r.time_minutes != null && (
                    <span className="text-xs text-base-content/50">
                      {r.time_minutes}m
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="py-6 text-center text-sm text-base-content/50">
              No matches.
            </li>
          )}
        </ul>
      </div>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  );
}

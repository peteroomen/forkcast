"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Plus, X } from "lucide-react";
import {
  addLowStockToShopping,
  addPantryItem,
  deletePantryItem,
  setPantryStaple,
  setPantryStatus,
} from "@/lib/actions";
import { CATEGORIES } from "@/lib/constants";
import { CATEGORY_ORDER, groupByCategory } from "@/lib/shopping";
import type { PantryItem, PantryStatus } from "@/lib/types";

const STATUS: { key: PantryStatus; label: string; cls: string }[] = [
  { key: "in-stock", label: "In stock", cls: "btn-success" },
  { key: "low", label: "Low", cls: "btn-warning" },
  { key: "out", label: "Out", cls: "btn-error" },
];

export function PantryClient({
  items,
  planId,
}: {
  items: PantryItem[];
  planId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const grouped = groupByCategory(items);
  const lowOrOut = items.filter(
    (i) => i.status !== "in-stock" && !i.is_staple,
  ).length;
  const stapleCount = items.filter((i) => i.is_staple).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pantry</h1>
        <p className="text-sm text-base-content/60">
          Mark what&apos;s low or out. Pin staples (always in stock) to skip them
          on the shopping list — {stapleCount} pinned.
        </p>
      </div>

      {planId && lowOrOut > 0 && (
        <button
          className="btn btn-primary btn-block"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await addLowStockToShopping(planId);
              router.push("/shopping");
            })
          }
        >
          Add {lowOrOut} low/out item{lowOrOut > 1 ? "s" : ""} to shopping list
        </button>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const rows = grouped[cat];
        if (!rows.length) return null;
        return (
          <section key={cat}>
            <h2 className="mb-1 text-sm font-semibold">{cat}</h2>
            <ul className="space-y-2">
              {rows.map((item) => (
                <li key={item.id} className="card bg-base-100 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      {item.name}
                      {item.is_staple && (
                        <span className="badge badge-ghost badge-xs gap-1">
                          <Pin className="size-3" /> staple
                        </span>
                      )}
                      {!item.is_food && (
                        <span className="badge badge-outline badge-xs">
                          non-food
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn btn-ghost btn-xs btn-square"
                        title={
                          item.is_staple ? "Unpin staple" : "Pin as staple"
                        }
                        aria-label={
                          item.is_staple ? "Unpin staple" : "Pin as staple"
                        }
                        onClick={() =>
                          startTransition(async () => {
                            await setPantryStaple(item.id, !item.is_staple);
                            router.refresh();
                          })
                        }
                      >
                        {item.is_staple ? (
                          <PinOff className="size-4" />
                        ) : (
                          <Pin className="size-4" />
                        )}
                      </button>
                      <button
                        className="btn btn-ghost btn-xs btn-square"
                        aria-label="Remove"
                        onClick={() =>
                          startTransition(async () => {
                            await deletePantryItem(item.id);
                            router.refresh();
                          })
                        }
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 join">
                    {STATUS.map((s) => (
                      <button
                        key={s.key}
                        className={`btn join-item btn-xs ${
                          item.status === s.key ? s.cls : "btn-ghost"
                        }`}
                        onClick={() =>
                          startTransition(async () => {
                            await setPantryStatus(item.id, s.key);
                            router.refresh();
                          })
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {showAdd ? (
        <form
          action={(fd) => {
            startTransition(async () => {
              await addPantryItem(fd);
              setShowAdd(false);
              router.refresh();
            });
          }}
          className="card bg-base-100 p-3 shadow-sm"
        >
          <div className="flex gap-2">
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. Dishwasher tablets"
              className="input input-bordered input-sm flex-1"
            />
            <select
              name="category"
              className="select select-bordered select-sm"
              defaultValue="Pantry"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_food"
                defaultChecked
                className="checkbox checkbox-sm"
              />
              Food item
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_staple"
                className="checkbox checkbox-sm"
              />
              Staple (always in stock)
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Add
            </button>
          </div>
        </form>
      ) : (
        <button
          className="btn btn-outline btn-block"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="size-4" /> Add pantry item
        </button>
      )}
    </div>
  );
}

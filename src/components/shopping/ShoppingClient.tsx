"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Apple,
  Beef,
  Egg,
  Plus,
  RefreshCw,
  Snowflake,
  ShoppingBasket,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  addShoppingItem,
  deleteShoppingItem,
  generateShoppingList,
  toggleShoppingItem,
} from "@/lib/actions";
import { CATEGORIES, type Category } from "@/lib/constants";
import { CATEGORY_ORDER, groupByCategory } from "@/lib/shopping";
import type { ShoppingItem } from "@/lib/types";

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Produce: Apple,
  "Meat & Fish": Beef,
  "Dairy & Eggs": Egg,
  Pantry: Wheat,
  Frozen: Snowflake,
  Other: ShoppingBasket,
};

export function ShoppingClient({
  planId,
  items,
}: {
  planId: string | null;
  items: ShoppingItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const grouped = groupByCategory(items);
  const doneCount = items.filter((i) => i.done).length;

  if (!planId) {
    return (
      <div className="space-y-3 py-10 text-center">
        <ShoppingBasket className="mx-auto size-10 text-base-content/30" />
        <h1 className="text-xl font-bold">No shopping list yet</h1>
        <p className="text-sm text-base-content/60">
          Plan a fortnight and generate the list from your meals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shopping</h1>
          <p className="text-sm text-base-content/60">
            {doneCount}/{items.length} in the trolley
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await generateShoppingList(planId);
              router.refresh();
            })
          }
          title="Rebuild from meals (keeps manual adds)"
        >
          <RefreshCw className="size-4" /> Regenerate
        </button>
      </div>

      {items.length > 0 && (
        <progress
          className="progress progress-primary w-full"
          value={doneCount}
          max={items.length}
        />
      )}

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-base-content/50">
          Empty list. Generate it from the planner, or add items below.
        </p>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const rows = grouped[cat];
          if (!rows.length) return null;
          const Icon = CATEGORY_ICON[cat];
          return (
            <section key={cat}>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-base-content/60" /> {cat}
              </h2>
              <ul className="divide-y divide-base-200 overflow-hidden rounded-xl bg-base-100 shadow-sm">
                {rows.map((item) => (
                  <li
                    key={item.id}
                    className="touch-row flex items-center gap-3 px-3"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={item.done}
                      onChange={(e) =>
                        startTransition(async () => {
                          await toggleShoppingItem(item.id, e.target.checked);
                          router.refresh();
                        })
                      }
                    />
                    <span
                      className={`flex-1 py-2 ${
                        item.done ? "text-base-content/40 line-through" : ""
                      }`}
                    >
                      {item.name}
                      {item.qty && (
                        <span className="ml-2 text-xs text-base-content/50">
                          {item.qty}
                        </span>
                      )}
                    </span>
                    {item.source === "manual" && (
                      <button
                        className="btn btn-ghost btn-xs btn-square"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteShoppingItem(item.id);
                            router.refresh();
                          })
                        }
                        aria-label="Remove"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {/* Add manual item */}
      {showAdd ? (
        <form
          action={(fd) => {
            startTransition(async () => {
              await addShoppingItem(fd);
              setShowAdd(false);
              router.refresh();
            });
          }}
          className="card bg-base-100 p-3 shadow-sm"
        >
          <input type="hidden" name="planId" value={planId} />
          <div className="flex gap-2">
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. Games-night snacks"
              className="input input-bordered input-sm flex-1"
            />
            <select
              name="category"
              className="select select-bordered select-sm"
              defaultValue="Other"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
          <Plus className="size-4" /> Add item
        </button>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { PartyPopper, Star, X } from "lucide-react";
import { toggleFavourite } from "@/lib/actions";
import { RecipeBadges } from "@/components/library/RecipeBadges";
import type { Recipe } from "@/lib/types";

/**
 * Swipe-style discovery (handoff §9 — port the quiz UX, back it with the DB).
 * Right / ★ = mark favourite; Left / skip = next. Touch drag + buttons so it
 * works one-handed on mobile.
 */
export function DiscoverClient({
  deck,
  recentNames,
}: {
  deck: Recipe[];
  recentNames: string[];
}) {
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [drag, setDrag] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const recentSet = useMemo(
    () => new Set(recentNames.map((r) => r.toLowerCase())),
    [recentNames],
  );

  const current = deck[index];
  const done = index >= deck.length;

  function next() {
    setDrag(0);
    setStartX(null);
    setIndex((i) => i + 1);
  }

  function like(recipe: Recipe) {
    setLiked((l) => [...l, recipe.name]);
    if (!recipe.is_favourite) {
      startTransition(() => toggleFavourite(recipe.id, true));
    }
    next();
  }

  if (done) {
    return (
      <div className="space-y-4 py-10 text-center">
        <PartyPopper className="mx-auto size-12 text-primary" />
        <h1 className="text-xl font-bold">That&apos;s the deck</h1>
        <p className="text-sm text-base-content/60">
          You liked {liked.length} meal{liked.length === 1 ? "" : "s"} this
          round.
        </p>
        {liked.length > 0 && (
          <p className="text-sm">{liked.join(" · ")}</p>
        )}
        <button className="btn btn-primary" onClick={() => setIndex(0)}>
          Go again
        </button>
      </div>
    );
  }

  const rotation = drag / 20;
  const staleFlag = !recentSet.has(current.name.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <p className="text-sm text-base-content/60">
          Swipe right to favourite, left to skip · {deck.length - index} left
        </p>
      </div>

      <div className="relative mx-auto h-80 max-w-sm select-none">
        <div
          className="card absolute inset-0 cursor-grab touch-pan-y bg-base-100 shadow-xl active:cursor-grabbing"
          style={{
            transform: `translateX(${drag}px) rotate(${rotation}deg)`,
            transition: startX === null ? "transform 0.2s ease" : "none",
          }}
          onTouchStart={(e) => setStartX(e.touches[0].clientX)}
          onTouchMove={(e) => {
            if (startX !== null) setDrag(e.touches[0].clientX - startX);
          }}
          onTouchEnd={() => {
            if (drag > 100) like(current);
            else if (drag < -100) next();
            else {
              setDrag(0);
              setStartX(null);
            }
          }}
        >
          <div className="card-body items-center justify-center text-center">
            {staleFlag && (
              <span className="badge badge-info badge-sm">
                haven&apos;t cooked in a while
              </span>
            )}
            <h2 className="text-2xl font-bold">{current.name}</h2>
            {current.cuisine && (
              <p className="text-base-content/60">{current.cuisine}</p>
            )}
            <div className="mt-2">
              <RecipeBadges recipe={current} />
            </div>
            {current.notes && (
              <p className="mt-2 text-xs text-base-content/50">
                {current.notes}
              </p>
            )}
          </div>

          {/* Drag hints */}
          <span
            className="absolute left-4 top-4 rotate-[-12deg] rounded border-2 border-error px-2 font-bold text-error"
            style={{ opacity: drag < -40 ? Math.min(1, -drag / 120) : 0 }}
          >
            SKIP
          </span>
          <span
            className="absolute right-4 top-4 rotate-12 rounded border-2 border-success px-2 font-bold text-success"
            style={{ opacity: drag > 40 ? Math.min(1, drag / 120) : 0 }}
          >
            LIKE
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-sm justify-center gap-6">
        <button
          className="btn btn-circle btn-lg btn-outline"
          onClick={next}
          aria-label="Skip"
        >
          <X className="size-6" />
        </button>
        <button
          className="btn btn-circle btn-lg btn-primary"
          onClick={() => like(current)}
          aria-label="Like"
        >
          <Star className="size-6" />
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, Brain, Download, Loader2, CalendarCheck, ExternalLink, Pencil, Repeat, Snowflake, Sprout, Timer, Trash2, Users,
} from "lucide-react";
import type { MealDetail } from "@/lib/data";
import type { Ingredient, Member } from "@/lib/types";
import { formatIngredient, scaleQuantity } from "@/lib/ingredients";
import { SECTION_LABEL } from "@/lib/sections";
import { agoLabel, dueInfo, frequencyLabel } from "@/lib/rotation";
import { CookDots, DueBadge, EffortTag, PROTEIN_LABEL } from "@/components/bits";
import { deleteLog, fillFromLinks } from "../actions";
import { LogDinner } from "./LogDinner";

const RATING = { 1: "👍", 0: "😐", [-1]: "👎" } as Record<number, string>;

export function MealView({ detail, members, householdServings }: { detail: MealDetail; members: Member[]; householdServings: number }) {
  const { meal, variations, ingredients, cook_ids, stats, log } = detail;
  const [variationId, setVariationId] = useState<string | null>(variations[0]?.id ?? null);
  const [scaled, setScaled] = useState(true);
  const [logging, setLogging] = useState(false);

  const variation = variations.find((v) => v.id === variationId) ?? null;
  const shown = useMemo(
    () => ingredients.filter((i) => i.variation_id === null || i.variation_id === variationId),
    [ingredients, variationId],
  );
  const canScale = !!meal.servings && meal.servings < householdServings;
  const factorFrom = scaled && canScale ? meal.servings : null;

  const due = dueInfo(stats?.days_since ?? null, meal.target_interval_days);
  const notes = [meal.notes, variation?.notes].filter(Boolean) as string[];
  const method = variation?.method ?? meal.method;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/library" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[14px] text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Meals
        </Link>
        <Link href={`/library/${meal.id}/edit`} className="btn-ghost px-3 py-1.5 text-[14px]">
          <Pencil className="size-3.5" /> Edit
        </Link>
      </div>

      <header className="mt-3">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          {meal.kind === "recipe" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-accent">
              <BookOpen className="size-3.5" /> Recipe
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-brand">
              <Brain className="size-3.5" /> From my head
            </span>
          )}
          {meal.course !== "main" && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 capitalize text-muted">{meal.course}</span>}
        </div>
        <h1 className="mt-2 font-display text-[32px] leading-tight font-semibold tracking-tight">{meal.name}</h1>
        {meal.description && <p className="mt-1 text-[15px] text-muted">{meal.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
          <span className="flex items-center gap-2">
            <CookDots ids={cook_ids} members={members} size="md" />
          </span>
          <EffortTag effort={meal.effort} minutes={meal.total_minutes} />
          {meal.protein && <span>{PROTEIN_LABEL[meal.protein] ?? meal.protein}</span>}
          {meal.cuisine && <span>{meal.cuisine}</span>}
          {meal.batch_friendly && <span className="inline-flex items-center gap-1"><Snowflake className="size-3.5" /> Good leftovers</span>}
          {meal.fresh_heavy && <span className="inline-flex items-center gap-1"><Sprout className="size-3.5" /> Fresh-heavy</span>}
          {!meal.weeknight_ok && <span>Weekend only</span>}
        </div>
      </header>

      {/* Rotation */}
      <section className="card mt-5 grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
        <Stat label="Last had" value={<DueBadge info={due} />} />
        <Stat label="How often" value={<span className="inline-flex items-center gap-1"><Repeat className="size-3.5 text-muted" /> {frequencyLabel(meal.target_interval_days)}</span>} />
        <Stat label="Times logged" value={String(stats?.times_cooked ?? 0)} />
        <Stat
          label="Family rating"
          value={stats?.avg_rating == null ? "—" : stats.avg_rating > 0.5 ? "👍 Loved" : stats.avg_rating > 0 ? "🙂 Liked" : stats.avg_rating > -0.4 ? "😐 Mixed" : "👎 Not a hit"}
        />
      </section>

      <button onClick={() => setLogging(true)} className="btn-primary mt-3 w-full sm:w-auto">
        <CalendarCheck className="size-4" /> We had this
      </button>

      {meal.prep_note && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-[14px] text-warn">
          <Timer className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Prep ahead:</strong> {meal.prep_note}
            {meal.prep_lead_hours ? ` (${meal.prep_lead_hours}h before)` : ""}
          </span>
        </p>
      )}

      {variations.length > 0 && (
        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
          {variations.map((v) => (
            <button key={v.id} className="chip" data-on={v.id === variationId} onClick={() => setVariationId(v.id)}>
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">Ingredients</h2>
            {canScale && (
              <button onClick={() => setScaled(!scaled)} className="inline-flex items-center gap-1 text-[13px] text-brand">
                <Users className="size-3.5" />
                {scaled ? `For ${householdServings} (recipe: ${meal.servings})` : `As written (${meal.servings})`}
              </button>
            )}
          </div>
          {shown.length === 0 ? (
            meal.source_url && ingredients.length === 0 ? (
              <FetchFromLink mealId={meal.id} />
            ) : (
              <p className="mt-2 text-[14px] text-muted">
                No ingredients yet. <Link className="text-brand underline" href={`/library/${meal.id}/edit`}>Add them</Link> so this can go on the shopping list.
              </p>
            )
          ) : (
            <IngredientList items={shown} from={factorFrom} to={householdServings} />
          )}
        </section>

        <section className="space-y-5">
          {notes.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-semibold">Notes</h2>
              {notes.map((n, i) => (
                <p key={i} className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{n}</p>
              ))}
            </div>
          )}
          {method && (
            <div>
              <h2 className="font-display text-xl font-semibold">Method</h2>
              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{method}</p>
            </div>
          )}
          {meal.source_url && (
            <a href={meal.source_url} target="_blank" rel="noreferrer" className="btn-ghost w-full justify-between">
              <span className="truncate">Full recipe on {meal.source_name ?? new URL(meal.source_url).hostname}</span>
              <ExternalLink className="size-4 shrink-0" />
            </a>
          )}
          {meal.needs_recipe && !method && (
            <p className="rounded-xl bg-surface-2 p-3 text-[14px] text-muted">
              Not written down yet. Add your notes or a link when you next cook it.
            </p>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">History</h2>
        {log.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">Nothing logged yet. Tap “We had this” after dinner to start the rotation.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
            {log.map((l) => {
              const days = Math.round((Date.now() - new Date(l.date + "T12:00:00").getTime()) / 86400000);
              const cook = members.find((m) => m.id === l.cook_member_id);
              const v = variations.find((x) => x.id === l.variation_id);
              return (
                <li key={l.id} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">
                      {new Date(l.date + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
                      <span className="font-normal text-muted"> · {agoLabel(days)}</span>
                    </p>
                    <p className="text-[13px] text-muted">
                      {[v?.name, cook && `${cook.name} cooked`, l.make_again && `Make again: ${l.make_again}`].filter(Boolean).join(" · ")}
                    </p>
                    {l.ratings.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-2 text-[13px]">
                        {l.ratings.map((r) => (
                          <span key={r.member_id}>
                            {members.find((m) => m.id === r.member_id)?.name} {RATING[r.rating]}
                          </span>
                        ))}
                      </p>
                    )}
                    {l.notes && <p className="mt-1 text-[14px]">{l.notes}</p>}
                  </div>
                  <button
                    onClick={() => confirm("Remove this entry?") && deleteLog(l.id, meal.id)}
                    className="p-1 text-muted hover:text-accent"
                    aria-label="Remove entry"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {logging && (
        <LogDinner
          meal={meal}
          variations={variations}
          members={members}
          defaultVariationId={variationId}
          defaultCookId={cook_ids.length === 1 ? cook_ids[0] : null}
          onClose={() => setLogging(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface p-3">
      <p className="text-[12px] text-muted">{label}</p>
      <div className="mt-0.5 text-[14px] font-medium">{value}</div>
    </div>
  );
}

function IngredientList({ items, from, to }: { items: Ingredient[]; from: number | null; to: number }) {
  const groups = new Map<string, Ingredient[]>();
  for (const i of items) groups.set(i.section, [...(groups.get(i.section) ?? []), i]);
  return (
    <div className="mt-2 space-y-3">
      {[...groups.entries()].map(([section, list]) => (
        <div key={section}>
          <p className="text-[12px] font-semibold tracking-wide text-muted uppercase">{SECTION_LABEL[section] ?? section}</p>
          <ul className="mt-1 space-y-1">
            {list.map((i) => (
              <li key={i.id} className="flex gap-2 text-[15px]">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand/60" />
                <span>
                  {formatIngredient({ ...i, quantity: from ? scaleQuantity(i.quantity, from, to, i.unit) : i.quantity })}
                  {i.optional && <span className="text-muted"> (optional)</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FetchFromLink({ mealId }: { mealId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-2">
      <p className="text-[14px] text-muted">No ingredients yet, but there&apos;s a recipe link.</p>
      <button
        className="btn-primary mt-2 w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await fillFromLinks([mealId]);
            if (res.failed.length) setError(res.failed[0].error);
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Get ingredients from the recipe
      </button>
      {error && <p className="mt-2 text-[13px] text-accent">{error}</p>}
    </div>
  );
}

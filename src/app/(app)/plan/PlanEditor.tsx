"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ChevronRight, Loader2, MoreHorizontal, Search, Sparkles, Timer, Trash2, Utensils, X, Zap } from "lucide-react";
import type { Member } from "@/lib/types";
import type { Plan, PlanMeal, PlanPageData, PlanSlot } from "@/lib/plan-data";
import { addDays, dayLabel } from "@/lib/notifications";
import { leftoversSource, nextVariation, rankMeals, suggestPlan, type PlannerDay, type Ranked, type SlotType } from "@/lib/planner";
import { LogDinner } from "../library/[id]/LogDinner";
import { deletePlan, updateSlots, type SlotPatchT } from "./actions";

const TYPE_LABEL: Record<SlotType, string> = { cook: "Cook", leftovers: "Leftovers", takeaway: "Takeaway", out: "Out" };

export function PlanEditor({ plan, data, members }: { plan: Plan; data: PlanPageData; members: Member[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<PlanSlot[]>(plan.slots);
  const [picking, setPicking] = useState<number | null>(null);
  const [logging, setLogging] = useState<PlanSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [menu, setMenu] = useState(false);
  const [seed, setSeed] = useState(1);

  const mealById = useMemo(() => new Map(data.meals.map((m) => [m.id, m])), [data.meals]);
  const cooks = members.filter((m) => m.is_cook);
  const memberNames = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const ctx = { today: data.today, primaryCookId: data.primaryCookId, memberNames, seed };
  const days: PlannerDay[] = slots.map((s) => ({
    date: s.date, slot_type: s.slot_type, cook_member_id: s.cook_member_id, is_busy_night: s.is_busy_night, meal_id: s.meal_id,
  }));

  /** Optimistic update + save. */
  function apply(updates: { id: string; patch: SlotPatchT }[]) {
    if (!updates.length) return;
    const before = slots;
    setSlots((list) => list.map((s) => {
      const u = updates.find((x) => x.id === s.id);
      return u ? ({ ...s, ...u.patch } as PlanSlot) : s;
    }));
    setError(null);
    startSave(async () => {
      const res = await updateSlots(updates);
      if (!res.ok) {
        setSlots(before);
        setError(res.error);
      }
    });
  }

  function mealPatch(mealId: string | null): SlotPatchT {
    const meal = mealId ? mealById.get(mealId) : null;
    return { meal_id: mealId, variation_id: meal ? nextVariation(meal.variations.map((v) => v.id), data.variationLast) : null };
  }

  const emptyNights = slots.filter((s) => s.slot_type === "cook" && !s.meal_id && s.date >= data.today).length;

  function fill() {
    // Only fill nights from today on; earlier nights are history.
    const locked = days.map((d) => (d.date < data.today ? { ...d, slot_type: "out" as const } : d));
    const picks = suggestPlan(locked, data.meals, ctx);
    const updates = slots
      .map((s, i) => ({ s, pick: picks[i] }))
      .filter(({ s, pick }) => s.slot_type === "cook" && !s.meal_id && pick && s.date >= data.today)
      .map(({ s, pick }) => ({ id: s.id, patch: mealPatch(pick!) }));
    // Leftovers nights without a source pick one up now meals exist.
    const withMeals = days.map((d, i) => ({ ...d, meal_id: updates.find((u) => u.id === slots[i].id)?.patch.meal_id ?? d.meal_id }));
    slots.forEach((s, i) => {
      if (s.slot_type === "leftovers" && !s.leftovers_of_slot_id) {
        const src = leftoversSource(withMeals, i, data.meals);
        if (src !== null) updates.push({ id: s.id, patch: { leftovers_of_slot_id: slots[src].id } });
      }
    });
    apply(updates);
    setSeed((x) => x + 1);
  }

  function clearFuture() {
    apply(slots.filter((s) => s.date >= data.today && s.meal_id && s.slot_type === "cook").map((s) => ({ id: s.id, patch: { meal_id: null, variation_id: null } })));
    setMenu(false);
  }

  function setType(i: number, type: SlotType) {
    const s = slots[i];
    const patch: SlotPatchT = { slot_type: type };
    if (type !== "cook") Object.assign(patch, { meal_id: null, variation_id: null });
    if (type === "leftovers") {
      const src = leftoversSource(days, i, data.meals);
      patch.leftovers_of_slot_id = src !== null ? slots[src].id : null;
    } else patch.leftovers_of_slot_id = null;
    if (type === "cook" && !s.cook_member_id) patch.cook_member_id = data.primaryCookId;
    apply([{ id: s.id, patch }]);
  }

  // Summary
  const counts = new Map<string, number>();
  slots.forEach((s) => {
    const k = s.slot_type === "cook" ? s.cook_member_id ?? "?" : s.slot_type;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });

  const end = addDays(plan.start_date, plan.length_days - 1);

  return (
    <section className="mt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {dayLabel(plan.start_date)} – {dayLabel(end)}
          </h2>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
            {cooks.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: c.colour ?? "var(--muted)" }} />
                {c.name} {counts.get(c.id) ?? 0}
              </span>
            ))}
            {(["leftovers", "takeaway", "out"] as const).map((t) => (counts.get(t) ? <span key={t}>{TYPE_LABEL[t]} {counts.get(t)}</span> : null))}
            {saving && <Loader2 className="size-3.5 animate-spin" />}
          </p>
        </div>
        <div className="relative">
          <button className="btn-ghost px-2.5 py-2" onClick={() => setMenu(!menu)} aria-label="Plan options">
            <MoreHorizontal className="size-4" />
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-surface p-1 text-[14px] shadow-lg">
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2" onClick={clearFuture}>Clear upcoming meals</button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-accent hover:bg-surface-2"
                onClick={async () => {
                  if (!confirm("Delete this whole plan?")) return;
                  const res = await deletePlan(plan.id);
                  if (res.ok) router.refresh();
                  else setError(res.error);
                }}
              >
                <Trash2 className="size-4" /> Delete plan
              </button>
            </div>
          )}
        </div>
      </div>

      {emptyNights > 0 && (
        <button className="btn-primary mt-4 w-full" onClick={fill} disabled={saving}>
          <Sparkles className="size-4" /> Suggest meals for {emptyNights} night{emptyNights === 1 ? "" : "s"}
        </button>
      )}
      {error && <p className="mt-2 rounded-xl bg-accent-soft p-3 text-[14px] text-accent">{error}</p>}

      <ol className="mt-4 space-y-2">
        {slots.map((s, i) => {
          const weekStart = i % 7 === 0 && plan.length_days === 14;
          return (
            <li key={s.id}>
              {weekStart && <p className="mt-4 mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase first:mt-0">Week {i / 7 + 1}</p>}
              <DayRow
                slot={s}
                index={i}
                slots={slots}
                today={data.today}
                meal={s.meal_id ? mealById.get(s.meal_id) ?? null : null}
                mealById={mealById}
                cooks={cooks}
                reason={s.meal_id && s.slot_type === "cook" ? rankMeals(days.map((d, j) => (j === i ? { ...d, meal_id: null } : d)), i, data.meals, ctx).find((r) => r.meal_id === s.meal_id)?.reasons[0] : undefined}
                logged={data.logged[s.date]}
                onType={(t) => setType(i, t)}
                onCook={(id) => apply([{ id: s.id, patch: { cook_member_id: id, ...(s.meal_id && id !== s.cook_member_id ? { meal_id: null, variation_id: null } : {}) } }])}
                onBusy={() => apply([{ id: s.id, patch: { is_busy_night: !s.is_busy_night } }])}
                onPick={() => setPicking(i)}
                onVariation={(v) => apply([{ id: s.id, patch: { variation_id: v } }])}
                onLeftoversOf={(id) => apply([{ id: s.id, patch: { leftovers_of_slot_id: id } }])}
                onLog={() => setLogging(s)}
              />
            </li>
          );
        })}
      </ol>

      {picking !== null && (
        <MealPicker
          slot={slots[picking]}
          ranked={rankMeals(days, picking, data.meals, ctx)}
          meals={data.meals}
          usedElsewhere={new Set(slots.filter((_, j) => j !== picking).map((x) => x.meal_id).filter(Boolean) as string[])}
          cookName={slots[picking].cook_member_id ? memberNames[slots[picking].cook_member_id!] : undefined}
          onChoose={(mealId) => {
            apply([{ id: slots[picking].id, patch: mealPatch(mealId) }]);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}

      {logging?.meal_id && mealById.get(logging.meal_id) && (
        <LogDinner
          meal={mealById.get(logging.meal_id)!}
          variations={mealById.get(logging.meal_id)!.variations}
          members={members}
          defaultVariationId={logging.variation_id}
          defaultCookId={logging.cook_member_id}
          defaultDate={logging.date}
          planSlotId={logging.id}
          onClose={() => {
            setLogging(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function DayRow({
  slot, index, slots, today, meal, mealById, cooks, reason, logged,
  onType, onCook, onBusy, onPick, onVariation, onLeftoversOf, onLog,
}: {
  slot: PlanSlot;
  index: number;
  slots: PlanSlot[];
  today: string;
  meal: PlanMeal | null;
  mealById: Map<string, PlanMeal>;
  cooks: Member[];
  reason?: string;
  logged?: { meal_id: string | null };
  onType: (t: SlotType) => void;
  onCook: (id: string) => void;
  onBusy: () => void;
  onPick: () => void;
  onVariation: (id: string) => void;
  onLeftoversOf: (id: string | null) => void;
  onLog: () => void;
}) {
  const isToday = slot.date === today;
  const past = slot.date < today;
  const d = new Date(`${slot.date}T12:00:00Z`);
  const weekday = d.toLocaleDateString("en-NZ", { weekday: "short", timeZone: "UTC" });
  const cook = cooks.find((c) => c.id === slot.cook_member_id);
  const leftoverCandidates = slots.slice(Math.max(0, index - 4), index).filter((s) => s.slot_type === "cook" && s.meal_id);
  const leftoverFrom = slots.find((s) => s.id === slot.leftovers_of_slot_id);

  return (
    <div className={`card flex gap-3 p-3 ${isToday ? "border-brand ring-1 ring-brand/40" : ""} ${past ? "opacity-65" : ""}`}>
      <div className="w-11 shrink-0 text-center">
        <p className={`text-[12px] font-semibold uppercase ${isToday ? "text-brand" : "text-muted"}`}>{isToday ? "Today" : weekday}</p>
        <p className="font-display text-2xl leading-tight font-semibold">{d.getUTCDate()}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            className="chip appearance-none py-1 pr-3"
            value={slot.slot_type}
            onChange={(e) => onType(e.target.value as SlotType)}
            aria-label="What's happening"
          >
            {(Object.keys(TYPE_LABEL) as SlotType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          {slot.slot_type === "cook" && (
            <>
              <label className="chip relative py-1 pr-3" style={cook?.colour ? { borderColor: cook.colour } : undefined}>
                <span className="size-2 rounded-full" style={{ background: cook?.colour ?? "var(--muted)" }} />
                <select
                  className="appearance-none bg-transparent text-ink outline-none"
                  value={slot.cook_member_id ?? ""}
                  onChange={(e) => onCook(e.target.value)}
                  aria-label="Who's cooking"
                >
                  {cooks.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <button
                className="chip py-1"
                data-on={slot.is_busy_night}
                onClick={onBusy}
                aria-pressed={slot.is_busy_night}
                title="Busy night: quick meals only"
              >
                <Zap className="size-3.5" /> Busy
              </button>
            </>
          )}
        </div>

        {slot.slot_type === "cook" && (
          <>
            <button onClick={onPick} className="mt-2 flex w-full items-center justify-between gap-2 text-left">
              {meal ? (
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold">{meal.name}</span>
                  {reason && <span className="block truncate text-[12px] text-muted">{reason}</span>}
                </span>
              ) : (
                <span className="text-[15px] text-muted">{past ? "Nothing planned" : "Choose a meal"}</span>
              )}
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </button>
            {meal && meal.variations.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {meal.variations.map((v) => (
                  <button key={v.id} className="chip px-2.5 py-0.5 text-[12px]" data-on={slot.variation_id === v.id} onClick={() => onVariation(v.id)}>
                    {v.name}
                  </button>
                ))}
              </div>
            )}
            {meal?.prep_note && !past && (
              <p className="mt-1.5 flex items-center gap-1 text-[12px] text-warn">
                <Timer className="size-3.5" /> {meal.prep_note}
              </p>
            )}
            {meal && (past || isToday) && (
              <div className="mt-2 flex items-center gap-3">
                {logged?.meal_id === meal.id ? (
                  <span className="inline-flex items-center gap-1 text-[13px] text-brand"><Check className="size-4" /> Logged</span>
                ) : (
                  <button className="btn-ghost px-3 py-1 text-[13px]" onClick={onLog}><Utensils className="size-3.5" /> We had this</button>
                )}
                <Link href={`/library/${meal.id}`} className="text-[13px] text-muted underline">Meal</Link>
              </div>
            )}
          </>
        )}

        {slot.slot_type === "leftovers" && (
          <div className="mt-2 text-[14px]">
            {leftoverCandidates.length ? (
              <label className="flex items-center gap-2 text-muted">
                From
                <select
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-ink"
                  value={slot.leftovers_of_slot_id ?? ""}
                  onChange={(e) => onLeftoversOf(e.target.value || null)}
                >
                  <option value="">Whatever&apos;s in the fridge</option>
                  {leftoverCandidates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {mealById.get(s.meal_id!)?.name} ({dayLabel(s.date).split(" ")[0]})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-muted">Whatever&apos;s in the fridge</p>
            )}
            {leftoverFrom?.meal_id && <p className="mt-1 text-[12px] text-muted">Cook extra {mealById.get(leftoverFrom.meal_id)?.name} that night.</p>}
          </div>
        )}
        {slot.slot_type === "takeaway" && <p className="mt-2 text-[14px] text-muted">Night off: no cooking, nothing to buy.</p>}
        {slot.slot_type === "out" && <p className="mt-2 text-[14px] text-muted">Out or away.</p>}
      </div>
    </div>
  );
}

function MealPicker({
  slot, ranked, meals, usedElsewhere, cookName, onChoose, onClose,
}: {
  slot: PlanSlot;
  ranked: Ranked[];
  meals: PlanMeal[];
  usedElsewhere: Set<string>;
  cookName?: string;
  onChoose: (mealId: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const byId = new Map(meals.map((m) => [m.id, m]));
  const rankedById = new Map(ranked.map((r) => [r.meal_id, r]));
  const suggestions = ranked.filter((r) => !r.tooRecent).slice(0, 8);
  const needle = q.trim().toLowerCase();
  const all = meals
    .filter((m) => m.course === "main")
    .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.variations.some((v) => v.name.toLowerCase().includes(needle)));

  const row = (m: PlanMeal, r?: Ranked) => {
    const note = usedElsewhere.has(m.id) ? "Already in this plan" : r?.tooRecent ? r.reasons[0] : r?.reasons.join(" · ") ?? "Not usually this cook's";
    return (
      <li key={m.id}>
        <button
          onClick={() => onChoose(m.id)}
          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 ${slot.meal_id === m.id ? "bg-brand-soft" : ""}`}
        >
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium">{m.name}</span>
            <span className="block truncate text-[12px] text-muted">{note}</span>
          </span>
          {slot.meal_id === m.id && <Check className="size-4 shrink-0 text-brand" />}
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 pb-2">
          <div>
            <p className="text-[13px] text-muted">
              {dayLabel(slot.date)}
              {cookName ? ` · ${cookName} cooking` : ""}
              {slot.is_busy_night ? " · busy" : ""}
            </p>
            <h2 className="font-display text-xl font-semibold">What&apos;s for dinner?</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="relative px-4 pb-2">
          <Search className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-[60%] text-muted" />
          <input className="input py-2 pl-9" placeholder="Search all meals" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-y-auto px-2 pb-3">
          {!needle && (
            <>
              <p className="px-3 pt-2 pb-1 text-[12px] font-semibold tracking-wide text-muted uppercase">Suggested</p>
              {suggestions.length ? (
                <ul>{suggestions.map((r) => row(byId.get(r.meal_id)!, r))}</ul>
              ) : (
                <p className="px-3 pb-2 text-[13px] text-muted">Nothing fits automatically. Pick from everything below.</p>
              )}
              <p className="px-3 pt-3 pb-1 text-[12px] font-semibold tracking-wide text-muted uppercase">All meals</p>
            </>
          )}
          <ul>{all.map((m) => row(m, rankedById.get(m.id)))}</ul>
          {slot.meal_id && (
            <button onClick={() => onChoose(null)} className="mx-3 mt-2 text-[13px] text-muted underline">Clear this night</button>
          )}
        </div>
      </div>
    </div>
  );
}

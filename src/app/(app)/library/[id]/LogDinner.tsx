"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { Meal, Member, Variation } from "@/lib/types";
import { logMeal } from "../actions";

function todayNZ(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
}

const FACES: { v: -1 | 0 | 1; face: string; label: string }[] = [
  { v: 1, face: "👍", label: "Loved it" },
  { v: 0, face: "😐", label: "It was fine" },
  { v: -1, face: "👎", label: "Not keen" },
];

/** The at-the-table card: date, who cooked, everyone's thumbs, make again? */
export function LogDinner({
  meal, variations, members, defaultVariationId, defaultCookId, onClose, planSlotId = null, defaultDate,
}: {
  meal: Pick<Meal, "id" | "name">;
  planSlotId?: string | null;
  defaultDate?: string;
  variations: Pick<Variation, "id" | "name">[];
  members: Member[];
  defaultVariationId: string | null;
  defaultCookId: string | null;
  onClose: () => void;
}) {
  const [date, setDate] = useState(defaultDate ?? todayNZ());
  const [variationId, setVariationId] = useState(defaultVariationId);
  const [cookId, setCookId] = useState<string | null>(defaultCookId);
  const [ratings, setRatings] = useState<Record<string, -1 | 0 | 1>>({});
  const [makeAgain, setMakeAgain] = useState<"yes" | "maybe" | "no" | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const raters = members.filter((m) => m.gives_feedback);

  function save() {
    start(async () => {
      const res = await logMeal({
        meal_id: meal.id,
        date,
        variation_id: variationId,
        cook_member_id: cookId,
        make_again: makeAgain,
        notes,
        plan_slot_id: planSlotId,
        ratings: Object.entries(ratings).map(([member_id, rating]) => ({ member_id, rating })),
      });
      if (res.ok) onClose();
      else setError(res.error ?? "Couldn't save");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-muted">How was dinner?</p>
            <h2 className="font-display text-2xl font-semibold">{meal.name}</h2>
          </div>
          <button onClick={onClose} className="-mr-1 p-1 text-muted" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <span className="label">Date</span>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span className="label">Cooked by</span>
            <select className="input" value={cookId ?? ""} onChange={(e) => setCookId(e.target.value || null)}>
              <option value="">—</option>
              {members.filter((m) => m.is_cook).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>

        {variations.length > 0 && (
          <div className="mt-3">
            <span className="label">Which version?</span>
            <div className="flex flex-wrap gap-2">
              {variations.map((v) => (
                <button key={v.id} className="chip" data-on={variationId === v.id} onClick={() => setVariationId(v.id)}>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <span className="label">Around the table</span>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {raters.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-2 text-[15px] font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: m.colour ?? "var(--muted)" }} />
                  {m.name}
                </span>
                <span className="flex gap-1">
                  {FACES.map((f) => (
                    <button
                      key={f.v}
                      aria-label={`${m.name}: ${f.label}`}
                      onClick={() =>
                        setRatings((r) => {
                          const next = { ...r };
                          if (next[m.id] === f.v) delete next[m.id];
                          else next[m.id] = f.v;
                          return next;
                        })
                      }
                      className={`grid size-10 place-items-center rounded-xl text-xl transition ${ratings[m.id] === f.v ? "bg-brand-soft ring-2 ring-brand" : ratings[m.id] !== undefined ? "opacity-35" : "bg-surface-2"}`}
                    >
                      {f.face}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <span className="label">Make it again?</span>
          <div className="grid grid-cols-3 gap-2">
            {(["yes", "maybe", "no"] as const).map((v) => (
              <button key={v} className="chip justify-center py-2 capitalize" data-on={makeAgain === v} onClick={() => setMakeAgain(makeAgain === v ? null : v)}>
                {v === "yes" ? "Yes" : v === "maybe" ? "Tweak it" : "Retire it"}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="label">Notes for next time</span>
          <textarea
            className="input min-h-20"
            placeholder="e.g. kids picked out the mushrooms; double the sauce"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error && <p className="mt-2 text-sm text-accent">{error}</p>}
        <button onClick={save} disabled={pending} className="btn-primary mt-4 w-full">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

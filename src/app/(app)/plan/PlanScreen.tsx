"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import type { Member } from "@/lib/types";
import type { PlanPageData } from "@/lib/plan-data";
import { addDays, dayLabel } from "@/lib/notifications";
import { createPlan } from "./actions";
import { PlanEditor } from "./PlanEditor";

export function PlanScreen({ data, members, cycleLength }: { data: PlanPageData; members: Member[]; cycleLength: 7 | 14 }) {
  const { plans, today } = data;
  const currentIdx = plans.findIndex((p) => p.start_date <= today && addDays(p.start_date, p.length_days) > today);
  const [tab, setTab] = useState(Math.max(0, currentIdx));
  useEffect(() => {
    if (tab >= plans.length) setTab(Math.max(0, plans.length - 1));
  }, [plans.length, tab]);

  const last = plans[plans.length - 1];
  const daysLeft = last ? (new Date(`${addDays(last.start_date, last.length_days)}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000 : 0;
  const offerNext = !last || daysLeft <= 4;
  const plan = plans[tab];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Plan</h1>

      {plans.length > 1 && (
        <div className="mt-4 flex rounded-xl border border-line bg-surface p-1 text-[14px]">
          {plans.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setTab(i)}
              className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${tab === i ? "bg-brand-soft text-brand" : "text-muted"}`}
            >
              {i === currentIdx ? "Now" : "Next"} · {dayLabel(p.start_date)}
            </button>
          ))}
        </div>
      )}

      {offerNext && (
        <NewPlan
          defaultStart={data.nextStart < today ? today : data.nextStart}
          cycleLength={cycleLength}
          compact={!!last}
          onCreated={() => setTab(plans.length)}
        />
      )}

      {plan && <PlanEditor key={plan.id} plan={plan} data={data} members={members} />}
    </div>
  );
}

function NewPlan({ defaultStart, cycleLength, compact, onCreated }: { defaultStart: string; cycleLength: 7 | 14; compact: boolean; onCreated: () => void }) {
  const router = useRouter();
  const [start, setStart] = useState(defaultStart);
  const [length, setLength] = useState<7 | 14>(cycleLength);
  const [error, setError] = useState<string | null>(null);
  const [pending, startT] = useTransition();

  function create() {
    setError(null);
    startT(async () => {
      const res = await createPlan(start, length);
      if (!res.ok) return setError(res.error);
      router.refresh();
      onCreated();
    });
  }

  return (
    <section className={`card mt-4 p-4 ${compact ? "" : "py-6"}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <CalendarPlus className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">{compact ? "Plan what's next" : `Plan the ${length === 14 ? "fortnight" : "week"}`}</p>
          <p className="text-[13px] text-muted">
            Set who&apos;s cooking and any busy, takeaway or out nights, then let Forkcast suggest the meals.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1">
          <span className="label">Starting</span>
          <input type="date" className="input py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <div className="flex rounded-xl border border-line p-0.5">
          {([14, 7] as const).map((d) => (
            <button key={d} onClick={() => setLength(d)} className={`rounded-lg px-3 py-2 text-[14px] font-medium ${length === d ? "bg-brand-soft text-brand" : "text-muted"}`}>
              {d === 14 ? "Fortnight" : "Week"}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={create} disabled={pending || !start}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Start plan
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-accent">{error}</p>}
    </section>
  );
}

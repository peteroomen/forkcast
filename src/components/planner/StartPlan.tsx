"use client";

import { useState, useTransition } from "react";
import { createPlan } from "@/lib/actions";
import { formatDate, fromISODate, addDays } from "@/lib/dates";

export function StartPlan({ suggestedStartISO }: { suggestedStartISO: string }) {
  const [startISO, setStartISO] = useState(suggestedStartISO);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-md space-y-4 py-8 text-center">
      <div className="text-5xl">🗓️</div>
      <h1 className="text-2xl font-bold tracking-tight">Plan a fortnight</h1>
      <p className="text-sm text-base-content/60">
        Cook nights auto-fill from your settings (Jamie &amp; Megan), then you
        fill the rest. Games night stays off the grid — it&apos;s a shopping-list
        item.
      </p>
      <div className="form-control">
        <label className="label text-sm">Fortnight starts (Monday)</label>
        <input
          type="date"
          className="input input-bordered w-full"
          value={startISO}
          onChange={(e) => setStartISO(e.target.value)}
        />
        <p className="mt-1 text-xs text-base-content/50">
          {formatDate(fromISODate(startISO))} –{" "}
          {formatDate(addDays(fromISODate(startISO), 13))}
        </p>
      </div>
      <button
        className="btn btn-primary w-full"
        disabled={isPending}
        onClick={() => startTransition(() => createPlan(startISO).then(() => {}))}
      >
        {isPending ? "Creating…" : "Start planning"}
      </button>
    </div>
  );
}

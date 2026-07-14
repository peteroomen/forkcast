"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCookNight } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { dayName } from "@/lib/dates";
import type { Cook } from "@/lib/types";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function SettingsClient({ cooks }: { cooks: Cook[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-3">
          <h2 className="card-title text-base">Cook nights</h2>
          <p className="text-sm text-base-content/60">
            Who cooks which night. These auto-fill new fortnights. Assignments
            shift often — change them here, no code edits.
          </p>
          {cooks.map((cook) => (
            <div
              key={cook.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="font-medium">
                {cook.name}
                <span className="ml-2 badge badge-ghost badge-xs">
                  {cook.role}
                </span>
              </span>
              <select
                className="select select-bordered select-sm"
                value={cook.default_night ?? ""}
                onChange={(e) =>
                  startTransition(async () => {
                    await setCookNight(
                      cook.id,
                      e.target.value === "" ? null : Number(e.target.value),
                    );
                    router.refresh();
                  })
                }
                disabled={isPending}
              >
                <option value="">No fixed night</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {dayName(d)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <p className="text-xs text-base-content/50">
            Reminder: Jamie&apos;s meals must be ≤30 min; Megan cooks from her
            repertoire.
          </p>
        </div>
      </section>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-2">
          <h2 className="card-title text-base">House rules</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-base-content/70">
            <li>No celery — ever (auto-flagged, swap carrot/zucchini/corn).</li>
            <li>Games night is a shopping-list item, not a dinner slot.</li>
            <li>Seafood is a treat/lunch, not a family dinner.</li>
            <li>Big-lift meals go on Sunday.</li>
            <li>Never schedule kranskys &amp; saveloys the same week.</li>
            <li>Never invent a recipe — the app asks you for it instead.</li>
          </ul>
        </div>
      </section>

      <button className="btn btn-outline btn-block" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

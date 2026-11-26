"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChefHat, LogOut, MessageCircle, Plus, Trash2 } from "lucide-react";
import type { Household, Member } from "@/lib/types";
import { saveSettings, signOut } from "./actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COLOURS = ["#2f6b4f", "#b5552b", "#5b5fc7", "#c18a12", "#a43f7a", "#2b7fa8", "#6b7a2f", "#8a5a44"];

type M = { id?: string; key: string; name: string; colour: string | null; is_cook: boolean; gives_feedback: boolean; user_id?: string | null };

export function SettingsForm({ household, members, email }: { household: Household; members: Member[]; email: string }) {
  const router = useRouter();
  const [h, setH] = useState({
    name: household.name,
    cycle_length_days: household.cycle_length_days,
    cycle_start_dow: household.cycle_start_dow,
    default_servings: household.default_servings,
  });
  const [ms, setMs] = useState<M[]>(members.map((m) => ({ ...m, key: m.id })));
  const [removed, setRemoved] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const upd = (key: string, patch: Partial<M>) => setMs((list) => list.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveSettings({
        household: h,
        members: ms.map(({ id, name, colour, is_cook, gives_feedback }) => ({ id, name, colour, is_cook, gives_feedback })),
        removed,
      });
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error ?? "Couldn't save" });
      if (res.ok) {
        setRemoved([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="card space-y-4 p-4">
        <h2 className="font-display text-lg font-semibold">Planning</h2>
        <div>
          <span className="label">Plan and shop every…</span>
          <div className="grid grid-cols-2 gap-2">
            {([14, 7] as const).map((d) => (
              <button key={d} className="chip justify-center py-2.5 text-[14px]" data-on={h.cycle_length_days === d} onClick={() => setH({ ...h, cycle_length_days: d })}>
                {d === 14 ? "Fortnight" : "Week"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Plan starts on</span>
            <select className="input" value={h.cycle_start_dow} onChange={(e) => setH({ ...h, cycle_start_dow: Number(e.target.value) })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Cooking for</span>
            <input
              className="input"
              inputMode="numeric"
              value={h.default_servings}
              onChange={(e) => setH({ ...h, default_servings: Number(e.target.value.replace(/\D/g, "")) || 1 })}
            />
          </label>
        </div>
        <label className="block">
          <span className="label">Household name</span>
          <input className="input" value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} />
        </label>
      </section>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">The household</h2>
          <p className="text-[13px] text-muted">
            <ChefHat className="inline size-3.5" /> cooks can claim nights. <MessageCircle className="inline size-3.5" /> get a rating
            slot at the table.
          </p>
        </div>
        <ul className="space-y-2">
          {ms.map((m) => (
            <li key={m.key} className="flex items-center gap-2 rounded-xl border border-line p-2">
              <ColourPicker value={m.colour} onChange={(c) => upd(m.key, { colour: c })} />
              <input className="input min-w-0 flex-1 py-2" value={m.name} onChange={(e) => upd(m.key, { name: e.target.value })} />
              <button
                className={`grid size-9 shrink-0 place-items-center rounded-lg border ${m.is_cook ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}
                onClick={() => upd(m.key, { is_cook: !m.is_cook })}
                aria-label={`${m.name} cooks`}
                aria-pressed={m.is_cook}
                title="Cooks"
              >
                <ChefHat className="size-4" />
              </button>
              <button
                className={`grid size-9 shrink-0 place-items-center rounded-lg border ${m.gives_feedback ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}
                onClick={() => upd(m.key, { gives_feedback: !m.gives_feedback })}
                aria-label={`${m.name} rates meals`}
                aria-pressed={m.gives_feedback}
                title="Rates meals"
              >
                <MessageCircle className="size-4" />
              </button>
              {!m.user_id && (
                <button
                  className="grid size-9 shrink-0 place-items-center text-muted hover:text-accent"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => {
                    if (!confirm(`Remove ${m.name || "this person"}? Their ratings go too.`)) return;
                    if (m.id) setRemoved((r) => [...r, m.id!]);
                    setMs((list) => list.filter((x) => x.key !== m.key));
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          className="btn-ghost w-full py-2"
          onClick={() =>
            setMs((list) => [...list, { key: `n${Date.now()}`, name: "", colour: COLOURS[list.length % COLOURS.length], is_cook: false, gives_feedback: true }])
          }
        >
          <Plus className="size-4" /> Add a person
        </button>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary flex-1" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg && <span className={`text-[14px] ${msg.ok ? "text-brand" : "text-accent"}`}>{msg.text}</span>}
      </div>

      <section className="flex items-center justify-between border-t border-line pt-4 text-[14px] text-muted">
        <span className="truncate">Signed in as {email}</span>
        <button
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-ink"
          onClick={() => start(async () => { await signOut(); router.push("/login"); })}
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </section>
    </div>
  );
}

function ColourPicker({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="size-9 shrink-0 rounded-full ring-2 ring-surface"
        style={{ background: value ?? "var(--muted)" }}
        onClick={() => setOpen(!open)}
        aria-label="Colour"
      />
      {open && (
        <div className="absolute top-11 left-0 z-10 grid w-40 grid-cols-4 gap-2 rounded-xl border border-line bg-surface p-2 shadow-lg">
          {COLOURS.map((c) => (
            <button key={c} className="size-7 rounded-full" style={{ background: c }} onClick={() => { onChange(c); setOpen(false); }} aria-label={c} />
          ))}
        </div>
      )}
    </div>
  );
}

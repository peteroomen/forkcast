"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArrowLeft, BookOpen, Brain, ClipboardPaste, Link2, Loader2, Plus, Trash2, X } from "lucide-react";
import type { Member } from "@/lib/types";
import { PROTEINS } from "@/lib/types";
import { SECTIONS } from "@/lib/sections";
import { FREQUENCIES } from "@/lib/rotation";
import { fromText, type EditableIngredient } from "@/lib/ingredients";
import { PROTEIN_LABEL } from "@/components/bits";
import { archiveMeal, importFromUrl, saveMeal, type MealInputT } from "./actions";

type Row = EditableIngredient & { key: string; auto: boolean };
type VariationState = { key: string; id?: string; name: string; notes: string; method: string; ingredients: Row[] };

let keySeq = 0;
const k = () => `k${++keySeq}`;
const toRows = (list: { text: string; section?: string; optional?: boolean }[]): Row[] =>
  list.map((i) => ({ text: i.text, section: i.section ?? "other", optional: i.optional ?? false, key: k(), auto: false }));

export function MealForm({
  initial, members, startWithImport = false,
}: {
  initial: MealInputT;
  members: Member[];
  startWithImport?: boolean;
}) {
  const router = useRouter();
  const [m, setM] = useState(() => ({
    ...initial,
    notes: initial.notes ?? "",
    method: initial.method ?? "",
    description: initial.description ?? "",
    cuisine: initial.cuisine ?? "",
    prep_note: initial.prep_note ?? "",
    source_url: initial.source_url ?? "",
    source_name: initial.source_name ?? "",
  }));
  const [rows, setRows] = useState<Row[]>(() => toRows(initial.ingredients));
  const [variations, setVariations] = useState<VariationState[]>(() =>
    initial.variations.map((v) => ({
      key: k(), id: v.id, name: v.name, notes: v.notes ?? "", method: v.method ?? "", ingredients: toRows(v.ingredients),
    })),
  );
  const [tagText, setTagText] = useState((initial.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const [showImport, setShowImport] = useState(startWithImport);
  const [importUrl, setImportUrl] = useState("");
  const [importing, startImport] = useTransition();
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const set = <K extends keyof typeof m>(key: K, value: (typeof m)[K]) => setM((s) => ({ ...s, [key]: value }));

  function runImport() {
    setImportMsg(null);
    startImport(async () => {
      const res = await importFromUrl(importUrl);
      if (!res.ok) {
        setImportMsg(res.error);
        return;
      }
      const r = res.recipe;
      setM((s) => ({
        ...s,
        name: s.name || r.name,
        kind: "recipe",
        description: r.description ?? s.description,
        method: r.method ?? s.method,
        cuisine: r.cuisine ?? s.cuisine,
        servings: r.servings ?? s.servings,
        total_minutes: r.total_minutes ?? s.total_minutes,
        effort: r.total_minutes ? (r.total_minutes <= 30 ? "quick" : r.total_minutes >= 90 ? "project" : "medium") : s.effort,
        weeknight_ok: r.total_minutes ? r.total_minutes < 90 : s.weeknight_ok,
        source_url: r.source_url,
        source_name: r.source_name ?? "",
        image_url: r.image_url,
        protein: s.protein ?? r.protein,
      }));
      setRows(toRows(r.ingredients));
      setShowImport(false);
      setImportMsg(`Imported ${r.ingredients.length} ingredients. Give it a once-over before saving.`);
    });
  }

  function save() {
    setError(null);
    const clean = (list: Row[]) => list.filter((r) => r.text.trim()).map(({ text, section, optional }) => ({ text, section, optional }));
    const payload: MealInputT = {
      ...m,
      tags: tagText.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      ingredients: clean(rows),
      variations: variations.map((v) => ({ id: v.id, name: v.name, notes: v.notes, method: v.method, ingredients: clean(v.ingredients) })),
    };
    startSave(async () => {
      const res = await saveMeal(payload);
      if (!res.ok) setError(res.error);
      else router.push(`/library/${res.id}`);
    });
  }

  const cooks = members.filter((x) => x.is_cook);
  const isEdit = !!initial.id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={isEdit ? `/library/${initial.id}` : "/library"} className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[14px] text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {isEdit ? "Back" : "Meals"}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{isEdit ? `Edit ${initial.name}` : "Add a meal"}</h1>

      {/* Import */}
      {showImport ? (
        <section className="card mt-5 p-4">
          <p className="text-[15px] font-medium">Import from a recipe link</p>
          <p className="mt-0.5 text-[13px] text-muted">RecipeTin Eats and most recipe sites work. Ingredients come across in NZ terms.</p>
          <div className="mt-3 flex gap-2">
            <input
              className="input"
              inputMode="url"
              placeholder="https://www.recipetineats.com/…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importUrl && runImport()}
              autoFocus
            />
            <button className="btn-primary shrink-0" onClick={runImport} disabled={!importUrl || importing}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : "Import"}
            </button>
          </div>
          {importMsg && <p className="mt-2 text-[13px] text-accent">{importMsg}</p>}
          <button onClick={() => setShowImport(false)} className="mt-2 text-[13px] text-muted underline">Type it in instead</button>
        </section>
      ) : (
        <>
          {importMsg && <p className="mt-4 rounded-xl bg-brand-soft p-3 text-[14px] text-brand">{importMsg}</p>}
          {!isEdit && !m.source_url && (
            <button onClick={() => setShowImport(true)} className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-brand">
              <Link2 className="size-4" /> Import from a link instead
            </button>
          )}
        </>
      )}

      <div className="mt-5 space-y-6">
        <Section title="The basics">
          <label className="block">
            <span className="label">Name</span>
            <input className="input text-[17px] font-medium" value={m.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Chilli con carne" />
          </label>

          <div>
            <span className="label">How do you cook it?</span>
            <div className="grid grid-cols-2 gap-2">
              <Choice on={m.kind === "head"} onClick={() => set("kind", "head")} icon={<Brain className="size-4" />} title="From my head" sub="I know how. Just notes." />
              <Choice on={m.kind === "recipe"} onClick={() => set("kind", "recipe")} icon={<BookOpen className="size-4" />} title="From a recipe" sub="I follow a source." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Course</span>
              <select className="input" value={m.course} onChange={(e) => set("course", e.target.value as typeof m.course)}>
                <option value="main">Dinner</option>
                <option value="side">Side</option>
                <option value="dessert">Dessert</option>
              </select>
            </label>
            <label>
              <span className="label">Main protein</span>
              <select className="input" value={m.protein ?? ""} onChange={(e) => set("protein", e.target.value || null)}>
                <option value="">—</option>
                {PROTEINS.map((p) => <option key={p} value={p}>{PROTEIN_LABEL[p]}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Cuisine</span>
              <input className="input" value={m.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} placeholder="e.g. Mexican" />
            </label>
            <label>
              <span className="label">Tags</span>
              <input className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="kid-friendly, bbq" />
            </label>
          </div>
        </Section>

        <Section title="Who cooks it" hint="Leave blank if anyone might.">
          <div className="flex flex-wrap gap-2">
            {cooks.map((c) => {
              const on = m.cook_ids.includes(c.id);
              return (
                <button
                  key={c.id}
                  className="chip py-2"
                  data-on={on}
                  onClick={() => set("cook_ids", on ? m.cook_ids.filter((x) => x !== c.id) : [...m.cook_ids, c.id])}
                >
                  <span className="size-2.5 rounded-full" style={{ background: c.colour ?? "var(--muted)" }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Rotation & planning">
          <label className="block">
            <span className="label">How often would we like it?</span>
            <select
              className="input"
              value={m.target_interval_days ?? ""}
              onChange={(e) => set("target_interval_days", e.target.value ? Number(e.target.value) : null)}
            >
              {FREQUENCIES.map((f) => <option key={f.label} value={f.days ?? ""}>{f.label}</option>)}
            </select>
          </label>

          <div>
            <span className="label">Effort</span>
            <div className="grid grid-cols-3 gap-2">
              {([["quick", "Quick"], ["medium", "Medium"], ["project", "Weekend project"]] as const).map(([v, l]) => (
                <button key={v} className="chip justify-center py-2" data-on={m.effort === v} onClick={() => set("effort", v)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="label">Total time (min)</span>
              <input className="input" inputMode="numeric" value={m.total_minutes ?? ""} onChange={(e) => set("total_minutes", e.target.value ? Number(e.target.value.replace(/\D/g, "")) || null : null)} />
            </label>
            <label>
              <span className="label">Quantities serve</span>
              <input className="input" inputMode="numeric" value={m.servings ?? ""} onChange={(e) => set("servings", e.target.value ? Number(e.target.value.replace(/\D/g, "")) || null : null)} />
            </label>
          </div>

          <div className="space-y-2">
            <Toggle on={m.weeknight_ok} onChange={(v) => set("weeknight_ok", v)} title="Weeknight-friendly" sub="Off = save it for the weekend" />
            <Toggle on={m.batch_friendly} onChange={(v) => set("batch_friendly", v)} title="Makes good leftovers" sub="Planner can suggest a double batch + leftovers night" />
            <Toggle on={m.fresh_heavy} onChange={(v) => set("fresh_heavy", v)} title="Needs fresh produce" sub="Planner puts it early in the fortnight" />
            <Toggle on={m.needs_recipe} onChange={(v) => set("needs_recipe", v)} title="Needs writing down" sub="We cook it, but there are no notes yet" />
          </div>

          <label className="block">
            <span className="label">Prep ahead</span>
            <input className="input" value={m.prep_note ?? ""} onChange={(e) => set("prep_note", e.target.value)} placeholder="e.g. Marinate overnight · Take mince out of freezer" />
          </label>
        </Section>

        <Section
          title="Ingredients"
          hint={variations.length ? "These are shared by every version. Each variation adds its own below." : "One per line, e.g. “500g beef mince”. Section is guessed for the shopping list."}
        >
          <IngredientEditor rows={rows} onChange={setRows} />
        </Section>

        <Section title="Variations" hint="Different takes on the same meal (e.g. Moroccan / Indian / Mexican). They share the rotation but keep their own ingredients and ratings.">
          {variations.map((v, idx) => (
            <div key={v.key} className="rounded-2xl border border-line bg-bg/50 p-3">
              <div className="flex gap-2">
                <input
                  className="input font-medium"
                  value={v.name}
                  placeholder="Variation name"
                  onChange={(e) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                />
                <button
                  className="btn-ghost px-3"
                  aria-label="Remove variation"
                  onClick={() => setVariations((vs) => vs.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3">
                <span className="label">Extra ingredients</span>
                <IngredientEditor
                  rows={v.ingredients}
                  onChange={(next) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, ingredients: next } : x)))}
                />
              </div>
              <label className="mt-3 block">
                <span className="label">Notes</span>
                <textarea className="input min-h-16" value={v.notes} onChange={(e) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))} />
              </label>
              <label className="mt-3 block">
                <span className="label">Method differences</span>
                <textarea className="input min-h-16" value={v.method} onChange={(e) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, method: e.target.value } : x)))} />
              </label>
            </div>
          ))}
          <button
            className="btn-ghost w-full"
            onClick={() => setVariations((vs) => [...vs, { key: k(), name: "", notes: "", method: "", ingredients: [] }])}
          >
            <Plus className="size-4" /> Add a variation
          </button>
        </Section>

        <Section title={m.kind === "head" ? "How I make it" : "Method"}>
          <label className="block">
            <span className="label">Notes</span>
            <textarea className="input min-h-20" value={m.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="What makes it ours: tweaks, what the kids like, serve with…" />
          </label>
          <label className="block">
            <span className="label">{m.kind === "head" ? "Rough method (optional)" : "Method"}</span>
            <textarea className="input min-h-32" value={m.method ?? ""} onChange={(e) => set("method", e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <label>
              <span className="label">Source link</span>
              <input className="input" inputMode="url" value={m.source_url ?? ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://…" />
            </label>
            <label>
              <span className="label">Source name</span>
              <input className="input" value={m.source_name ?? ""} onChange={(e) => set("source_name", e.target.value)} placeholder="RecipeTin Eats" />
            </label>
          </div>
        </Section>
      </div>

      <div className="sticky bottom-20 z-10 mt-8 md:bottom-4">
        {error && <p className="mb-2 rounded-xl bg-accent-soft p-3 text-[14px] text-accent">{error}</p>}
        <div className="flex gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-lg backdrop-blur">
          {isEdit && (
            <button
              className="btn-ghost px-3"
              aria-label="Archive meal"
              title="Archive (hide from library and planner)"
              onClick={() => confirm(`Archive ${initial.name}? It will disappear from the library and planner.`) && archiveMeal(initial.id!)}
            >
              <Archive className="size-4" />
            </button>
          )}
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Add meal"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${on ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
    >
      <span className={`flex items-center gap-1.5 text-[15px] font-medium ${on ? "text-brand" : ""}`}>{icon}{title}</span>
      <span className="mt-0.5 block text-[12px] text-muted">{sub}</span>
    </button>
  );
}

function Toggle({ on, onChange, title, sub }: { on: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 text-left">
      <span>
        <span className="block text-[15px]">{title}</span>
        <span className="block text-[12px] text-muted">{sub}</span>
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function IngredientEditor({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");

  const update = (key: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => onChange([...rows, { key: k(), text: "", section: "other", optional: false, auto: true }]);

  function addPasted() {
    const lines = paste.split(/\n/).map((l) => l.trim()).filter(Boolean);
    onChange([...rows.filter((r) => r.text.trim()), ...lines.map((l) => ({ ...fromText(l), key: k(), auto: false }))]);
    setPaste("");
    setPasting(false);
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 sm:flex-nowrap">
          <input
            className="input min-w-0 flex-1 basis-[calc(100%-2.5rem)] py-2 sm:basis-auto"
            value={r.text}
            placeholder="e.g. 2 cloves garlic, crushed"
            onChange={(e) => update(r.key, { text: e.target.value })}
            onBlur={(e) => {
              if (r.auto && e.target.value.trim()) update(r.key, { section: fromText(e.target.value).section, auto: false });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (r.auto && r.text.trim()) update(r.key, { section: fromText(r.text).section, auto: false });
                add();
              }
            }}
            autoFocus={r.auto && !r.text}
          />
          <select
            className="order-last -mt-0.5 ml-2 shrink-0 bg-transparent text-[12px] text-muted sm:order-none sm:m-0 sm:w-[8.5rem] sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:px-2 sm:py-2 sm:text-[13px]"
            value={r.section}
            onChange={(e) => update(r.key, { section: e.target.value, auto: false })}
            aria-label="Shopping section"
          >
            {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button className="p-1.5 text-muted hover:text-accent" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} aria-label="Remove ingredient">
            <X className="size-4" />
          </button>
        </div>
      ))}

      {pasting ? (
        <div className="space-y-2">
          <textarea
            className="input min-h-32 font-mono text-[13px]"
            placeholder={"Paste a list, one per line:\n500g beef mince\n1 onion, diced\n2 cloves garlic"}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button className="btn-primary flex-1 py-2" onClick={addPasted} disabled={!paste.trim()}>Add these</button>
            <button className="btn-ghost py-2" onClick={() => setPasting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn-ghost flex-1 py-2 text-[14px]" onClick={add}>
            <Plus className="size-4" /> Ingredient
          </button>
          <button className="btn-ghost flex-1 py-2 text-[14px]" onClick={() => setPasting(true)}>
            <ClipboardPaste className="size-4" /> Paste a list
          </button>
        </div>
      )}
    </div>
  );
}

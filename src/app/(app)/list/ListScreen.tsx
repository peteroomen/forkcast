"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, MoreVertical, Package, Plus, RefreshCw, ShoppingBasket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ListPageData, ShopItem, ShopList } from "@/lib/list-data";
import { SECTIONS } from "@/lib/sections";
import { addDays, dayLabel } from "@/lib/notifications";
import { addItem, alwaysHave, answerCheck, buildShopping, ensureAdhocList, finishList, removeItem, setChecked } from "./actions";

const SECTION_LABEL = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));
const SECTION_ORDER = new Map<string, number>(SECTIONS.map((s, i) => [s.id, i]));

export function ListScreen({ data }: { data: ListPageData }) {
  const router = useRouter();
  const [lists, setLists] = useState(data.lists);
  useEffect(() => setLists(data.lists), [data.lists]);

  // Live updates from other phones: refetch (debounced) on any item change.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`shopping-${data.householdId}`)
      .on("postgres_changes", { event: "*", schema: "forkcast", table: "shopping_items", filter: `household_id=eq.${data.householdId}` }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data.householdId, router]);

  // Which plan are we shopping for: the next one with meals but no list yet, else the latest with a list.
  const planOptions = data.plans.filter((p) => p.planned > 0);
  const withLists = new Set(lists.map((l) => l.plan_id));
  const defaultPlan = planOptions.find((p) => withLists.has(p.id)) ?? planOptions.find((p) => !withLists.has(p.id)) ?? null;
  const [planId, setPlanId] = useState<string | null>(defaultPlan?.id ?? null);
  const plan = planOptions.find((p) => p.id === planId) ?? null;
  const planLists = lists.filter((l) => l.plan_id === planId);
  const adhoc = lists.find((l) => l.kind === "adhoc") ?? null;

  const [chosenTab, setTab] = useState<"main" | "top_up" | "adhoc">("main");
  // Without plan lists, the only list is Extras.
  const tab = planLists.length ? chosenTab : "adhoc";
  const shown: ShopList | null =
    tab === "adhoc" ? adhoc : planLists.find((l) => l.kind === tab) ?? planLists.find((l) => l.kind === "main") ?? null;

  const [building, startBuild] = useTransition();
  const [missing, setMissing] = useState<{ meal_id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  function build() {
    if (!planId) return;
    setError(null);
    startBuild(async () => {
      const res = await buildShopping(planId);
      if (!res.ok) return setError(res.error);
      setMissing(res.missing ?? []);
      setTab("main");
      router.refresh();
    });
  }

  /** Optimistic item change. */
  function patchItem(id: string, patch: Partial<ShopItem> | null) {
    setLists((ls) =>
      ls.map((l) => ({
        ...l,
        items: patch === null ? l.items.filter((i) => i.id !== id) : l.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      })),
    );
  }

  const checks = planLists.flatMap((l) => l.items.filter((i) => i.needs_check));
  const assumed = data.pantry.filter((p) => p.tier === "always").map((p) => p.name);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Shopping</h1>
        <Link href="/list/pantry" className="btn-ghost px-3 py-1.5 text-[14px]">
          <Package className="size-4" /> Pantry
        </Link>
      </div>

      {planOptions.length > 1 && (
        <div className="mt-4 flex rounded-xl border border-line bg-surface p-1 text-[14px]">
          {planOptions.map((p) => (
            <button key={p.id} onClick={() => setPlanId(p.id)} className={`flex-1 rounded-lg px-3 py-1.5 font-medium ${p.id === planId ? "bg-brand-soft text-brand" : "text-muted"}`}>
              Plan from {dayLabel(p.start_date)}
            </button>
          ))}
        </div>
      )}

      {!plan && (
        <div className="card mt-4 p-5 text-[15px] text-muted">
          No plan with meals yet. <Link href="/plan" className="text-brand underline">Plan some dinners</Link> and the list builds itself from them. You can still jot things down below.
        </div>
      )}

      {plan && planLists.length === 0 && (
        <section className="card mt-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><ShoppingBasket className="size-5" /></span>
            <div>
              <p className="text-[16px] font-semibold">Make the list for {dayLabel(plan.start_date)} – {dayLabel(addDays(plan.start_date, plan.length_days - 1))}</p>
              <p className="text-[13px] text-muted">
                From {plan.planned} planned dinners, scaled for the family, plus your regulars.
                {plan.length_days === 14 ? " Fresh things for week two go on a top-up list." : ""}
              </p>
            </div>
          </div>
          <button className="btn-primary mt-4 w-full" onClick={build} disabled={building}>
            {building ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBasket className="size-4" />} Build shopping list
          </button>
        </section>
      )}

      {error && <p className="mt-3 rounded-xl bg-accent-soft p-3 text-[14px] text-accent">{error}</p>}

      {missing.length > 0 && (
        <div className="mt-3 rounded-xl bg-warn-soft p-3 text-[14px] text-warn">
          <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="size-4" /> No ingredients written down for:</p>
          <p className="mt-1">
            {missing.map((m, i) => (
              <span key={m.meal_id}>
                {i > 0 && ", "}
                <Link className="underline" href={`/library/${m.meal_id}/edit`}>{m.name}</Link>
              </span>
            ))}
          </p>
          <p className="mt-1 text-[13px]">Add them (or add items by hand below), then tap Update from plan.</p>
        </div>
      )}

      {checks.length > 0 && <PantryCheck items={checks} onAnswer={(id, have) => { patchItem(id, { needs_check: false, have }); answerCheck(id, have); }} />}

      {(planLists.length > 0 || adhoc || !plan) && (
        <div className="mt-4 flex gap-2 text-[14px]">
          {planLists.some((l) => l.kind === "main") && <Tab on={tab === "main"} onClick={() => setTab("main")} label="Main shop" count={countLeft(planLists.find((l) => l.kind === "main"))} />}
          {planLists.some((l) => l.kind === "top_up") && <Tab on={tab === "top_up"} onClick={() => setTab("top_up")} label="Top-up" count={countLeft(planLists.find((l) => l.kind === "top_up"))} />}
          <Tab on={tab === "adhoc"} onClick={() => setTab("adhoc")} label="Extras" count={countLeft(adhoc ?? undefined)} />
          {plan && planLists.length > 0 && (
            <button className="ml-auto inline-flex items-center gap-1 text-[13px] text-muted" onClick={build} disabled={building} title="Rebuild from the current plan, keeping ticked and hand-added items">
              <RefreshCw className={`size-3.5 ${building ? "animate-spin" : ""}`} /> Update
            </button>
          )}
        </div>
      )}

      {shown?.kind === "top_up" && shown.shop_on && (
        <p className="mt-2 text-[13px] text-muted">Fresh things for week two. Best bought around {dayLabel(shown.shop_on)}.</p>
      )}

      <ItemList
        list={shown}
        mealNames={data.mealNames}
        onAddNeedsList={async () => (await ensureAdhocList()).id ?? null}
        onToggle={(i) => { patchItem(i.id, { checked: !i.checked }); setChecked(i.id, !i.checked); }}
        onRemove={(i) => { patchItem(i.id, null); removeItem(i.id); }}
        onAlways={(i) => { patchItem(i.id, null); alwaysHave(i.id); }}
        onAdded={() => router.refresh()}
        onFinish={async (l) => { await finishList(l.id); router.refresh(); }}
      />

      {assumed.length > 0 && planLists.length > 0 && (
        <p className="mt-6 text-[13px] text-muted">
          Not listed because you always have them: {assumed.join(", ")}. <Link href="/list/pantry" className="underline">Change</Link>
        </p>
      )}
    </div>
  );
}

const countLeft = (l?: ShopList) => (l ? l.items.filter((i) => !i.checked && !i.have && !i.needs_check).length : 0);

function Tab({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className="chip py-1.5" data-on={on}>
      {label}
      {count > 0 && <span className={`rounded-full px-1.5 text-[11px] ${on ? "bg-brand text-brand-ink" : "bg-surface-2"}`}>{count}</span>}
    </button>
  );
}

function PantryCheck({ items, onAnswer }: { items: ShopItem[]; onAnswer: (id: string, have: boolean) => void }) {
  return (
    <section className="card mt-4 p-4">
      <p className="text-[16px] font-semibold">Got these already?</p>
      <p className="text-[13px] text-muted">Things you usually have. Tap what you need to buy.</p>
      <ul className="mt-3 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">{i.name}</span>
              {i.quantity && <span className="block text-[12px] text-muted">{i.quantity}</span>}
            </span>
            <span className="flex shrink-0 gap-1.5">
              <button className="chip py-1.5 text-ink" onClick={() => onAnswer(i.id, true)}>Got it</button>
              <button className="chip py-1.5 text-ink" onClick={() => onAnswer(i.id, false)}>Need it</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemList({
  list, mealNames, onAddNeedsList, onToggle, onRemove, onAlways, onAdded, onFinish,
}: {
  list: ShopList | null;
  mealNames: Record<string, string>;
  onAddNeedsList: () => Promise<string | null>;
  onToggle: (i: ShopItem) => void;
  onRemove: (i: ShopItem) => void;
  onAlways: (i: ShopItem) => void;
  onAdded: () => void;
  onFinish: (l: ShopList) => void;
}) {
  const [text, setText] = useState("");
  const [adding, startAdd] = useTransition();
  const [showDone, setShowDone] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  const items = list?.items.filter((i) => !i.have && !i.needs_check) ?? [];
  const todo = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);
  const groups = useMemo(() => {
    const m = new Map<string, ShopItem[]>();
    for (const i of todo) m.set(i.section, [...(m.get(i.section) ?? []), i]);
    return [...m.entries()].sort((a, b) => (SECTION_ORDER.get(a[0]) ?? 99) - (SECTION_ORDER.get(b[0]) ?? 99));
  }, [todo]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const value = text;
    setText("");
    startAdd(async () => {
      const id = list?.id ?? (await onAddNeedsList());
      if (id) await addItem(id, value);
      onAdded();
    });
  }

  const row = (i: ShopItem) => (
    <li key={i.id} className="relative flex items-center gap-3 py-1">
      <button onClick={() => onToggle(i)} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left" aria-pressed={i.checked}>
        <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${i.checked ? "border-brand bg-brand text-brand-ink" : "border-line"}`}>
          {i.checked && <Check className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className={`block text-[16px] ${i.checked ? "text-muted line-through" : "font-medium"}`}>
            {i.name}
            {i.quantity && <span className="font-normal text-muted"> · {i.quantity}</span>}
            {i.note && <span className="font-normal text-muted"> ({i.note})</span>}
          </span>
          {!i.checked && i.meal_ids.length > 0 && (
            <span className="block truncate text-[12px] text-muted">{i.meal_ids.map((id) => mealNames[id]).filter(Boolean).join(", ")}</span>
          )}
        </span>
      </button>
      <button className="p-2 text-muted" onClick={() => setMenu(menu === i.id ? null : i.id)} aria-label={`More for ${i.name}`}>
        <MoreVertical className="size-4" />
      </button>
      {menu === i.id && (
        <div className="absolute top-10 right-0 z-20 w-52 rounded-xl border border-line bg-surface p-1 text-[14px] shadow-lg">
          <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2" onClick={() => { setMenu(null); onAlways(i); }}>
            We always have this
          </button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-accent hover:bg-surface-2" onClick={() => { setMenu(null); onRemove(i); }}>
            Remove
          </button>
        </div>
      )}
    </li>
  );

  return (
    <section className="mt-3">
      <form onSubmit={add} className="flex gap-2">
        <input className="input" placeholder="Add something (e.g. dishwasher tablets)" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-primary shrink-0 px-3" disabled={adding || !text.trim()} aria-label="Add">
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="mt-6 text-center text-[14px] text-muted">{list ? "Nothing on this list." : "Nothing here yet."}</p>
      ) : (
        <>
          {groups.map(([section, list]) => (
            <div key={section} className="mt-4">
              <p className="text-[12px] font-semibold tracking-wide text-muted uppercase">{SECTION_LABEL[section] ?? section}</p>
              <ul className="divide-y divide-line">{list.map(row)}</ul>
            </div>
          ))}
          {todo.length === 0 && (
            <div className="card mt-4 p-4 text-center">
              <p className="text-[16px] font-semibold">All done 🎉</p>
              {list && list.kind !== "adhoc" && (
                <button className="btn-ghost mt-2" onClick={() => onFinish(list)}>Finish this list</button>
              )}
            </div>
          )}
          {done.length > 0 && (
            <div className="mt-5">
              <button className="flex items-center gap-1 text-[13px] font-semibold text-muted" onClick={() => setShowDone(!showDone)}>
                <ChevronDown className={`size-4 transition ${showDone ? "" : "-rotate-90"}`} /> In the trolley ({done.length})
              </button>
              {showDone && <ul className="divide-y divide-line">{done.map(row)}</ul>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

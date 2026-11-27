"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ChevronDown, Plus, X } from "lucide-react";
import type { PantryItem } from "@/lib/list-data";
import { deletePantry, savePantry } from "../actions";

const TIERS = [
  { id: "always", title: "Always have", sub: "Never asked about, never listed: salt, oil, the lemon tree." },
  { id: "usually", title: "Usually have", sub: "When a meal needs one, the list asks “got this?” first." },
  { id: "regular", title: "Every shop", sub: "Added to every main shop, whatever's planned: milk, bread." },
] as const;

export function PantryEditor({ items }: { items: PantryItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Couldn't save");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/list" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[14px] text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Shopping
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Pantry</h1>
      <p className="mt-1 text-[14px] text-muted">So the list only shows what you actually need to buy.</p>
      {error && <p className="mt-3 rounded-xl bg-accent-soft p-3 text-[14px] text-accent">{error}</p>}

      <div className="mt-5 space-y-4">
        {TIERS.map((t) => (
          <section key={t.id} className="card p-4">
            <h2 className="font-display text-lg font-semibold">{t.title}</h2>
            <p className="text-[13px] text-muted">{t.sub}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {items.filter((i) => i.tier === t.id).map((i) => (
                <li key={i.id} className="chip gap-1.5 py-1.5 pr-1.5 text-ink">
                  {i.name}
                  {t.id === "regular" && i.regular_quantity && <span className="text-muted">· {i.regular_quantity}</span>}
                  <span className="relative grid size-5 place-items-center text-muted">
                    <ChevronDown className="size-3.5" />
                    <select
                      className="absolute inset-0 cursor-pointer opacity-0"
                      value={i.tier}
                      disabled={pending}
                      onChange={(e) => run(() => savePantry({ ...i, tier: e.target.value as PantryItem["tier"] }))}
                      aria-label={`Move ${i.name}`}
                    >
                      {TIERS.map((x) => <option key={x.id} value={x.id}>Move to: {x.title}</option>)}
                    </select>
                  </span>
                  <button onClick={() => run(() => deletePantry(i.id))} className="p-0.5 text-muted hover:text-accent" aria-label={`Remove ${i.name}`}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <AddPantry tier={t.id} withQuantity={t.id === "regular"} onAdd={(name, qty) => run(() => savePantry({ name, tier: t.id, regular_quantity: qty }))} />
          </section>
        ))}
      </div>
    </div>
  );
}

function AddPantry({ tier, withQuantity, onAdd }: { tier: string; withQuantity: boolean; onAdd: (name: string, qty: string | null) => void }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name.trim(), qty.trim() || null);
        setName("");
        setQty("");
      }}
    >
      <input className="input py-2" placeholder={tier === "regular" ? "e.g. Milk" : tier === "always" ? "e.g. Salt" : "e.g. Soy sauce"} value={name} onChange={(e) => setName(e.target.value)} />
      {withQuantity && <input className="input w-24 py-2" placeholder="2L" value={qty} onChange={(e) => setQty(e.target.value)} />}
      <button className="btn-ghost shrink-0 px-3 py-2" aria-label="Add"><Plus className="size-4" /></button>
    </form>
  );
}

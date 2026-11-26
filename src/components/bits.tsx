import { Clock, Flame, Zap } from "lucide-react";
import type { DueInfo } from "@/lib/rotation";
import type { Effort, Member } from "@/lib/types";

export function CookDots({ ids, members, size = "sm" }: { ids: string[]; members: Member[]; size?: "sm" | "md" }) {
  const cooks = ids.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Member[];
  const cls = size === "sm" ? "size-6 text-[11px]" : "size-8 text-[13px]";
  if (!cooks.length) return <span className="text-[12px] text-muted">Anyone</span>;
  return (
    <span className="flex -space-x-1.5">
      {cooks.map((c) => (
        <span
          key={c.id}
          title={c.name}
          className={`${cls} grid place-items-center rounded-full font-semibold text-white ring-2 ring-surface`}
          style={{ background: c.colour ?? "var(--muted)" }}
        >
          {c.name[0]}
        </span>
      ))}
    </span>
  );
}

const EFFORT: Record<Effort, { label: string; icon: typeof Zap }> = {
  quick: { label: "Quick", icon: Zap },
  medium: { label: "Medium", icon: Clock },
  project: { label: "Weekend project", icon: Flame },
};

export function EffortTag({ effort, minutes }: { effort: Effort; minutes?: number | null }) {
  const { label, icon: Icon } = EFFORT[effort];
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <Icon className="size-3.5" />
      {minutes ? `${minutes} min` : label}
    </span>
  );
}

const DUE_STYLE: Record<DueInfo["state"], string> = {
  overdue: "bg-accent-soft text-accent",
  due: "bg-warn-soft text-warn",
  soon: "bg-surface-2 text-muted",
  recent: "bg-surface-2 text-muted",
  unknown: "bg-surface-2 text-muted",
  anytime: "bg-surface-2 text-muted",
};

export function DueBadge({ info }: { info: DueInfo }) {
  const text = info.state === "overdue" ? "Overdue" : info.state === "due" ? "Due" : null;
  return (
    <span className="flex items-center gap-1.5">
      {text && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DUE_STYLE[info.state]}`}>{text}</span>}
      <span className="text-[12px] text-muted">{info.label}</span>
    </span>
  );
}

export const PROTEIN_LABEL: Record<string, string> = {
  beef: "Beef", chicken: "Chicken", pork: "Pork", lamb: "Lamb", fish: "Fish",
  seafood: "Seafood", vegetarian: "Vegetarian", mixed: "Mixed",
};

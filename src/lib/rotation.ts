/**
 * Rotation: how "due" a meal is, relative to how often we'd like it.
 * ratio = days since last cooked ÷ target interval.
 */
export type DueState = "unknown" | "recent" | "soon" | "due" | "overdue" | "anytime";

export interface DueInfo {
  state: DueState;
  ratio: number | null;
  label: string;
}

export function dueInfo(daysSince: number | null, targetDays: number | null): DueInfo {
  if (daysSince === null) return { state: "unknown", ratio: null, label: "No history yet" };
  if (!targetDays) return { state: "anytime", ratio: null, label: agoLabel(daysSince) };
  const ratio = daysSince / targetDays;
  const state: DueState = ratio >= 1.5 ? "overdue" : ratio >= 1 ? "due" : ratio >= 0.75 ? "soon" : "recent";
  return { state, ratio, label: agoLabel(daysSince) };
}

export function agoLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const y = Math.round(days / 365);
  return y === 1 ? "A year ago" : `${y} years ago`;
}

export const FREQUENCIES: { days: number | null; label: string }[] = [
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every fortnight" },
  { days: 21, label: "Every 3 weeks" },
  { days: 30, label: "Monthly" },
  { days: 42, label: "Every 6 weeks" },
  { days: 60, label: "Every couple of months" },
  { days: 120, label: "A few times a year" },
  { days: null, label: "No preference" },
];

export function frequencyLabel(days: number | null): string {
  const exact = FREQUENCIES.find((f) => f.days === days);
  if (exact) return exact.label;
  return days ? `Every ${days} days` : "No preference";
}

/** Sort key for "due first": overdue at top, never-cooked after due, recent last. */
export function dueSortKey(info: DueInfo): number {
  switch (info.state) {
    case "overdue":
    case "due":
      return -(info.ratio ?? 1);
    case "unknown":
      return 0;
    case "anytime":
      return 0.5;
    default:
      return 1 - (info.ratio ?? 0) + 1;
  }
}

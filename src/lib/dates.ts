/** Date helpers. The fortnight always starts on a Monday. */

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** 0 = Monday ... 6 = Sunday (matches cooks.default_night). */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function dayName(index: number): string {
  return DAY_NAMES[index] ?? "";
}

export function shortDayName(index: number): string {
  return dayName(index).slice(0, 3);
}

/** ISO date string YYYY-MM-DD (local). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The Monday on or before the given date. */
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - weekdayIndex(d));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Next Monday strictly after today (default new-plan start). */
export function nextMonday(from: Date): Date {
  const monday = mondayOf(from);
  monday.setDate(monday.getDate() + 7);
  return monday;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** 14 consecutive dates starting at fortnightStart (a Monday). */
export function fortnightDates(fortnightStart: Date): Date[] {
  return Array.from({ length: 14 }, (_, i) => addDays(fortnightStart, i));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

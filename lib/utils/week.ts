const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekDate = { date: string; label: string; isWeekend: boolean };

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDateISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseDateISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday of the week containing `date` (defaults to today). */
export function getWeekStart(date: Date = new Date()): Date {
  const d = toDateOnly(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = toDateOnly(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Returns all 7 Mon-Sun dates (as ISO strings) for the week starting `weekStart`. */
export function getWeekDates(weekStart: Date): WeekDate[] {
  return DAY_NAMES.map((label, i) => ({
    date: formatDateISO(addDays(weekStart, i)),
    label,
    isWeekend: i >= 5,
  }));
}

/** Weekdays always show; Saturday/Sunday only show if the employee logged an entry that day. */
export function visibleWeekDates<T extends WeekDate>(
  weekDates: T[],
  entries: { entryDate: string }[],
): T[] {
  const datesWithEntries = new Set(entries.map((e) => e.entryDate));
  return weekDates.filter((wd) => !wd.isWeekend || datesWithEntries.has(wd.date));
}

export function formatWeekRange(weekStartISO: string, weekEndISO: string): string {
  const start = parseDateISO(weekStartISO);
  const end = parseDateISO(weekEndISO);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} to ${fmt(end)}`;
}

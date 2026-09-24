// Kept manually in sync with the `activityType` pgEnum in lib/db/schema.ts.
export const ACTIVITY_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "project_work", label: "Project Work" },
  { value: "pto", label: "PTO" },
  { value: "holiday", label: "Holiday" },
  { value: "benevolence", label: "Benevolence" },
  { value: "sick_time", label: "Sick Time" },
  { value: "administrative", label: "Administrative" },
  { value: "other", label: "Other" },
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];

// Buttons offered when logging a new entry. "meeting" and "administrative" stay out of this list
// but remain in ACTIVITY_TYPES above so pre-existing entries using them still display correctly.
export const SELECTABLE_ACTIVITY_TYPES = ACTIVITY_TYPES.filter(
  (t) => t.value !== "meeting" && t.value !== "administrative",
);

export function activityTypeLabel(value: string | null): string {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.label ?? "";
}

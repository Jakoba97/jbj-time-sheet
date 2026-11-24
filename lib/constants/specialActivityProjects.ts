// These are real rows in the `projects` table, kept only as the projectId the automated
// Holiday-prompt and PTO-approval flows attach to entries they generate themselves (there's no
// per-day project context to ask for in those flows). A manually logged PTO/Holiday/Benevolence/
// Sick Time entry always gets a real project too — "PTO" etc. is the activityType, not the
// project. Not offered in the Project dropdown or the admin Projects tab. Kept in sync with the
// project names seeded in scripts/seed.ts and referenced by name in lib/pdf/visibleProjects.ts,
// app/timesheet-actions.ts, and app/admin/pto/actions.ts.
export const SPECIAL_ACTIVITY_PROJECT_NAMES = ["PTO", "Holiday", "Benevolence", "Sick Time"];

// Exported timesheet grids show these activity types on their category row rather than on the
// entry's own project, so a Holiday logged against a client project is counted as Holiday.
export const SPECIAL_ACTIVITY_PROJECT_BY_TYPE: Record<string, string> = {
  pto: "PTO",
  holiday: "Holiday",
  benevolence: "Benevolence",
  sick_time: "Sick Time",
};

// Categories that appear on every timesheet regardless of hours logged. Every other project
// (actual client work) is hidden unless the employee logged hours against it that week — this
// keeps a timesheet handed to one client from revealing which other clients the company works with.
const ALWAYS_VISIBLE_PROJECT_NAMES = new Set([
  "Benevolence",
  "Administration",
  "Holiday",
  "PTO",
  "Sick Time",
]);

// Client projects are listed first, then the always-visible categories, each group keeping the
// incoming (alphabetical) order. Otherwise a category like "Benevolence" sorts above the actual
// project the employee worked on.
export function filterVisibleProjects<T extends { id: string; name: string }>(
  projects: T[],
  projectTotals: Record<string, number>,
): T[] {
  const workedProjects = projects.filter(
    (p) => !ALWAYS_VISIBLE_PROJECT_NAMES.has(p.name) && (projectTotals[p.id] ?? 0) > 0,
  );
  const categories = projects.filter((p) => ALWAYS_VISIBLE_PROJECT_NAMES.has(p.name));
  return [...workedProjects, ...categories];
}

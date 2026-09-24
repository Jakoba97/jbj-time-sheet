import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects, timeEntries } from "@/lib/db/schema";
import { SPECIAL_ACTIVITY_PROJECT_NAMES } from "@/lib/constants/specialActivityProjects";

export function listActiveProjects() {
  return db.query.projects.findMany({
    where: eq(projects.isActive, true),
    orderBy: [asc(sql`lower(${projects.name})`)],
  });
}

export function listAllProjects() {
  return db.query.projects.findMany({
    orderBy: [asc(sql`lower(${projects.name})`)],
  });
}

// PTO/Holiday/Benevolence/Sick Time are shown as "What kind of activity?" buttons on the Log
// Time form regardless of their is_active flag — an admin can no longer toggle them from the
// Projects tab, so they should always be selectable there.
export async function listSpecialActivityProjects() {
  const rows = await db.query.projects.findMany({
    where: inArray(projects.name, SPECIAL_ACTIVITY_PROJECT_NAMES),
  });
  return rows.sort(
    (a, b) => SPECIAL_ACTIVITY_PROJECT_NAMES.indexOf(a.name) - SPECIAL_ACTIVITY_PROJECT_NAMES.indexOf(b.name),
  );
}

export function getProjectByName(name: string) {
  return db.query.projects.findFirst({
    where: eq(projects.name, name),
  });
}

export function getProjectById(id: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
}

export async function listProjectsWithHours() {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      isActive: projects.isActive,
      sortOrder: projects.sortOrder,
      actualHours: sql<string>`coalesce(sum(${timeEntries.hours}), 0)`,
    })
    .from(projects)
    .leftJoin(timeEntries, eq(timeEntries.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(asc(projects.sortOrder), asc(projects.name));

  return rows.map((r) => ({ ...r, actualHours: Number(r.actualHours) }));
}

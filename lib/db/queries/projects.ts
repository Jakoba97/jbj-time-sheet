import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { projects, timeEntries } from "@/lib/db/schema";

export function listActiveProjects() {
  return db.query.projects.findMany({
    where: eq(projects.isActive, true),
    orderBy: [asc(projects.sortOrder), asc(projects.name)],
  });
}

export function listAllProjects() {
  return db.query.projects.findMany({
    orderBy: [asc(projects.sortOrder), asc(projects.name)],
  });
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

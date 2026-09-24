import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { employeeTitles } from "@/lib/db/schema";

export function listTitlesForUser(userId: string) {
  return db.query.employeeTitles.findMany({
    where: eq(employeeTitles.userId, userId),
    orderBy: [asc(employeeTitles.sortOrder), asc(employeeTitles.title)],
  });
}

export function listAllEmployeeTitles() {
  return db.query.employeeTitles.findMany({
    orderBy: [asc(employeeTitles.sortOrder), asc(employeeTitles.title)],
  });
}

export function getEmployeeTitleById(id: string) {
  return db.query.employeeTitles.findFirst({
    where: eq(employeeTitles.id, id),
  });
}

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { timeEntries, users, weeklyTimesheets } from "@/lib/db/schema";
import { addDays, formatDateISO, parseDateISO } from "@/lib/utils/week";

export async function getOrCreateWeeklyTimesheet(userId: string, weekStartISO: string) {
  const existing = await db.query.weeklyTimesheets.findFirst({
    where: and(
      eq(weeklyTimesheets.userId, userId),
      eq(weeklyTimesheets.weekStartDate, weekStartISO),
    ),
  });
  if (existing) return existing;

  const weekEndISO = formatDateISO(addDays(parseDateISO(weekStartISO), 4));

  const [created] = await db
    .insert(weeklyTimesheets)
    .values({ userId, weekStartDate: weekStartISO, weekEndDate: weekEndISO })
    .onConflictDoNothing({ target: [weeklyTimesheets.userId, weeklyTimesheets.weekStartDate] })
    .returning();

  if (created) return created;

  // Lost a race with a concurrent request creating the same week — read it back.
  const raceWinner = await db.query.weeklyTimesheets.findFirst({
    where: and(
      eq(weeklyTimesheets.userId, userId),
      eq(weeklyTimesheets.weekStartDate, weekStartISO),
    ),
  });
  if (!raceWinner) throw new Error("Failed to create or find weekly timesheet");
  return raceWinner;
}

export function getTimesheetById(id: string) {
  return db.query.weeklyTimesheets.findFirst({ where: eq(weeklyTimesheets.id, id) });
}

export function getTimeEntriesForTimesheet(weeklyTimesheetId: string) {
  return db.query.timeEntries.findMany({
    where: eq(timeEntries.weeklyTimesheetId, weeklyTimesheetId),
  });
}

export async function getTimeEntryWithOwner(entryId: string) {
  const [row] = await db
    .select({
      entry: timeEntries,
      timesheetUserId: weeklyTimesheets.userId,
      timesheetId: weeklyTimesheets.id,
    })
    .from(timeEntries)
    .innerJoin(weeklyTimesheets, eq(weeklyTimesheets.id, timeEntries.weeklyTimesheetId))
    .where(eq(timeEntries.id, entryId));
  return row ?? null;
}

export function listUserTimesheets(userId: string) {
  return db.query.weeklyTimesheets.findMany({
    where: eq(weeklyTimesheets.userId, userId),
    orderBy: [desc(weeklyTimesheets.weekStartDate)],
  });
}

export async function listUserTimesheetsWithTotals(userId: string) {
  const rows = await db
    .select({
      id: weeklyTimesheets.id,
      weekStartDate: weeklyTimesheets.weekStartDate,
      weekEndDate: weeklyTimesheets.weekEndDate,
      weekTotal: sql<string>`coalesce(sum(${timeEntries.hours}), 0)`,
    })
    .from(weeklyTimesheets)
    .leftJoin(timeEntries, eq(timeEntries.weeklyTimesheetId, weeklyTimesheets.id))
    .where(eq(weeklyTimesheets.userId, userId))
    .groupBy(weeklyTimesheets.id)
    .orderBy(desc(weeklyTimesheets.weekStartDate));

  return rows.map((r) => ({ ...r, weekTotal: Number(r.weekTotal) }));
}

export async function listTimesheetsForWeek(weekStartISO: string) {
  const rows = await db
    .select({
      id: weeklyTimesheets.id,
      userId: weeklyTimesheets.userId,
      weekStartDate: weeklyTimesheets.weekStartDate,
      weekEndDate: weeklyTimesheets.weekEndDate,
      employeeName: users.fullName,
    })
    .from(weeklyTimesheets)
    .innerJoin(users, eq(users.id, weeklyTimesheets.userId))
    .where(eq(weeklyTimesheets.weekStartDate, weekStartISO))
    .orderBy(users.fullName);

  return rows;
}

export async function listHoursByEmployeeForWeek(weekStartISO: string) {
  const rows = await db
    .select({
      userId: users.id,
      employeeName: users.fullName,
      hours: sql<string>`coalesce(sum(${timeEntries.hours}), 0)`,
    })
    .from(users)
    .leftJoin(
      weeklyTimesheets,
      and(eq(weeklyTimesheets.userId, users.id), eq(weeklyTimesheets.weekStartDate, weekStartISO)),
    )
    .leftJoin(timeEntries, eq(timeEntries.weeklyTimesheetId, weeklyTimesheets.id))
    .where(eq(users.active, true))
    .groupBy(users.id, users.fullName)
    .orderBy(desc(sql`coalesce(sum(${timeEntries.hours}), 0)`));

  return rows.map((r) => ({ ...r, hours: Number(r.hours) }));
}

export async function listWeeklyHoursTrend(weeksCount: number) {
  const rows = await db
    .select({
      weekStartDate: weeklyTimesheets.weekStartDate,
      hours: sql<string>`coalesce(sum(${timeEntries.hours}), 0)`,
    })
    .from(weeklyTimesheets)
    .leftJoin(timeEntries, eq(timeEntries.weeklyTimesheetId, weeklyTimesheets.id))
    .groupBy(weeklyTimesheets.weekStartDate)
    .orderBy(desc(weeklyTimesheets.weekStartDate))
    .limit(weeksCount);

  return rows.map((r) => ({ ...r, hours: Number(r.hours) })).reverse();
}

export type LaborReportDay = { date: string; hours: number; notes: string | null };
export type LaborReportEmployee = {
  userId: string;
  fullName: string;
  title: string | null;
  days: LaborReportDay[];
};

/** One entry per employee who logged hours against `projectId` within [monthStartISO, monthEndISO],
 * each with one row per date worked (multiple same-day entries summed, notes joined). */
export async function listLaborReportData(
  projectId: string,
  monthStartISO: string,
  monthEndISO: string,
): Promise<LaborReportEmployee[]> {
  const rows = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      title: users.title,
      entryDate: timeEntries.entryDate,
      hours: timeEntries.hours,
      notes: timeEntries.notes,
    })
    .from(timeEntries)
    .innerJoin(weeklyTimesheets, eq(weeklyTimesheets.id, timeEntries.weeklyTimesheetId))
    .innerJoin(users, eq(users.id, weeklyTimesheets.userId))
    .where(
      and(
        eq(timeEntries.projectId, projectId),
        gte(timeEntries.entryDate, monthStartISO),
        lte(timeEntries.entryDate, monthEndISO),
      ),
    )
    .orderBy(users.fullName, timeEntries.entryDate);

  const byUser = new Map<string, LaborReportEmployee>();
  for (const r of rows) {
    let employee = byUser.get(r.userId);
    if (!employee) {
      employee = { userId: r.userId, fullName: r.fullName, title: r.title, days: [] };
      byUser.set(r.userId, employee);
    }

    const hours = Number(r.hours);
    const existingDay = employee.days.find((d) => d.date === r.entryDate);
    if (existingDay) {
      existingDay.hours += hours;
      if (r.notes) {
        existingDay.notes = existingDay.notes ? `${existingDay.notes}; ${r.notes}` : r.notes;
      }
    } else {
      employee.days.push({ date: r.entryDate, hours, notes: r.notes });
    }
  }

  return Array.from(byUser.values());
}

export async function listAllTimesheetsWithUser(filters?: {
  userId?: string;
  from?: string;
  to?: string;
}) {
  const conditions = [];
  if (filters?.userId) conditions.push(eq(weeklyTimesheets.userId, filters.userId));
  if (filters?.from) conditions.push(gte(weeklyTimesheets.weekStartDate, filters.from));
  if (filters?.to) conditions.push(lte(weeklyTimesheets.weekEndDate, filters.to));

  const rows = await db
    .select({
      id: weeklyTimesheets.id,
      weekStartDate: weeklyTimesheets.weekStartDate,
      weekEndDate: weeklyTimesheets.weekEndDate,
      employeeName: users.fullName,
      weekTotal: sql<string>`coalesce(sum(${timeEntries.hours}), 0)`,
    })
    .from(weeklyTimesheets)
    .innerJoin(users, eq(users.id, weeklyTimesheets.userId))
    .leftJoin(timeEntries, eq(timeEntries.weeklyTimesheetId, weeklyTimesheets.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(weeklyTimesheets.id, users.fullName)
    .orderBy(desc(weeklyTimesheets.weekStartDate));

  return rows.map((r) => ({ ...r, weekTotal: Number(r.weekTotal) }));
}

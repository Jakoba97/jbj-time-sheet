"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { activityTypeEnum, timeEntries, weeklyTimesheets } from "@/lib/db/schema";
import { getTimesheetById, getTimeEntryWithOwner } from "@/lib/db/queries/timesheets";
import { getProjectByName } from "@/lib/db/queries/projects";
import { getEmployeeTitleById } from "@/lib/db/queries/employeeTitles";
import { hoursBetween } from "@/lib/utils/time";
import { recordAudit } from "@/lib/audit/log";

const timeEntrySchema = z.object({
  timesheetId: z.string().uuid(),
  projectId: z.string().uuid(),
  titleId: z.string().uuid().optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  activityType: z.enum(activityTypeEnum.enumValues),
  notes: z.string().max(2000).optional(),
});

// Loosely typed at the call boundary (activityType as plain string) so client components don't
// need to import the server-only zod schema's literal union; timeEntrySchema.safeParse enforces
// the real constraint at runtime.
export type TimeEntryInput = {
  timesheetId: string;
  projectId: string;
  titleId?: string;
  entryDate: string;
  startTime: string;
  endTime: string;
  activityType: string;
  notes?: string;
};

/** A titleId must belong to the timesheet's own owner — otherwise an employee could tag an
 * entry with another employee's title via a crafted request. */
async function resolveTitleId(
  titleId: string | undefined,
  timesheetOwnerId: string,
): Promise<{ error: string | null; titleId: string | null }> {
  if (!titleId) return { error: null, titleId: null };
  const title = await getEmployeeTitleById(titleId);
  if (!title || title.userId !== timesheetOwnerId) {
    return { error: "Invalid title selection.", titleId: null };
  }
  return { error: null, titleId };
}

async function authorizeForTimesheet(timesheetId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." as const, timesheet: null, actorUserId: null };

  const timesheet = await getTimesheetById(timesheetId);
  if (!timesheet) {
    return { error: "Timesheet not found." as const, timesheet: null, actorUserId: null };
  }

  const isOwner = timesheet.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return { error: "Not authorized." as const, timesheet: null, actorUserId: null };
  }

  return { error: null, timesheet, actorUserId: session.user.id };
}

function revalidateTimesheetPaths(timesheetId: string, weekStartDate: string) {
  revalidatePath("/dashboard");
  revalidatePath("/timesheets");
  revalidatePath(`/timesheets/${weekStartDate}`);
  revalidatePath("/admin/timesheets");
  revalidatePath(`/admin/timesheets/${timesheetId}`);
}

export async function createTimeEntryAction(
  input: TimeEntryInput,
): Promise<{ error: string | null }> {
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const { error, timesheet, actorUserId } = await authorizeForTimesheet(data.timesheetId);
  if (error || !timesheet || !actorUserId) return { error };

  if (data.entryDate < timesheet.weekStartDate || data.entryDate > timesheet.weekEndDate) {
    return { error: "That date isn't in this week." };
  }

  const hours = hoursBetween(data.startTime, data.endTime);
  if (hours <= 0) return { error: "End time must be after start time." };

  const titleResult = await resolveTitleId(data.titleId, timesheet.userId);
  if (titleResult.error) return { error: titleResult.error };

  const newValues = {
    weeklyTimesheetId: data.timesheetId,
    projectId: data.projectId,
    titleId: titleResult.titleId,
    entryDate: data.entryDate,
    startTime: data.startTime,
    endTime: data.endTime,
    activityType: data.activityType,
    notes: data.notes || null,
    hours: hours.toFixed(2),
  };
  const [created] = await db.insert(timeEntries).values(newValues).returning();

  await recordAudit({
    actorUserId,
    entityType: "time_entry",
    entityId: created.id,
    action: "create",
    targetUserId: timesheet.userId,
    after: newValues,
  });

  revalidateTimesheetPaths(data.timesheetId, timesheet.weekStartDate);
  return { error: null };
}

export async function updateTimeEntryAction(
  entryId: string,
  input: TimeEntryInput,
): Promise<{ error: string | null }> {
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const { error, timesheet, actorUserId } = await authorizeForTimesheet(data.timesheetId);
  if (error || !timesheet || !actorUserId) return { error };

  const owned = await getTimeEntryWithOwner(entryId);
  if (!owned || owned.timesheetId !== data.timesheetId) {
    return { error: "Entry not found." };
  }

  if (data.entryDate < timesheet.weekStartDate || data.entryDate > timesheet.weekEndDate) {
    return { error: "That date isn't in this week." };
  }

  const hours = hoursBetween(data.startTime, data.endTime);
  if (hours <= 0) return { error: "End time must be after start time." };

  const titleResult = await resolveTitleId(data.titleId, timesheet.userId);
  if (titleResult.error) return { error: titleResult.error };

  const newValues = {
    projectId: data.projectId,
    titleId: titleResult.titleId,
    entryDate: data.entryDate,
    startTime: data.startTime,
    endTime: data.endTime,
    activityType: data.activityType,
    notes: data.notes || null,
    hours: hours.toFixed(2),
  };
  await db.update(timeEntries).set(newValues).where(eq(timeEntries.id, entryId));

  await recordAudit({
    actorUserId,
    entityType: "time_entry",
    entityId: entryId,
    action: "update",
    targetUserId: timesheet.userId,
    before: owned.entry,
    after: newValues,
  });

  revalidateTimesheetPaths(data.timesheetId, timesheet.weekStartDate);
  return { error: null };
}

export async function deleteTimeEntryAction(entryId: string): Promise<{ error: string | null }> {
  const owned = await getTimeEntryWithOwner(entryId);
  if (!owned) return { error: "Entry not found." };

  const { error, timesheet, actorUserId } = await authorizeForTimesheet(owned.timesheetId);
  if (error || !timesheet || !actorUserId) return { error };

  await db.delete(timeEntries).where(eq(timeEntries.id, entryId));

  await recordAudit({
    actorUserId,
    entityType: "time_entry",
    entityId: entryId,
    action: "delete",
    targetUserId: timesheet.userId,
    before: owned.entry,
  });

  revalidateTimesheetPaths(owned.timesheetId, timesheet.weekStartDate);
  return { error: null };
}

const STANDARD_WORKDAY = { startTime: "09:00", endTime: "17:00" };

export async function addHolidayEntryAction(
  timesheetId: string,
  entryDate: string,
): Promise<{ error: string | null }> {
  const { error, timesheet } = await authorizeForTimesheet(timesheetId);
  if (error || !timesheet) return { error };

  if (entryDate < timesheet.weekStartDate || entryDate > timesheet.weekEndDate) {
    return { error: "That date isn't in this week." };
  }

  const holidayProject = await getProjectByName("Holiday");
  if (!holidayProject) return { error: 'No "Holiday" project is set up.' };

  const existing = await db.query.timeEntries.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.weeklyTimesheetId, timesheetId),
        eq(t.projectId, holidayProject.id),
        eq(t.entryDate, entryDate),
      ),
  });
  if (existing) return { error: null };

  const hours = hoursBetween(STANDARD_WORKDAY.startTime, STANDARD_WORKDAY.endTime);
  await db.insert(timeEntries).values({
    weeklyTimesheetId: timesheetId,
    projectId: holidayProject.id,
    entryDate,
    startTime: STANDARD_WORKDAY.startTime,
    endTime: STANDARD_WORKDAY.endTime,
    activityType: "holiday",
    hours: hours.toFixed(2),
  });

  revalidateTimesheetPaths(timesheetId, timesheet.weekStartDate);
  return { error: null };
}

export async function updateWeeklyActivityNotesAction(
  timesheetId: string,
  notes: string,
): Promise<{ error: string | null }> {
  const { error, timesheet, actorUserId } = await authorizeForTimesheet(timesheetId);
  if (error || !timesheet || !actorUserId) return { error };

  const trimmedNotes = notes.slice(0, 4000);
  await db
    .update(weeklyTimesheets)
    .set({ weeklyActivityNotes: trimmedNotes, updatedAt: new Date() })
    .where(eq(weeklyTimesheets.id, timesheetId));

  await recordAudit({
    actorUserId,
    entityType: "weekly_notes",
    entityId: timesheetId,
    action: "update",
    targetUserId: timesheet.userId,
    before: { weeklyActivityNotes: timesheet.weeklyActivityNotes },
    after: { weeklyActivityNotes: trimmedNotes },
  });

  revalidateTimesheetPaths(timesheetId, timesheet.weekStartDate);
  return { error: null };
}

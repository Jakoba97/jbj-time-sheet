import { getTimesheetById, getTimeEntriesForTimesheet } from "@/lib/db/queries/timesheets";
import { getUserById } from "@/lib/db/queries/users";
import { listActiveProjects } from "@/lib/db/queries/projects";
import { getWeekDates, parseDateISO, visibleWeekDates } from "@/lib/utils/week";
import { computeTotals } from "@/lib/utils/totals";
import type { PdfTimesheetData } from "@/lib/pdf/types";

export async function buildTimesheetData(timesheetId: string): Promise<PdfTimesheetData | null> {
  const timesheet = await getTimesheetById(timesheetId);
  if (!timesheet) return null;

  const [user, entries, projects] = await Promise.all([
    getUserById(timesheet.userId),
    getTimeEntriesForTimesheet(timesheetId),
    listActiveProjects(),
  ]);
  if (!user) return null;

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const totals = computeTotals(
    entries.map((e) => ({ projectId: e.projectId, entryDate: e.entryDate, hours: Number(e.hours) })),
  );

  const activityEntries = entries
    .map((e) => ({
      entryDate: e.entryDate,
      startTime: e.startTime,
      endTime: e.endTime,
      projectName: projectNameById.get(e.projectId) ?? "Unknown project",
      activityType: e.activityType,
      notes: e.notes,
      hours: Number(e.hours),
    }))
    .sort(
      (a, b) =>
        a.entryDate.localeCompare(b.entryDate) || (a.startTime ?? "").localeCompare(b.startTime ?? ""),
    );

  return {
    employeeName: user.fullName,
    weekStartDate: timesheet.weekStartDate,
    weekEndDate: timesheet.weekEndDate,
    checkDate: timesheet.checkDate,
    weeklyActivityNotes: timesheet.weeklyActivityNotes,
    weekDates: visibleWeekDates(getWeekDates(parseDateISO(timesheet.weekStartDate)), entries),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    hours: totals.hours,
    activityEntries,
  };
}

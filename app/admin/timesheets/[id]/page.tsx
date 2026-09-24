import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TimeEntryWorkspace } from "@/components/timesheet/TimeEntryWorkspace";
import { WeeklyActivityNotes } from "@/components/timesheet/WeeklyActivityNotes";
import { PdfDownloadButton } from "@/components/timesheet/PdfDownloadButton";
import { listActiveProjects, listSpecialActivityProjects } from "@/lib/db/queries/projects";
import { getTimesheetById, getTimeEntriesForTimesheet } from "@/lib/db/queries/timesheets";
import { getUserById } from "@/lib/db/queries/users";
import { listTitlesForUser } from "@/lib/db/queries/employeeTitles";
import { formatWeekRange, getWeekDates, parseDateISO, visibleWeekDates } from "@/lib/utils/week";
import { weekSpansTwoMonths } from "@/lib/pdf/splitByMonth";

export default async function AdminTimesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const timesheet = await getTimesheetById(id);
  if (!timesheet) notFound();

  const [employee, projects, specialProjects, entries, titles] = await Promise.all([
    getUserById(timesheet.userId),
    listActiveProjects(),
    listSpecialActivityProjects(),
    getTimeEntriesForTimesheet(id),
    listTitlesForUser(timesheet.userId),
  ]);
  if (!employee) notFound();

  const weekDates = getWeekDates(parseDateISO(timesheet.weekStartDate));
  const entryRecords = entries.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    titleId: e.titleId,
    entryDate: e.entryDate,
    startTime: e.startTime,
    endTime: e.endTime,
    activityType: e.activityType,
    notes: e.notes,
    hours: Number(e.hours),
  }));

  return (
    <AppShell>
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-brand-gray">{employee.fullName}</h1>
        <p className="text-brand-gray">
          {formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate)}
        </p>
      </div>

      <TimeEntryWorkspace
        timesheetId={timesheet.id}
        projects={projects}
        specialProjects={specialProjects}
        titles={titles}
        weekDates={weekDates}
        initialEntries={entryRecords}
      />

      <div className="mt-6">
        <WeeklyActivityNotes
          timesheetId={timesheet.id}
          initialNotes={timesheet.weeklyActivityNotes ?? ""}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <PdfDownloadButton
          timesheetId={timesheet.id}
          spansTwoMonths={weekSpansTwoMonths(visibleWeekDates(weekDates, entryRecords))}
        />
        <a
          href={`/api/timesheets/${timesheet.id}/pdf/summary`}
          className="h-12 rounded-md border-2 border-brand-red px-6 py-3 text-lg font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white"
        >
          Download Summary PDF
        </a>
        <a
          href={`/api/timesheets/${timesheet.id}/excel`}
          className="h-12 rounded-md border-2 border-brand-red px-6 py-3 text-lg font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white"
        >
          Download Excel
        </a>
      </div>
    </AppShell>
  );
}

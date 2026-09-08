import { AppShell } from "@/components/layout/AppShell";
import { TimeEntryWorkspace } from "@/components/timesheet/TimeEntryWorkspace";
import { WeeklyActivityNotes } from "@/components/timesheet/WeeklyActivityNotes";
import { HolidayPrompt } from "@/components/timesheet/HolidayPrompt";
import { WeekPicker } from "@/components/timesheet/WeekPicker";
import { PdfDownloadButton } from "@/components/timesheet/PdfDownloadButton";
import { AlertBadge } from "@/components/shared/AlertBadge";
import { auth } from "@/lib/auth";
import { listActiveProjects, getProjectByName } from "@/lib/db/queries/projects";
import { getOrCreateWeeklyTimesheet, getTimeEntriesForTimesheet } from "@/lib/db/queries/timesheets";
import { getHolidaysInRange } from "@/lib/db/queries/holidays";
import {
  formatWeekRange,
  getWeekDates,
  getWeekStart,
  formatDateISO,
  visibleWeekDates,
} from "@/lib/utils/week";
import { filterUnloggedHolidays } from "@/lib/utils/holidays";
import { computeTotals } from "@/lib/utils/totals";
import { weekSpansTwoMonths } from "@/lib/pdf/splitByMonth";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const weekStartISO = formatDateISO(getWeekStart());
  const timesheet = await getOrCreateWeeklyTimesheet(userId, weekStartISO);
  const [projects, entries, holidaysInWeek, holidayProject] = await Promise.all([
    listActiveProjects(),
    getTimeEntriesForTimesheet(timesheet.id),
    getHolidaysInRange(timesheet.weekStartDate, timesheet.weekEndDate),
    getProjectByName("Holiday"),
  ]);

  const weekDates = getWeekDates(getWeekStart());
  const entryRecords = entries.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    entryDate: e.entryDate,
    startTime: e.startTime,
    endTime: e.endTime,
    activityType: e.activityType,
    notes: e.notes,
    hours: Number(e.hours),
  }));
  const unloggedHolidays = filterUnloggedHolidays(
    holidaysInWeek,
    entryRecords,
    holidayProject?.id ?? null,
  );
  const weekTotal = computeTotals(entryRecords).weekTotal;

  return (
    <AppShell>
      <div className="mb-4 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-brand-gray">This Week</h1>
        <p className="flex items-center gap-3 text-brand-gray">
          {formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate)}
          {weekTotal > 40 && <AlertBadge>Overtime: {weekTotal.toFixed(2)} hrs</AlertBadge>}
        </p>
        <WeekPicker currentWeekStart={weekStartISO} />
      </div>

      <HolidayPrompt timesheetId={timesheet.id} holidays={unloggedHolidays} />

      <TimeEntryWorkspace
        timesheetId={timesheet.id}
        projects={projects}
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

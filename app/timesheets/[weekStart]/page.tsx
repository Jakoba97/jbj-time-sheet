import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TimeEntryWorkspace } from "@/components/timesheet/TimeEntryWorkspace";
import { WeeklyActivityNotes } from "@/components/timesheet/WeeklyActivityNotes";
import { HolidayPrompt } from "@/components/timesheet/HolidayPrompt";
import { WeekPicker } from "@/components/timesheet/WeekPicker";
import { PdfDownloadButton } from "@/components/timesheet/PdfDownloadButton";
import { AlertBadge } from "@/components/shared/AlertBadge";
import { auth } from "@/lib/auth";
import {
  listActiveProjects,
  listSpecialActivityProjects,
  getProjectByName,
} from "@/lib/db/queries/projects";
import { getOrCreateWeeklyTimesheet, getTimeEntriesForTimesheet } from "@/lib/db/queries/timesheets";
import { listTitlesForUser } from "@/lib/db/queries/employeeTitles";
import { getHolidaysInRange } from "@/lib/db/queries/holidays";
import {
  addDays,
  formatDateISO,
  formatWeekRange,
  getWeekDates,
  parseDateISO,
  visibleWeekDates,
} from "@/lib/utils/week";
import { filterUnloggedHolidays } from "@/lib/utils/holidays";
import { computeTotals } from "@/lib/utils/totals";
import { weekSpansTwoMonths } from "@/lib/pdf/splitByMonth";

const WEEK_START_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function TimesheetWeekPage({
  params,
}: {
  params: Promise<{ weekStart: string }>;
}) {
  const { weekStart } = await params;
  if (!WEEK_START_RE.test(weekStart)) notFound();

  const session = await auth();
  const userId = session!.user.id;

  const timesheet = await getOrCreateWeeklyTimesheet(userId, weekStart);
  const [projects, specialProjects, entries, holidaysInWeek, holidayProject, titles] = await Promise.all([
    listActiveProjects(),
    listSpecialActivityProjects(),
    getTimeEntriesForTimesheet(timesheet.id),
    getHolidaysInRange(timesheet.weekStartDate, timesheet.weekEndDate),
    getProjectByName("Holiday"),
    listTitlesForUser(userId),
  ]);

  const weekDates = getWeekDates(parseDateISO(weekStart));
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
  const unloggedHolidays = filterUnloggedHolidays(
    holidaysInWeek,
    entryRecords,
    holidayProject?.id ?? null,
  );
  const weekTotal = computeTotals(entryRecords).weekTotal;

  const prevWeek = formatDateISO(addDays(parseDateISO(weekStart), -7));
  const nextWeek = formatDateISO(addDays(parseDateISO(weekStart), 7));

  return (
    <AppShell>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Link href={`/timesheets/${prevWeek}`} className="text-lg text-brand-red hover:underline">
            &larr; Prev Week
          </Link>
          <h1 className="text-2xl font-bold text-brand-gray">
            {formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate)}
          </h1>
          <Link href={`/timesheets/${nextWeek}`} className="text-lg text-brand-red hover:underline">
            Next Week &rarr;
          </Link>
          {weekTotal > 40 && <AlertBadge>Overtime: {weekTotal.toFixed(2)} hrs</AlertBadge>}
        </div>
        <WeekPicker currentWeekStart={weekStart} />
      </div>

      <HolidayPrompt timesheetId={timesheet.id} holidays={unloggedHolidays} />

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

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TimesheetFilterBar } from "@/components/admin/TimesheetFilterBar";
import { AlertBadge } from "@/components/shared/AlertBadge";
import { DriveExportButton } from "@/components/timesheet/DriveExportButton";
import { listAllTimesheetsWithUser } from "@/lib/db/queries/timesheets";
import { listUsers } from "@/lib/db/queries/users";
import { formatWeekRange } from "@/lib/utils/week";

export default async function AdminTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string; from?: string; to?: string }>;
}) {
  const { employee, from, to } = await searchParams;
  const [timesheets, users] = await Promise.all([
    listAllTimesheetsWithUser({ userId: employee, from, to }),
    listUsers(),
  ]);

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-bold text-brand-gray">All Timesheets</h1>
      <TimesheetFilterBar
        users={users.map((u) => ({ id: u.id, fullName: u.fullName }))}
        initialEmployee={employee ?? ""}
        initialFrom={from ?? ""}
        initialTo={to ?? ""}
      />
      {timesheets.length === 0 ? (
        <p className="text-brand-gray">No timesheets match.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {timesheets.map((ts) => (
            <div key={ts.id} className="flex items-start gap-3">
              <Link
                href={`/admin/timesheets/${ts.id}`}
                className="flex flex-1 items-center justify-between rounded-md border border-brand-rose/40 px-4 py-3 text-lg text-brand-gray hover:bg-brand-rose/10"
              >
                <span className="flex gap-4">
                  <span className="font-medium">{ts.employeeName}</span>
                  <span>{formatWeekRange(ts.weekStartDate, ts.weekEndDate)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span>{ts.weekTotal.toFixed(2)} hrs</span>
                  {ts.weekTotal > 40 && <AlertBadge>Overtime</AlertBadge>}
                </span>
              </Link>
              <DriveExportButton timesheetId={ts.id} compact />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

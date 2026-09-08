import { AppShell } from "@/components/layout/AppShell";
import { HoursByEmployeeChart } from "@/components/admin/dashboard/HoursByEmployeeChart";
import { HoursByProjectChart } from "@/components/admin/dashboard/HoursByProjectChart";
import { listHoursByEmployeeForWeek } from "@/lib/db/queries/timesheets";
import { listProjectsWithHours } from "@/lib/db/queries/projects";
import { addDays, formatDateISO, getWeekStart } from "@/lib/utils/week";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md border border-brand-rose/40 p-4">
      <span className="text-3xl font-bold text-brand-maroon">{value}</span>
      <span className="text-base text-brand-gray">{label}</span>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const weekStartISO = formatDateISO(getWeekStart());
  const lastWeekStartISO = formatDateISO(addDays(getWeekStart(), -7));

  const [employeeHours, lastWeekHours, projects] = await Promise.all([
    listHoursByEmployeeForWeek(weekStartISO),
    listHoursByEmployeeForWeek(lastWeekStartISO),
    listProjectsWithHours(),
  ]);

  const totalHoursThisWeek = employeeHours.reduce((sum, e) => sum + e.hours, 0);
  const totalHoursLastWeek = lastWeekHours.reduce((sum, e) => sum + e.hours, 0);
  const activeEmployeeCount = employeeHours.filter((e) => e.hours > 0).length;

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-bold text-brand-gray">Dashboard</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <StatTile
          label="Active Employees This Week"
          value={`${activeEmployeeCount} / ${employeeHours.length}`}
        />
        <StatTile label="Total Hours This Week" value={totalHoursThisWeek.toFixed(1)} />
        <StatTile label="Total Hours Last Week" value={totalHoursLastWeek.toFixed(1)} />
      </div>

      <div className="mb-6 rounded-md border border-brand-rose/40 p-4">
        <h2 className="mb-3 text-xl font-bold text-brand-gray">Hours by Employee (This Week)</h2>
        <HoursByEmployeeChart data={employeeHours} />
      </div>

      <div className="mb-6 rounded-md border border-brand-rose/40 p-4">
        <h2 className="mb-3 text-xl font-bold text-brand-gray">Hours by Project (All Time)</h2>
        <HoursByProjectChart data={projects} />
      </div>
    </AppShell>
  );
}

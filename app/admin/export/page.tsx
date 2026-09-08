import { AppShell } from "@/components/layout/AppShell";
import { BulkExportForm } from "@/components/admin/BulkExportForm";
import { LaborReportExportForm } from "@/components/admin/LaborReportExportForm";
import { listActiveProjects } from "@/lib/db/queries/projects";
import { formatDateISO, getWeekStart } from "@/lib/utils/week";

export default async function AdminExportPage() {
  const defaultWeekStart = formatDateISO(getWeekStart());
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const projects = await listActiveProjects();

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-bold text-brand-gray">Bulk Export</h1>
      <p className="mb-4 text-brand-gray">
        Download every employee&apos;s timesheet for a given week in a single ZIP file.
      </p>
      <div className="mb-8">
        <BulkExportForm defaultWeekStart={defaultWeekStart} />
      </div>

      <h1 className="mb-2 text-2xl font-bold text-brand-gray">Labor Report</h1>
      <p className="mb-4 text-brand-gray">
        Download a monthly labor backup report for a project &mdash; one sheet per employee who
        logged hours against it that month.
      </p>
      <LaborReportExportForm
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        defaultMonth={defaultMonth}
      />
    </AppShell>
  );
}

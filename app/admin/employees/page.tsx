import { AppShell } from "@/components/layout/AppShell";
import { AddEmployeeForm } from "@/components/admin/AddEmployeeForm";
import { EmployeeRow } from "@/components/admin/EmployeeRow";
import { listUsers } from "@/lib/db/queries/users";
import { listAllEmployeeTitles } from "@/lib/db/queries/employeeTitles";

export default async function AdminEmployeesPage() {
  const [employees, allTitles] = await Promise.all([listUsers(), listAllEmployeeTitles()]);

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-bold text-brand-gray">Employees</h1>
      <div className="mb-6">
        <AddEmployeeForm />
      </div>
      <div className="flex flex-col gap-2">
        {employees.map((u) => (
          <EmployeeRow
            key={u.id}
            id={u.id}
            fullName={u.fullName}
            title={u.title}
            username={u.username}
            role={u.role}
            active={u.active}
            timeEntryTitles={allTitles
              .filter((t) => t.userId === u.id)
              .map((t) => ({ id: t.id, title: t.title }))}
          />
        ))}
      </div>
    </AppShell>
  );
}

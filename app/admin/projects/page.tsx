import { AppShell } from "@/components/layout/AppShell";
import { AddProjectForm } from "@/components/admin/AddProjectForm";
import { ProjectRow } from "@/components/admin/ProjectRow";
import { listAllProjects } from "@/lib/db/queries/projects";
import { SPECIAL_ACTIVITY_PROJECT_NAMES } from "@/lib/constants/specialActivityProjects";

export default async function AdminProjectsPage() {
  const allProjects = await listAllProjects();
  // PTO/Holiday/Benevolence/Sick Time are managed as "What kind of activity?" buttons on the Log
  // Time form, not as projects an admin adds/deactivates here.
  const projects = allProjects.filter((p) => !SPECIAL_ACTIVITY_PROJECT_NAMES.includes(p.name));

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-bold text-brand-gray">Projects</h1>
      <div className="mb-6">
        <AddProjectForm />
      </div>
      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <ProjectRow key={p.id} id={p.id} name={p.name} isActive={p.isActive} />
        ))}
      </div>
    </AppShell>
  );
}

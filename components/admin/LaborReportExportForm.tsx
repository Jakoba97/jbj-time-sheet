"use client";

import { useState } from "react";

type Project = { id: string; name: string };

export function LaborReportExportForm({
  projects,
  defaultMonth,
}: {
  projects: Project[];
  defaultMonth: string;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [month, setMonth] = useState(defaultMonth);
  const [taskOrder, setTaskOrder] = useState("");

  const href = `/api/admin/export/labor-report?projectId=${encodeURIComponent(projectId)}&month=${encodeURIComponent(month)}&taskOrder=${encodeURIComponent(taskOrder)}`;

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-md border border-brand-rose/40 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="laborReportProject">
          Project
        </label>
        <select
          id="laborReportProject"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="laborReportMonth">
          Month
        </label>
        <input
          id="laborReportMonth"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="laborReportTaskOrder">
          Task Order
        </label>
        <input
          id="laborReportTaskOrder"
          type="text"
          value={taskOrder}
          onChange={(e) => setTaskOrder(e.target.value)}
          placeholder="e.g. Task Order 16 - Management"
          className="h-12 w-72 rounded-md border border-brand-rose/50 px-3 text-lg"
        />
      </div>
      <a
        href={href}
        className="h-12 rounded-md border-2 border-brand-red px-6 py-3 text-lg font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white"
      >
        Download Labor Report
      </a>
    </div>
  );
}

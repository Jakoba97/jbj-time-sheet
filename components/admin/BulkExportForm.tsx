"use client";

import { useState } from "react";

export function BulkExportForm({ defaultWeekStart }: { defaultWeekStart: string }) {
  const [weekStart, setWeekStart] = useState(defaultWeekStart);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-md border border-brand-rose/40 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="weekStart">
          Week Starting (Monday)
        </label>
        <input
          id="weekStart"
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
        />
      </div>
      <a
        href={`/api/admin/export/bulk?weekStart=${weekStart}&kind=pdf`}
        className="h-12 rounded-md border-2 border-brand-red px-6 py-3 text-lg font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white"
      >
        Download All PDFs (ZIP)
      </a>
      <a
        href={`/api/admin/export/bulk?weekStart=${weekStart}&kind=excel`}
        className="h-12 rounded-md border-2 border-brand-red px-6 py-3 text-lg font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white"
      >
        Download All Excel (ZIP)
      </a>
    </div>
  );
}

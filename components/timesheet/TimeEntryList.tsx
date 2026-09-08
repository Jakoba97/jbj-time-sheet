"use client";

import { useState } from "react";
import { activityTypeLabel } from "@/lib/constants/activityTypes";
import { computeTotals } from "@/lib/utils/totals";
import { formatTimeRange } from "@/lib/utils/time";
import type { WeekDate } from "@/lib/utils/week";
import type { TimeEntryRecord } from "./TimeEntryForm";

type Project = { id: string; name: string };

function EntryCard({
  entry,
  projectName,
  allWeekDates,
  onEdit,
  onDuplicate,
  onDelete,
  deleting,
  duplicating,
}: {
  entry: TimeEntryRecord;
  projectName: string;
  allWeekDates: WeekDate[];
  onEdit: (entry: TimeEntryRecord) => void;
  onDuplicate: (entry: TimeEntryRecord, targetDate: string) => void;
  onDelete: (entryId: string) => void;
  deleting: boolean;
  duplicating: boolean;
}) {
  const [duplicateDate, setDuplicateDate] = useState(entry.entryDate);

  return (
    <div className="flex flex-col gap-1 rounded-md border border-brand-rose/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg text-brand-gray">
          <span className="font-semibold">
            {entry.startTime && entry.endTime
              ? formatTimeRange(entry.startTime, entry.endTime)
              : "Imported, no time logged"}
          </span>
          {" · "}
          {projectName}
        </span>
        <span className="text-base font-semibold text-brand-gray">{entry.hours.toFixed(2)} hrs</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base text-brand-gray">
          {activityTypeLabel(entry.activityType)}
          {entry.notes ? ` · ${entry.notes}` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={duplicateDate}
            onChange={(e) => setDuplicateDate(e.target.value)}
            aria-label="Day to duplicate this entry to"
            className="h-9 rounded-md border border-brand-rose/50 px-2 text-sm text-brand-gray"
          >
            {allWeekDates.map((wd) => (
              <option key={wd.date} value={wd.date}>
                {wd.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={duplicating || !entry.startTime || !entry.endTime}
            onClick={() => onDuplicate(entry, duplicateDate)}
            title={
              !entry.startTime || !entry.endTime
                ? "This entry has no time-of-day to duplicate"
                : undefined
            }
            className="h-9 rounded-md border-2 border-brand-gray px-3 text-sm font-semibold text-brand-gray hover:bg-brand-gray hover:text-brand-white disabled:opacity-60"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="h-9 rounded-md border-2 border-brand-gray px-3 text-sm font-semibold text-brand-gray hover:bg-brand-gray hover:text-brand-white"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(entry.id)}
            className="h-9 rounded-md border-2 border-brand-red px-3 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TimeEntryList({
  entries,
  projects,
  weekDates,
  allWeekDates,
  onEdit,
  onDuplicate,
  onDelete,
  deletingId,
  duplicatingId,
}: {
  entries: TimeEntryRecord[];
  projects: Project[];
  weekDates: WeekDate[];
  allWeekDates: WeekDate[];
  onEdit: (entry: TimeEntryRecord) => void;
  onDuplicate: (entry: TimeEntryRecord, targetDate: string) => void;
  onDelete: (entryId: string) => void;
  deletingId: string | null;
  duplicatingId: string | null;
}) {
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Unknown project";
  const totals = computeTotals(entries.map((e) => ({ ...e, entryDate: e.entryDate })));

  return (
    <div className="flex flex-col gap-4">
      {weekDates.map((wd) => {
        const dayEntries = entries
          .filter((e) => e.entryDate === wd.date)
          .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

        return (
          <div key={wd.date} className="flex flex-col gap-2">
            <h3 className="text-lg font-bold text-brand-gray">
              {wd.label}
              <span className="ml-2 text-base font-normal text-brand-gray">
                {(totals.dailyTotals[wd.date] ?? 0).toFixed(2)} hrs
              </span>
            </h3>
            {dayEntries.length === 0 ? (
              <p className="text-base text-brand-gray">No entries yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dayEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    projectName={projectName(entry.projectId)}
                    allWeekDates={allWeekDates}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    deleting={deletingId === entry.id}
                    duplicating={duplicatingId === entry.id}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-2 rounded-md bg-brand-maroon/10 p-3 text-lg font-bold text-brand-gray">
        Week Total: {totals.weekTotal.toFixed(2)} hrs
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TimeEntryForm, type TimeEntryFormValues, type TimeEntryRecord } from "./TimeEntryForm";
import { TimeEntryList } from "./TimeEntryList";
import { AggregateGridView } from "./AggregateGridView";
import {
  createTimeEntryAction,
  deleteTimeEntryAction,
  updateTimeEntryAction,
} from "@/app/timesheet-actions";
import { visibleWeekDates, type WeekDate } from "@/lib/utils/week";

type Project = { id: string; name: string };

export function TimeEntryWorkspace({
  timesheetId,
  projects,
  weekDates,
  initialEntries,
}: {
  timesheetId: string;
  projects: Project[];
  weekDates: WeekDate[];
  initialEntries: TimeEntryRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [formState, setFormState] = useState<{
    mode: "create" | "edit";
    initialValues: TimeEntryFormValues | null;
    editingId: string | null;
  }>({ mode: "create", initialValues: null, editingId: null });

  function resetForm() {
    setFormState({ mode: "create", initialValues: null, editingId: null });
    setFormKey((k) => k + 1);
  }

  function handleEdit(entry: TimeEntryRecord) {
    setError(null);
    setFormKey((k) => k + 1);
    setFormState({
      mode: "edit",
      editingId: entry.id,
      initialValues: {
        projectId: entry.projectId,
        entryDate: entry.entryDate,
        startTime: entry.startTime ?? "",
        endTime: entry.endTime ?? "",
        activityType: entry.activityType ?? "project_work",
        notes: entry.notes ?? "",
      },
    });
  }

  function handleDuplicate(entry: TimeEntryRecord, targetDate: string) {
    if (!entry.startTime || !entry.endTime) {
      setError("This entry has no time-of-day to copy, so it can't be duplicated.");
      return;
    }
    setError(null);
    setDuplicatingId(entry.id);
    startTransition(async () => {
      const result = await createTimeEntryAction({
        timesheetId,
        projectId: entry.projectId,
        entryDate: targetDate,
        startTime: entry.startTime!,
        endTime: entry.endTime!,
        activityType: entry.activityType ?? "project_work",
        notes: entry.notes ?? "",
      });
      setDuplicatingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSubmit(values: TimeEntryFormValues) {
    setError(null);
    startTransition(async () => {
      const result =
        formState.mode === "edit" && formState.editingId
          ? await updateTimeEntryAction(formState.editingId, { timesheetId, ...values })
          : await createTimeEntryAction({ timesheetId, ...values });

      if (result.error) {
        setError(result.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(entryId: string) {
    setError(null);
    setDeletingId(entryId);
    startTransition(async () => {
      const result = await deleteTimeEntryAction(entryId);
      setDeletingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (formState.editingId === entryId) resetForm();
      router.refresh();
    });
  }

  const shownWeekDates = visibleWeekDates(weekDates, initialEntries);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-3">
        <TimeEntryForm
          key={formKey}
          projects={projects}
          weekDates={weekDates}
          existingEntries={initialEntries}
          mode={formState.mode}
          initialValues={formState.initialValues}
          pending={pending}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
        {error && <p className="text-base font-medium text-brand-red">{error}</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-6 rounded-md border border-brand-rose/40 p-4">
        <TimeEntryList
          entries={initialEntries}
          projects={projects}
          weekDates={shownWeekDates}
          allWeekDates={weekDates}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          deletingId={deletingId}
          duplicatingId={duplicatingId}
        />

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-brand-gray">Summary</h2>
          <AggregateGridView entries={initialEntries} projects={projects} weekDates={shownWeekDates} />
        </div>
      </div>
    </div>
  );
}

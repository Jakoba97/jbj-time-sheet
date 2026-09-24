"use client";

import { useEffect, useMemo, useState } from "react";
import { SELECTABLE_ACTIVITY_TYPES } from "@/lib/constants/activityTypes";
import { SPECIAL_ACTIVITY_PROJECT_NAMES } from "@/lib/constants/specialActivityProjects";
import { hoursBetween, isValidHHMM } from "@/lib/utils/time";
import type { WeekDate } from "@/lib/utils/week";

export type TimeEntryRecord = {
  id: string;
  projectId: string;
  titleId: string | null;
  entryDate: string;
  startTime: string | null;
  endTime: string | null;
  activityType: string | null;
  notes: string | null;
  hours: number;
};

export type TimeEntryFormValues = {
  projectId: string;
  titleId: string;
  entryDate: string;
  startTime: string;
  endTime: string;
  activityType: string;
  notes: string;
};

type Project = { id: string; name: string };
type Title = { id: string; title: string };

const DEFAULT_START_TIME = "09:00";

// Only considers "real work" entries so a week spent mostly on the Holiday/PTO placeholder
// project (from the automated Holiday-prompt/PTO-approval flows) doesn't make that placeholder
// the default project pre-selected for a brand new entry.
function mostUsedProjectId(entries: TimeEntryRecord[], specialProjectIds: Set<string>): string {
  const relevant = entries.filter((e) => !specialProjectIds.has(e.projectId));
  if (relevant.length === 0) return "";
  const counts = new Map<string, number>();
  for (const e of relevant) counts.set(e.projectId, (counts.get(e.projectId) ?? 0) + 1);
  let best = relevant[0].projectId;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

export function TimeEntryForm({
  projects,
  titles,
  weekDates,
  existingEntries,
  mode,
  initialValues,
  pending,
  onSubmit,
  onCancel,
}: {
  projects: Project[];
  titles: Title[];
  weekDates: WeekDate[];
  existingEntries: TimeEntryRecord[];
  mode: "create" | "edit";
  initialValues: TimeEntryFormValues | null;
  pending: boolean;
  onSubmit: (values: TimeEntryFormValues) => void;
  onCancel: () => void;
}) {
  const regularProjects = useMemo(
    () => projects.filter((p) => !SPECIAL_ACTIVITY_PROJECT_NAMES.includes(p.name)),
    [projects],
  );
  const specialProjectIds = useMemo(
    () =>
      new Set(
        projects.filter((p) => SPECIAL_ACTIVITY_PROJECT_NAMES.includes(p.name)).map((p) => p.id),
      ),
    [projects],
  );

  const defaults = useMemo<TimeEntryFormValues>(() => {
    if (initialValues) return initialValues;
    const entryDate = weekDates[0]?.date ?? "";
    return {
      projectId: mostUsedProjectId(existingEntries, specialProjectIds) || regularProjects[0]?.id || "",
      titleId: "",
      entryDate,
      startTime: DEFAULT_START_TIME,
      endTime: "",
      activityType: "project_work",
      notes: "",
    };
  }, [initialValues, existingEntries, regularProjects, specialProjectIds, weekDates]);

  const [values, setValues] = useState<TimeEntryFormValues>(defaults);
  const [startTouched, setStartTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(defaults);
    setStartTouched(false);
    setError(null);
  }, [defaults]);

  function selectDay(entryDate: string) {
    setValues((v) => ({
      ...v,
      entryDate,
      startTime: startTouched ? v.startTime : DEFAULT_START_TIME,
    }));
  }

  const duration =
    isValidHHMM(values.startTime) && isValidHHMM(values.endTime)
      ? hoursBetween(values.startTime, values.endTime)
      : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.projectId) return setError("Pick a project.");
    if (!values.entryDate) return setError("Pick a day.");
    if (!isValidHHMM(values.startTime) || !isValidHHMM(values.endTime)) {
      return setError("Enter a start and end time.");
    }
    if (duration <= 0) return setError("End time must be after start time.");
    setError(null);
    onSubmit(values);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-brand-rose/40 p-4"
    >
      <h2 className="text-xl font-bold text-brand-gray">
        {mode === "edit" ? "Edit Entry" : "Log Time"}
      </h2>

      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-brand-gray">Day</span>
        <div className="flex flex-wrap gap-2">
          {weekDates.map((wd) => (
            <button
              key={wd.date}
              type="button"
              onClick={() => selectDay(wd.date)}
              className={`h-12 rounded-md border-2 px-4 text-lg font-semibold transition-colors ${
                values.entryDate === wd.date
                  ? "border-brand-red bg-brand-red text-brand-white"
                  : wd.isWeekend
                    ? "border-dashed border-brand-rose/40 text-brand-gray/60 hover:border-brand-red"
                    : "border-brand-rose/50 text-brand-gray hover:border-brand-red"
              }`}
            >
              {wd.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="projectId">
          Project
        </label>
        <select
          id="projectId"
          value={values.projectId}
          onChange={(e) => setValues((v) => ({ ...v, projectId: e.target.value }))}
          className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
        >
          {regularProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {titles.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="titleId">
            Title
          </label>
          <select
            id="titleId"
            value={values.titleId}
            onChange={(e) => setValues((v) => ({ ...v, titleId: e.target.value }))}
            className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
          >
            <option value="">No specific title</option>
            {titles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="startTime">
            Start Time
          </label>
          <input
            id="startTime"
            type="time"
            step={300}
            value={values.startTime}
            onChange={(e) => {
              setStartTouched(true);
              setValues((v) => ({ ...v, startTime: e.target.value }));
            }}
            className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="endTime">
            End Time
          </label>
          <input
            id="endTime"
            type="time"
            step={300}
            value={values.endTime}
            onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))}
            className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
          />
        </div>
        {duration > 0 && (
          <div className="flex flex-col justify-end pb-3">
            <span className="text-lg font-semibold text-brand-gray">{duration.toFixed(2)} hrs</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-brand-gray">What kind of activity?</span>
        <div className="flex flex-wrap gap-2">
          {SELECTABLE_ACTIVITY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValues((v) => ({ ...v, activityType: t.value }))}
              className={`h-12 rounded-md border-2 px-4 text-lg font-semibold transition-colors ${
                values.activityType === t.value
                  ? "border-brand-red bg-brand-red text-brand-white"
                  : "border-brand-rose/50 text-brand-gray hover:border-brand-red"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="notes">
          Notes (optional): what did you work on?
        </label>
        <textarea
          id="notes"
          rows={2}
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          className="rounded-md border border-brand-rose/50 p-3 text-lg"
        />
      </div>

      {error && <p className="text-base font-medium text-brand-red">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-md bg-brand-red px-6 text-lg font-semibold text-brand-white hover:bg-brand-maroon disabled:opacity-60"
        >
          {pending ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Entry"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-md border-2 border-brand-gray px-6 text-lg font-semibold text-brand-gray hover:bg-brand-gray hover:text-brand-white"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

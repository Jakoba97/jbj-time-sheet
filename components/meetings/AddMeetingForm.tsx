"use client";

import { useActionState, useState } from "react";
import { createMeetingAction } from "@/app/meetings/actions";

type KnownUser = { id: string; fullName: string };

export function AddMeetingForm({ users }: { users: KnownUser[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(
    async (prev: { error: string | null }, formData: FormData) => {
      const result = await createMeetingAction(prev, formData);
      if (!result.error) setSelectedIds([]);
      return result;
    },
    { error: null },
  );

  const selectedUsers = selectedIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is KnownUser => !!u);
  const availableUsers = users.filter((u) => !selectedIds.includes(u.id));

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-brand-rose/40 p-4"
    >
      <h2 className="text-xl font-bold text-brand-gray">Record Meeting Minutes</h2>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="meetingDate">
            Date
          </label>
          <input
            id="meetingDate"
            name="meetingDate"
            type="date"
            required
            className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium text-brand-gray" htmlFor="durationMinutes">
            Duration (minutes)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={1440}
            required
            defaultValue={60}
            className="h-12 w-32 rounded-md border border-brand-rose/50 px-3 text-lg"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-medium text-brand-gray">Attendees</legend>
        <select
          aria-label="Add an employee"
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id) setSelectedIds((prev) => [...prev, id]);
          }}
          disabled={availableUsers.length === 0}
          className="h-12 max-w-sm rounded-md border border-brand-rose/50 px-3 text-lg"
        >
          <option value="">
            {availableUsers.length === 0 ? "All employees added" : "Add an employee..."}
          </option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
        {selectedUsers.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 rounded-full border border-brand-rose/50 py-1 pl-3 pr-1 text-lg text-brand-gray"
              >
                <input type="hidden" name="attendeeUserIds" value={u.id} />
                {u.fullName}
                <button
                  type="button"
                  aria-label={`Remove ${u.fullName}`}
                  onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== u.id))}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-brand-rose/20"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="mt-2 flex flex-col gap-1 text-base font-medium text-brand-gray">
          Other attendees (comma-separated, for people outside the system)
          <input
            name="otherAttendees"
            type="text"
            placeholder="e.g. Jordan from ACME Corp, Taylor Smith"
            className="h-12 rounded-md border border-brand-rose/50 px-3 text-lg font-normal"
          />
        </label>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium text-brand-gray" htmlFor="notes">
          What was discussed
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          required
          className="rounded-md border border-brand-rose/50 p-3 text-lg"
        />
      </div>

      {state.error && <p className="text-base font-medium text-brand-red">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 self-start rounded-md bg-brand-red px-6 text-lg font-semibold text-brand-white hover:bg-brand-maroon disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Meeting Minutes"}
      </button>
    </form>
  );
}

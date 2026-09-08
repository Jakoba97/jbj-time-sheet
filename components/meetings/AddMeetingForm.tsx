"use client";

import { useActionState } from "react";
import { createMeetingAction } from "@/app/meetings/actions";

type KnownUser = { id: string; fullName: string };

export function AddMeetingForm({ users }: { users: KnownUser[] }) {
  const [state, formAction, pending] = useActionState(createMeetingAction, { error: null });

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
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-lg text-brand-gray">
              <input type="checkbox" name="attendeeUserIds" value={u.id} className="h-5 w-5" />
              {u.fullName}
            </label>
          ))}
        </div>
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

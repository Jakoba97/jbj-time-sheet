"use client";

import { useTransition } from "react";
import { deleteMeetingAction } from "@/app/meetings/actions";

export function MeetingRow({
  id,
  meetingDate,
  durationMinutes,
  notes,
  attendeeNames,
  canDelete,
}: {
  id: string;
  meetingDate: string;
  durationMinutes: number;
  notes: string;
  attendeeNames: string[];
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-brand-rose/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-lg font-bold text-brand-gray">
            {new Date(meetingDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>{" "}
          <span className="text-base text-brand-gray">({durationMinutes} min)</span>
        </div>
        {canDelete && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => deleteMeetingAction(id))}
            className="h-9 rounded-md border-2 border-brand-red px-3 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-brand-white disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
      <p className="text-base text-brand-gray">
        <span className="font-medium">Attendees:</span> {attendeeNames.join(", ")}
      </p>
      <p className="whitespace-pre-wrap text-base text-brand-gray">{notes}</p>
    </div>
  );
}

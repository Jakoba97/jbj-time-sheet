import { AppShell } from "@/components/layout/AppShell";
import { AddMeetingForm } from "@/components/meetings/AddMeetingForm";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/db/queries/users";
import { listMeetingsWithAttendees } from "@/lib/db/queries/meetings";

export default async function MeetingsPage() {
  const [session, users, meetings] = await Promise.all([
    auth(),
    listUsers(),
    listMeetingsWithAttendees(),
  ]);
  const canDelete = session?.user.role === "admin";

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-bold text-brand-gray">Meeting Minutes</h1>
      <div className="mb-6">
        <AddMeetingForm users={users.map((u) => ({ id: u.id, fullName: u.fullName }))} />
      </div>
      <div className="flex flex-col gap-3">
        {meetings.length === 0 ? (
          <p className="text-brand-gray">No meetings recorded yet.</p>
        ) : (
          meetings.map((m) => (
            <MeetingRow
              key={m.id}
              id={m.id}
              meetingDate={m.meetingDate}
              durationMinutes={m.durationMinutes}
              notes={m.notes}
              attendeeNames={m.attendeeNames}
              canDelete={canDelete}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

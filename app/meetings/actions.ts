"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { meetingAttendees, meetingMinutes } from "@/lib/db/schema";

const createMeetingSchema = z.object({
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  notes: z.string().trim().min(1).max(4000),
  attendeeUserIds: z.array(z.string().uuid()),
  otherAttendees: z.string().max(2000).optional(),
});

export async function createMeetingAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const session = await requireUser();

  const parsed = createMeetingSchema.safeParse({
    meetingDate: formData.get("meetingDate"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes"),
    attendeeUserIds: formData.getAll("attendeeUserIds"),
    otherAttendees: formData.get("otherAttendees") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const otherNames = (parsed.data.otherAttendees ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parsed.data.attendeeUserIds.length === 0 && otherNames.length === 0) {
    return { error: "Add at least one attendee." };
  }

  await db.transaction(async (tx) => {
    const [meeting] = await tx
      .insert(meetingMinutes)
      .values({
        meetingDate: parsed.data.meetingDate,
        durationMinutes: parsed.data.durationMinutes,
        notes: parsed.data.notes,
        createdByUserId: session.user.id,
      })
      .returning();

    const attendeeRows = [
      ...parsed.data.attendeeUserIds.map((userId) => ({ meetingId: meeting.id, userId })),
      ...otherNames.map((name) => ({ meetingId: meeting.id, freeTextName: name })),
    ];
    if (attendeeRows.length > 0) {
      await tx.insert(meetingAttendees).values(attendeeRows);
    }
  });

  revalidatePath("/meetings");
  return { error: null };
}

export async function deleteMeetingAction(meetingId: string) {
  await requireAdmin();
  await db.delete(meetingMinutes).where(eq(meetingMinutes.id, meetingId));
  revalidatePath("/meetings");
}

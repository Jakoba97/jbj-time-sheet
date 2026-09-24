"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { ptoRequests, timeEntries, weeklyTimesheets } from "@/lib/db/schema";
import { getPtoRequestById } from "@/lib/db/queries/pto";
import { getProjectByName } from "@/lib/db/queries/projects";
import { addDays, formatDateISO, getWeekStart, parseDateISO } from "@/lib/utils/week";
import { hoursBetween } from "@/lib/utils/time";
import { recordAudit } from "@/lib/audit/log";

const PTO_PROJECT_NAME: Record<"pto" | "sick", string> = {
  pto: "PTO",
  sick: "Sick Time",
};

const PTO_ACTIVITY_TYPE: Record<"pto" | "sick", "pto" | "sick_time"> = {
  pto: "pto",
  sick: "sick_time",
};

const STANDARD_WORKDAY = { startTime: "09:00", endTime: "17:00" };

export async function approvePtoRequestAction(
  requestId: string,
): Promise<{ error: string | null }> {
  const session = await requireAdmin();

  const request = await getPtoRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "pending") return { error: "This request has already been reviewed." };

  const project = await getProjectByName(PTO_PROJECT_NAME[request.type]);
  if (!project) return { error: `No "${PTO_PROJECT_NAME[request.type]}" project is set up.` };

  const hours = hoursBetween(STANDARD_WORKDAY.startTime, STANDARD_WORKDAY.endTime);

  await db.transaction(async (tx) => {
    let cursor = parseDateISO(request.startDate);
    const end = parseDateISO(request.endDate);

    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateISO = formatDateISO(cursor);
        const weekStartISO = formatDateISO(getWeekStart(cursor));
        const weekEndISO = formatDateISO(addDays(getWeekStart(cursor), 4));

        let timesheet = await tx.query.weeklyTimesheets.findFirst({
          where: (t, { and, eq }) => and(eq(t.userId, request.userId), eq(t.weekStartDate, weekStartISO)),
        });
        if (!timesheet) {
          const [created] = await tx
            .insert(weeklyTimesheets)
            .values({ userId: request.userId, weekStartDate: weekStartISO, weekEndDate: weekEndISO })
            .onConflictDoNothing({ target: [weeklyTimesheets.userId, weeklyTimesheets.weekStartDate] })
            .returning();
          timesheet =
            created ??
            (await tx.query.weeklyTimesheets.findFirst({
              where: (t, { and, eq }) =>
                and(eq(t.userId, request.userId), eq(t.weekStartDate, weekStartISO)),
            }));
        }
        if (!timesheet) throw new Error("Failed to create or find weekly timesheet");

        const existing = await tx.query.timeEntries.findFirst({
          where: (t, { and, eq }) =>
            and(
              eq(t.weeklyTimesheetId, timesheet.id),
              eq(t.projectId, project.id),
              eq(t.entryDate, dateISO),
            ),
        });

        if (!existing) {
          await tx.insert(timeEntries).values({
            weeklyTimesheetId: timesheet.id,
            projectId: project.id,
            entryDate: dateISO,
            startTime: STANDARD_WORKDAY.startTime,
            endTime: STANDARD_WORKDAY.endTime,
            activityType: PTO_ACTIVITY_TYPE[request.type],
            hours: hours.toFixed(2),
          });
        }
      }
      cursor = addDays(cursor, 1);
    }

    await tx
      .update(ptoRequests)
      .set({ status: "approved", reviewedByUserId: session.user.id, reviewedAt: new Date() })
      .where(eq(ptoRequests.id, requestId));

    await recordAudit(
      {
        actorUserId: session.user.id,
        entityType: "pto_request",
        entityId: requestId,
        action: "approve",
        targetUserId: request.userId,
        before: { status: "pending" },
        after: { status: "approved" },
      },
      tx,
    );
  });

  revalidatePath("/admin/pto");
  revalidatePath("/pto");
  revalidatePath("/admin/timesheets");
  revalidatePath("/dashboard");
  revalidatePath("/timesheets");
  return { error: null };
}

export async function denyPtoRequestAction(requestId: string): Promise<{ error: string | null }> {
  const session = await requireAdmin();

  const request = await getPtoRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "pending") return { error: "This request has already been reviewed." };

  await db
    .update(ptoRequests)
    .set({ status: "denied", reviewedByUserId: session.user.id, reviewedAt: new Date() })
    .where(eq(ptoRequests.id, requestId));

  await recordAudit({
    actorUserId: session.user.id,
    entityType: "pto_request",
    entityId: requestId,
    action: "deny",
    targetUserId: request.userId,
    before: { status: "pending" },
    after: { status: "denied" },
  });

  revalidatePath("/admin/pto");
  revalidatePath("/pto");
  return { error: null };
}

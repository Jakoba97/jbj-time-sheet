import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTimesheetById } from "@/lib/db/queries/timesheets";
import { buildTimesheetData } from "@/lib/pdf/buildTimesheetData";
import { exportWeeklyTimesheet } from "@/lib/excel/exportWeeklyTimesheet";
import { buildExportFilename } from "@/lib/pdf/filename";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const timesheet = await getTimesheetById(id);
  if (!timesheet) return new NextResponse("Not found", { status: 404 });

  const isOwner = timesheet.userId === session.user.id;
  if (!isOwner && session.user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const data = await buildTimesheetData(id);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const buffer = await exportWeeklyTimesheet(data);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${buildExportFilename(data.employeeName, "Weekly_Timesheet", data.weekStartDate, "xlsx")}"`,
    },
  });
}

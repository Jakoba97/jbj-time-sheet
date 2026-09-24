import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getTimesheetById } from "@/lib/db/queries/timesheets";
import { buildTimesheetData } from "@/lib/pdf/buildTimesheetData";
import { WeeklySummaryDocument } from "@/lib/pdf/WeeklySummaryDocument";
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

  const buffer = await renderToBuffer(<WeeklySummaryDocument data={data} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildExportFilename(data.employeeName, "Weekly_Summary", data.weekStartDate, "pdf")}"`,
    },
  });
}

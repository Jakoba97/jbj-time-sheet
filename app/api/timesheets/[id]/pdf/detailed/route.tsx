import { NextResponse } from "next/server";
import JSZip from "jszip";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getTimesheetById } from "@/lib/db/queries/timesheets";
import { buildTimesheetData } from "@/lib/pdf/buildTimesheetData";
import { WeeklyTimesheetDocument } from "@/lib/pdf/WeeklyTimesheetDocument";
import { buildExportFilename } from "@/lib/pdf/filename";
import { splitTimesheetDataByMonth, weekSpansTwoMonths } from "@/lib/pdf/splitByMonth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { searchParams } = new URL(req.url);
  const shouldSplit = searchParams.get("split") === "true" && weekSpansTwoMonths(data.weekDates);

  if (!shouldSplit) {
    const buffer = await renderToBuffer(<WeeklyTimesheetDocument data={data} />);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildExportFilename(data.employeeName, "Weekly_Timesheet", data.weekStartDate, "pdf")}"`,
      },
    });
  }

  // Two separate direct downloads triggered client-side is unreliable: browsers commonly drop
  // one of two automatic downloads fired from the same click, even when both server responses
  // succeed (confirmed while building this — both requests returned 200, but only one file
  // actually saved). A single zip download avoids that entirely.
  const zip = new JSZip();
  for (const segment of splitTimesheetDataByMonth(data)) {
    const buffer = await renderToBuffer(<WeeklyTimesheetDocument data={segment} />);
    zip.file(buildExportFilename(segment.employeeName, "Weekly_Timesheet", segment.weekStartDate, "pdf"), buffer);
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${buildExportFilename(data.employeeName, "Weekly_Timesheet_Split", data.weekStartDate, "zip")}"`,
    },
  });
}

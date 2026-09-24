import { NextResponse } from "next/server";
import JSZip from "jszip";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { listTimesheetsForWeek } from "@/lib/db/queries/timesheets";
import { buildTimesheetData } from "@/lib/pdf/buildTimesheetData";
import { WeeklyTimesheetDocument } from "@/lib/pdf/WeeklyTimesheetDocument";
import { exportWeeklyTimesheet } from "@/lib/excel/exportWeeklyTimesheet";
import { buildExportFilename } from "@/lib/pdf/filename";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const kindParam = searchParams.get("kind");
  const kind = kindParam === "excel" ? kindParam : "pdf";
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return new NextResponse("Missing or invalid weekStart", { status: 400 });
  }

  const timesheets = await listTimesheetsForWeek(weekStart);
  if (timesheets.length === 0) {
    return new NextResponse("No timesheets found for that week", { status: 404 });
  }

  const zip = new JSZip();
  for (const ts of timesheets) {
    const data = await buildTimesheetData(ts.id);
    if (!data) continue;
    if (kind === "excel") {
      const buffer = await exportWeeklyTimesheet(data);
      zip.file(buildExportFilename(data.employeeName, "Weekly_Timesheet", data.weekStartDate, "xlsx"), buffer);
    } else {
      const buffer = await renderToBuffer(<WeeklyTimesheetDocument data={data} />);
      zip.file(buildExportFilename(data.employeeName, "Weekly_Timesheet", data.weekStartDate, "pdf"), buffer);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipDatePart = weekStart.replaceAll("-", "_");

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipDatePart}_JBJ_Timesheets.zip"`,
    },
  });
}

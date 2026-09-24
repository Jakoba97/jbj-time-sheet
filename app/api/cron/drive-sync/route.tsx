import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { listTimesheetsForWeek } from "@/lib/db/queries/timesheets";
import { buildTimesheetData } from "@/lib/pdf/buildTimesheetData";
import { WeeklyTimesheetDocument } from "@/lib/pdf/WeeklyTimesheetDocument";
import { buildExportFilename } from "@/lib/pdf/filename";
import { findFolderIdByName, uploadFileToFolder } from "@/lib/google/drive";
import { formatDateISO, getWeekStart } from "@/lib/utils/week";

type SyncResult = { employeeName: string; status: "uploaded" | "folder_not_found" | "error" };

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_TIMESHEETS_FOLDER_ID;
  if (!rootFolderId) {
    return new NextResponse("GOOGLE_DRIVE_TIMESHEETS_FOLDER_ID is not configured", { status: 500 });
  }

  const weekStartISO = formatDateISO(getWeekStart());
  const timesheets = await listTimesheetsForWeek(weekStartISO);

  const results: SyncResult[] = [];
  for (const ts of timesheets) {
    try {
      const data = await buildTimesheetData(ts.id);
      if (!data || data.activityEntries.length === 0) continue;

      const folderId = await findFolderIdByName(rootFolderId, data.employeeName);
      if (!folderId) {
        results.push({ employeeName: data.employeeName, status: "folder_not_found" });
        continue;
      }

      const buffer = await renderToBuffer(<WeeklyTimesheetDocument data={data} />);
      const filename = buildExportFilename(data.employeeName, "Weekly_Timesheet", data.weekStartDate, "pdf");
      await uploadFileToFolder(folderId, filename, buffer, "application/pdf");
      results.push({ employeeName: data.employeeName, status: "uploaded" });
    } catch (err) {
      results.push({ employeeName: ts.employeeName, status: "error" });
      console.error("Drive sync failed for", ts.employeeName, err);
    }
  }

  return NextResponse.json({ ok: true, weekStart: weekStartISO, results });
}

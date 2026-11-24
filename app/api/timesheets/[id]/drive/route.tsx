import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { getTimesheetById } from "@/lib/db/queries/timesheets";
import { buildTimesheetData } from "@/lib/pdf/buildTimesheetData";
import { WeeklyTimesheetDocument } from "@/lib/pdf/WeeklyTimesheetDocument";
import { buildExportFilename } from "@/lib/pdf/filename";
import { findFolderIdByName, uploadFileToFolder } from "@/lib/google/drive";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const timesheet = await getTimesheetById(id);
  if (!timesheet) return NextResponse.json({ error: "Timesheet not found." }, { status: 404 });

  const isOwner = timesheet.userId === session.user.id;
  if (!isOwner && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await buildTimesheetData(id);
  if (!data) return NextResponse.json({ error: "Timesheet not found." }, { status: 404 });

  // Uploads replace same-named files, so an empty timesheet would overwrite a good copy with a
  // blank one.
  if (data.activityEntries.length === 0) {
    return NextResponse.json(
      { error: "This timesheet has no time entries to export." },
      { status: 422 },
    );
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_TIMESHEETS_FOLDER_ID;
  if (!rootFolderId) {
    console.error("Drive export failed: GOOGLE_DRIVE_TIMESHEETS_FOLDER_ID is not configured");
    return NextResponse.json({ error: "Drive export is not configured." }, { status: 500 });
  }

  try {
    const folderId = await findFolderIdByName(rootFolderId, data.employeeName);
    if (!folderId) {
      // Drive omits folders the service account can't see, so a missing folder and a missing
      // permission look identical here.
      return NextResponse.json(
        {
          error: `No Drive folder named "${data.employeeName}" was found, or the app doesn't have access to it.`,
        },
        { status: 404 },
      );
    }

    const filename = buildExportFilename(data.employeeName, "Weekly_Timesheet", data.weekStartDate, "pdf");
    const buffer = await renderToBuffer(<WeeklyTimesheetDocument data={data} />);
    await uploadFileToFolder(folderId, filename, buffer, "application/pdf");

    return NextResponse.json({ folderName: data.employeeName, filename });
  } catch (err) {
    console.error("Drive export failed for", data.employeeName, err);
    return NextResponse.json({ error: "Upload to Drive failed. Please try again." }, { status: 502 });
  }
}

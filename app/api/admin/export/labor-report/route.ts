import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/lib/db/queries/projects";
import { listLaborReportData } from "@/lib/db/queries/timesheets";
import { buildLaborBackupReport } from "@/lib/excel/buildLaborBackupReport";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const monthParam = searchParams.get("month"); // "YYYY-MM"
  const taskOrder = searchParams.get("taskOrder") ?? "";

  if (!projectId || !monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return new NextResponse("Missing or invalid projectId/month", { status: 400 });
  }

  const project = await getProjectById(projectId);
  if (!project) return new NextResponse("Project not found", { status: 404 });

  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const monthStartISO = `${monthParam}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEndISO = `${monthParam}-${String(lastDay).padStart(2, "0")}`;

  const employees = await listLaborReportData(projectId, monthStartISO, monthEndISO);
  if (employees.length === 0) {
    return new NextResponse("No hours logged against that project for that month", {
      status: 404,
    });
  }

  const buffer = await buildLaborBackupReport({
    projectName: project.name,
    taskOrder: taskOrder || "Task Order",
    year,
    month,
    employees,
  });

  const filenameSafeProject = project.name.replace(/[^a-zA-Z0-9]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${monthParam}_${filenameSafeProject}_Labor_Report.xlsx"`,
    },
  });
}

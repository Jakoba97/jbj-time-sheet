"use server";

import ExcelJS from "exceljs";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { timeEntries } from "@/lib/db/schema";
import { listUsers } from "@/lib/db/queries/users";
import { listActiveProjects } from "@/lib/db/queries/projects";
import { getOrCreateWeeklyTimesheet } from "@/lib/db/queries/timesheets";
import { parseLegacyTimesheet, type ParsedTimesheet } from "@/lib/excel/importLegacyTimesheet";

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMPORT_EXTENSIONS = [".xlsx", ".xlsm"];

function emptyParsedTimesheet(fileName: string, warning: string): ParsedTimesheet {
  return {
    sourceFileName: fileName,
    detectedEmployeeName: null,
    matchedUserId: null,
    weekStartDate: null,
    weekEndDate: null,
    checkDate: null,
    weekDates: [],
    rows: [],
    warnings: [warning],
  };
}

export async function parseImportFilesAction(formData: FormData): Promise<ParsedTimesheet[]> {
  await requireAdmin();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const [users, projects] = await Promise.all([listUsers(), listActiveProjects()]);

  const results: ParsedTimesheet[] = [];
  for (const file of files) {
    const hasAllowedExtension = ALLOWED_IMPORT_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!hasAllowedExtension) {
      results.push(emptyParsedTimesheet(file.name, "Only .xlsx or .xlsm files are supported."));
      continue;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      results.push(emptyParsedTimesheet(file.name, "File is too large (10 MB limit)."));
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs's nested @fast-csv
      // dependency ships a conflicting @types/node, causing a structural Buffer type mismatch.
      await workbook.xlsx.load(buffer as any);
      results.push(parseLegacyTimesheet(workbook, file.name, users, projects));
    } catch {
      results.push(emptyParsedTimesheet(file.name, "Could not read this file as an Excel workbook."));
    }
  }
  return results;
}

const commitSchema = z.object({
  userId: z.string().uuid(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(
    z.object({
      matchedProjectId: z.string().uuid().nullable(),
      hoursByDate: z.record(z.string(), z.number()),
    }),
  ),
});

export async function commitImportAction(
  input: unknown,
): Promise<{ error: string | null; imported: number }> {
  await requireAdmin();

  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid import data.", imported: 0 };
  const { userId, weekStartDate, rows } = parsed.data;

  const timesheet = await getOrCreateWeeklyTimesheet(userId, weekStartDate);

  const newRows = rows.flatMap((row) =>
    row.matchedProjectId
      ? Object.entries(row.hoursByDate)
          .filter(([, hours]) => hours > 0)
          .map(([date, hours]) => ({
            weeklyTimesheetId: timesheet.id,
            projectId: row.matchedProjectId as string,
            entryDate: date,
            hours: hours.toFixed(2),
          }))
      : [],
  );

  await db.transaction(async (tx) => {
    // Legacy-imported rows are the only ones with a null activityType (see schema comment) — clearing
    // them first, scoped to this one timesheet, makes re-importing the same file idempotent without
    // touching any manually-entered entry.
    await tx
      .delete(timeEntries)
      .where(and(eq(timeEntries.weeklyTimesheetId, timesheet.id), isNull(timeEntries.activityType)));

    if (newRows.length > 0) {
      await tx.insert(timeEntries).values(newRows);
    }
  });
  const imported = newRows.length;

  revalidatePath("/admin/timesheets");
  revalidatePath(`/admin/timesheets/${timesheet.id}`);
  return { error: null, imported };
}

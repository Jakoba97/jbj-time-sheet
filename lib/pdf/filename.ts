function sanitize(part: string): string {
  return part.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** ISO "YYYY-MM-DD" -> "YYYY_MM_DD". */
function formatDateYMD(dateISO: string): string {
  const [year, month, day] = dateISO.split("-");
  return `${year}_${month}_${day}`;
}

/** Builds a download filename, e.g. buildExportFilename("Sample Employee", "Weekly_Timesheet", "2026-08-10", "pdf") -> "2026_08_10_Sample_Employee_JBJ_Weekly_Timesheet.pdf" */
export function buildExportFilename(
  employeeName: string,
  kind: string,
  weekStartDate: string,
  ext: string,
): string {
  const datePart = formatDateYMD(weekStartDate);
  return `${datePart}_${sanitize(employeeName)}_JBJ_${sanitize(kind)}.${ext}`;
}

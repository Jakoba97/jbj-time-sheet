import ExcelJS from "exceljs";
import type { LaborReportEmployee } from "@/lib/db/queries/timesheets";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const ARGB = { maroon: "FF6D0712", white: "FFFFFFFF" };

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "XX";
}

function uniqueSheetName(base: string, used: Set<string>): string {
  // Excel sheet names cap at 31 chars and forbid : \ / ? * [ ]
  const cleaned = base.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
  let name = cleaned;
  let suffix = 2;
  while (used.has(name)) {
    const tail = ` (${suffix})`;
    name = cleaned.slice(0, 31 - tail.length) + tail;
    suffix += 1;
  }
  used.add(name);
  return name;
}

export async function buildLaborBackupReport({
  projectName,
  taskOrder,
  year,
  month,
  employees,
}: {
  projectName: string;
  taskOrder: string;
  year: number;
  month: number; // 1-12
  employees: LaborReportEmployee[];
}): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JBJ Time Sheet";

  const lastDay = new Date(year, month, 0).getDate();
  const monthRangeText = `${MONTH_NAMES[month - 1]} 1-${lastDay}, ${year}`;
  const shortYear = String(year).slice(-2);
  const usedSheetNames = new Set<string>();

  for (const employee of employees) {
    const sheetName = uniqueSheetName(
      `${initialsFor(employee.fullName)} - ${MONTH_ABBR[month - 1]} ${shortYear} Labor Report`,
      usedSheetNames,
    );
    const sheet = workbook.addWorksheet(sheetName);

    sheet.getColumn(1).width = 14;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 30;

    sheet.getCell("A1").value = "Labor Backup Report";
    sheet.getCell("A1").font = { bold: true, size: 14 };

    sheet.getCell("A2").value = monthRangeText;

    sheet.getCell("A4").value = taskOrder;
    sheet.getCell("A4").font = { bold: true };
    sheet.getCell("A5").value = projectName;

    const headerRow = sheet.getRow(7);
    headerRow.getCell(1).value = "Date";
    headerRow.getCell(2).value = employee.title || "Employee";
    headerRow.getCell(3).value = "Total Hours";
    headerRow.getCell(4).value = "Notes";
    for (let c = 1; c <= 4; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { bold: true, color: { argb: ARGB.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.maroon } };
    }

    const dayByDate = new Map(employee.days.map((d) => [d.date, d]));
    let rowNum = 8;
    for (let d = 1; d <= lastDay; d++) {
      const dateISO = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const day = dayByDate.get(dateISO);
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = new Date(`${dateISO}T00:00:00.000Z`);
      row.getCell(1).numFmt = "m/d/yyyy";
      row.getCell(2).value = employee.fullName;
      if (day) {
        row.getCell(3).value = day.hours;
        if (day.notes) row.getCell(4).value = day.notes;
      }
      rowNum += 1;
    }

    const totalRowNum = rowNum + 1;
    sheet.getCell(totalRowNum, 2).value = "TOTAL";
    sheet.getCell(totalRowNum, 2).font = { bold: true };
    sheet.getCell(totalRowNum, 3).value = { formula: `SUM(C8:C${rowNum - 1})` };
    sheet.getCell(totalRowNum, 3).font = { bold: true };
  }

  return workbook.xlsx.writeBuffer();
}

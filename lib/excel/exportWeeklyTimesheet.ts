import ExcelJS from "exceljs";
import { BRAND_COLORS, SHEET_TITLE } from "@/lib/constants/brand";
import { computeTotals } from "@/lib/utils/totals";
import { buildActivityDetailSheet } from "@/lib/excel/buildActivityDetailSheet";
import { filterVisibleProjects } from "@/lib/pdf/visibleProjects";
import type { PdfTimesheetData } from "@/lib/pdf/types";

const ARGB = {
  maroon: "FF6D0712",
  rose: "FFD68182",
  roseLight: "FFF3E1E1",
  white: "FFFFFFFF",
  gray: "FF3D4041",
};

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD68182" } };
  return { top: side, bottom: side, left: side, right: side };
}

export async function exportWeeklyTimesheet(data: PdfTimesheetData): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JBJ Time Sheet";
  const sheet = workbook.addWorksheet("Time Sheet", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  const allEntries = data.projects.flatMap((p) =>
    data.weekDates.map((wd) => ({
      projectId: p.id,
      entryDate: wd.date,
      hours: data.hours[p.id]?.[wd.date] ?? 0,
    })),
  );
  const totals = computeTotals(allEntries);
  const visibleProjects = filterVisibleProjects(data.projects, totals.projectTotals);

  const taskCol = (i: number) => 3 + i; // column C onward = task 1..N
  const totalCol = 3 + visibleProjects.length;
  const lastCol = totalCol;

  sheet.getColumn(1).width = 12; // Date
  sheet.getColumn(2).width = 12; // Day of Week
  for (let i = 0; i < visibleProjects.length; i++) sheet.getColumn(taskCol(i)).width = 9;
  sheet.getColumn(totalCol).width = 10;

  // Title
  sheet.mergeCells(1, 1, 1, lastCol);
  const title = sheet.getCell(1, 1);
  title.value = SHEET_TITLE.toUpperCase();
  title.font = { bold: true, size: 16, color: { argb: ARGB.white } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.maroon } };
  sheet.getRow(1).height = 24;

  // Employee / week info
  sheet.getCell(2, 1).value = "Employee Name:";
  sheet.getCell(2, 1).font = { bold: true };
  sheet.mergeCells(2, 2, 2, 4);
  sheet.getCell(2, 2).value = data.employeeName;

  sheet.getCell(3, 1).value = "Week Starting:";
  sheet.getCell(3, 1).font = { bold: true };
  sheet.getCell(3, 2).value = data.weekStartDate;

  sheet.getCell(4, 1).value = "Week Ending:";
  sheet.getCell(4, 1).font = { bold: true };
  sheet.getCell(4, 2).value = data.weekEndDate;

  // Grid header
  const headerRowNum = 6;
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.getCell(1).value = "Date";
  headerRow.getCell(2).value = "Day of Week";
  visibleProjects.forEach((_, i) => {
    headerRow.getCell(taskCol(i)).value = i + 1;
  });
  headerRow.getCell(totalCol).value = "Total";
  for (let c = 1; c <= lastCol; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: ARGB.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.maroon } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  }

  // Data rows: one per weekday
  data.weekDates.forEach((wd, i) => {
    const rowNum = headerRowNum + 1 + i;
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = wd.date;
    row.getCell(2).value = wd.label;
    let rowTotal = 0;
    visibleProjects.forEach((p, pi) => {
      const value = data.hours[p.id]?.[wd.date] ?? 0;
      rowTotal += value;
      row.getCell(taskCol(pi)).value = value > 0 ? value : null;
    });
    row.getCell(totalCol).value = rowTotal;
    for (let c = 1; c <= lastCol; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder();
      cell.alignment = { horizontal: c <= 2 ? "left" : "center" };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.roseLight } };
    }
  });

  // Totals row
  const totalsRowNum = headerRowNum + 1 + data.weekDates.length;
  const totalsRow = sheet.getRow(totalsRowNum);
  totalsRow.getCell(1).value = "TOTALS";
  sheet.mergeCells(totalsRowNum, 1, totalsRowNum, 2);
  visibleProjects.forEach((p, pi) => {
    totalsRow.getCell(taskCol(pi)).value = totals.projectTotals[p.id] ?? 0;
  });
  totalsRow.getCell(totalCol).value = totals.weekTotal;
  for (let c = 1; c <= lastCol; c++) {
    const cell = totalsRow.getCell(c);
    cell.font = { bold: true };
    cell.border = thinBorder();
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.rose } };
    cell.alignment = { horizontal: "center" };
  }

  // Task legend, to the right of the grid
  const legendStartCol = lastCol + 2;
  sheet.mergeCells(headerRowNum, legendStartCol, headerRowNum, legendStartCol + 1);
  const legendHeader = sheet.getCell(headerRowNum, legendStartCol);
  legendHeader.value = "TASKS";
  legendHeader.font = { bold: true, color: { argb: ARGB.white } };
  legendHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.maroon } };
  legendHeader.alignment = { horizontal: "center" };
  sheet.getColumn(legendStartCol).width = 4;
  sheet.getColumn(legendStartCol + 1).width = 24;

  visibleProjects.forEach((p, i) => {
    const rowNum = headerRowNum + 1 + i;
    sheet.getCell(rowNum, legendStartCol).value = i + 1;
    sheet.getCell(rowNum, legendStartCol + 1).value = p.name;
    sheet.getCell(rowNum, legendStartCol).alignment = { horizontal: "center" };
  });

  // Weekly Activity notes
  const notesRowNum = totalsRowNum + 2;
  sheet.getCell(notesRowNum, 1).value = "Weekly Activity";
  sheet.getCell(notesRowNum, 1).font = { bold: true };
  sheet.mergeCells(notesRowNum + 1, 1, notesRowNum + 3, Math.min(6, lastCol));
  const notesCell = sheet.getCell(notesRowNum + 1, 1);
  notesCell.value = data.weeklyActivityNotes ?? "";
  notesCell.alignment = { wrapText: true, vertical: "top" };
  notesCell.border = thinBorder();

  // Signatures — left blank intentionally; this sheet is meant to be printed and signed by hand.
  const sigRowNum = notesRowNum + 5;
  sheet.getCell(sigRowNum, 1).value = "Employee Signature:";
  sheet.getCell(sigRowNum, 1).font = { bold: true };

  sheet.getCell(sigRowNum + 1, 1).value = "Approval:";
  sheet.getCell(sigRowNum + 1, 1).font = { bold: true };

  buildActivityDetailSheet(workbook, data);

  return workbook.xlsx.writeBuffer();
}

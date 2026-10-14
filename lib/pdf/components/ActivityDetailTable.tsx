import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { activityTypeLabel } from "@/lib/constants/activityTypes";
import { parseDateISO } from "@/lib/utils/week";
import type { PdfTimesheetData } from "@/lib/pdf/types";

const styles = StyleSheet.create({
  heading: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    color: BRAND_COLORS.gray,
  },
  table: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.rose,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: BRAND_COLORS.maroon,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.rose,
  },
  headerCell: { color: BRAND_COLORS.white, fontSize: 8, fontWeight: 700, padding: 4 },
  cell: { fontSize: 8, padding: 4, color: BRAND_COLORS.gray },
  dateCol: { width: "12%" },
  hoursCol: { width: "10%" },
  projectCol: { width: "22%" },
  typeCol: { width: "16%" },
  notesCol: { width: "40%" },
});

function formatDateShort(iso: string) {
  return parseDateISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityDetailTable({ data }: { data: PdfTimesheetData }) {
  if (data.activityEntries.length === 0) return null;

  return (
    <View>
      <Text style={styles.heading}>Activity Detail</Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.projectCol]}>Project</Text>
          <Text style={[styles.headerCell, styles.dateCol]}>Date</Text>
          <Text style={[styles.headerCell, styles.hoursCol]}>Hours</Text>
          <Text style={[styles.headerCell, styles.typeCol]}>Type</Text>
          <Text style={[styles.headerCell, styles.notesCol]}>Notes</Text>
        </View>
        {data.activityEntries.map((entry, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.cell, styles.projectCol]}>{entry.projectName}</Text>
            <Text style={[styles.cell, styles.dateCol]}>{formatDateShort(entry.entryDate)}</Text>
            <Text style={[styles.cell, styles.hoursCol]}>{entry.hours.toFixed(2)}</Text>
            <Text style={[styles.cell, styles.typeCol]}>{activityTypeLabel(entry.activityType)}</Text>
            <Text style={[styles.cell, styles.notesCol]}>{entry.notes ?? ""}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

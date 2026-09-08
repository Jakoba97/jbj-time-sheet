import path from "node:path";
import fs from "node:fs";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { BRAND_COLORS, SHEET_TITLE } from "@/lib/constants/brand";
import { formatWeekRange } from "@/lib/utils/week";
import type { PdfTimesheetData } from "@/lib/pdf/types";

// @react-pdf/renderer's Image resolves a plain path string via fetch(), which can't read the
// local filesystem and fails silently (logo just doesn't render). Reading the file into a
// buffer ourselves sidesteps that path entirely.
const LOGO_PATH = path.join(process.cwd(), "public/logo/jbj-management-logo.jpeg");
const LOGO_BUFFER = fs.readFileSync(LOGO_PATH);

const styles = StyleSheet.create({
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: BRAND_COLORS.maroon,
    padding: 12,
    marginBottom: 12,
  },
  logoBadge: {
    backgroundColor: BRAND_COLORS.white,
    borderRadius: 6,
    padding: 4,
  },
  logo: {
    width: 42,
    height: 42,
  },
  // Matches the logo badge's outer width (42 logo + 4 padding on each side) so the title stays
  // visually centered in the bar even though the logo only sits on the right.
  logoSpacer: {
    width: 50,
  },
  titleTextBlock: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: BRAND_COLORS.white,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 10,
    color: BRAND_COLORS.gray,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 700,
  },
});

export function PDFHeader({ data, subtitle }: { data: PdfTimesheetData; subtitle: string }) {
  return (
    <View>
      <View style={styles.titleBar}>
        <View style={styles.logoSpacer} />
        <View style={styles.titleTextBlock}>
          <Text style={styles.title}>{SHEET_TITLE}</Text>
          <Text style={{ fontSize: 11, textAlign: "center", marginTop: 2, color: BRAND_COLORS.white }}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.logoBadge}>
          <Image src={LOGO_BUFFER} style={styles.logo} />
        </View>
      </View>
      <View style={styles.infoRow}>
        <View>
          <Text style={styles.infoLabel}>Employee Name</Text>
          <Text style={styles.infoValue}>{data.employeeName}</Text>
        </View>
        <View>
          <Text style={styles.infoLabel}>Week</Text>
          <Text style={styles.infoValue}>
            {formatWeekRange(data.weekStartDate, data.weekEndDate)}
          </Text>
        </View>
      </View>
    </View>
  );
}

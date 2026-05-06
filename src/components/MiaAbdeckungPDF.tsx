"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  Kanton,
  MiaBereich,
  MiaCoverageResult,
  MiaCoverageStats,
  Stufe,
} from "@/types";

const colors = {
  primary: "#3b82f6",
  textPrimary: "#1f2937",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
  white: "#ffffff",
  covered: "#10b981",
  uncovered: "#9ca3af",
  coveredBg: "#ecfdf5",
  uncoveredBg: "#f3f4f6",
};

const BEREICH_LABELS: Record<MiaBereich, string> = {
  medien: "Medien",
  informatik: "Informatik",
  anwendungskompetenzen: "Anwendungskompetenzen",
};

const BEREICH_COLORS: Record<MiaBereich, string> = {
  medien: "#6366F1",
  informatik: "#0891B2",
  anwendungskompetenzen: "#F59E0B",
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.textPrimary,
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerMeta: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  statLabel: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  statSub: {
    fontSize: 7,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bereichSection: {
    marginBottom: 14,
  },
  bereichHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: "#f3f4f6",
    marginBottom: 6,
  },
  bereichDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bereichTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  bereichBadge: {
    marginLeft: "auto",
    fontSize: 8,
    color: colors.textSecondary,
  },
  competencyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 3,
    borderWidth: 1,
    borderRadius: 3,
  },
  competencyRowCovered: {
    borderColor: "#a7f3d0",
    backgroundColor: colors.coveredBg,
  },
  competencyRowUncovered: {
    borderColor: colors.border,
    backgroundColor: colors.uncoveredBg,
  },
  statusIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  competencyMain: {
    flex: 1,
  },
  competencyHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  competencyCode: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  competencyName: {
    fontSize: 9,
  },
  competencySub: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  einheitenList: {
    marginTop: 3,
  },
  einheitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  einheitDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: colors.textSecondary,
  },
});

export interface MiaAbdeckungPDFProps {
  schuljahr: string;
  lehrerName?: string;
  klasse?: string;
  kanton?: Kanton;
  stufeFilter?: Stufe | "all";
  stats: MiaCoverageStats;
  results: MiaCoverageResult[];
}

export default function MiaAbdeckungPDF({
  schuljahr,
  lehrerName,
  klasse,
  kanton,
  stufeFilter,
  stats,
  results,
}: MiaAbdeckungPDFProps) {
  const dateStr = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const coverageRate =
    stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;

  const grouped: Record<MiaBereich, MiaCoverageResult[]> = {
    medien: [],
    informatik: [],
    anwendungskompetenzen: [],
  };
  results.forEach((r) => grouped[r.bereich].push(r));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MIA-Abdeckung</Text>
          <Text style={styles.headerSubtitle}>
            Schuljahr {schuljahr}
            {lehrerName ? ` · ${lehrerName}` : ""}
            {klasse ? ` · ${klasse}` : ""}
            {stufeFilter && stufeFilter !== "all" ? ` · Stufe ${stufeFilter}` : ""}
            {kanton ? ` · Kanton ${kanton}` : ""}
          </Text>
          <Text style={styles.headerMeta}>
            Erstellt am {dateStr} · MIA-App Jahresplanung
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Gesamt-Abdeckung</Text>
            <Text style={styles.statValue}>{coverageRate}%</Text>
            <Text style={styles.statSub}>
              {stats.covered} von {stats.total} Kompetenzstufen
            </Text>
          </View>
          {(
            ["medien", "informatik", "anwendungskompetenzen"] as MiaBereich[]
          ).map((b) => {
            const data = stats.byBereich[b];
            const pct =
              data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0;
            return (
              <View key={b} style={styles.statBox}>
                <Text style={styles.statLabel}>{BEREICH_LABELS[b]}</Text>
                <Text style={styles.statValue}>{pct}%</Text>
                <Text style={styles.statSub}>
                  {data.covered} von {data.total} abgedeckt
                </Text>
              </View>
            );
          })}
        </View>

        {/* Bereiche */}
        {(["medien", "informatik", "anwendungskompetenzen"] as MiaBereich[]).map(
          (bereich) => {
            const list = grouped[bereich];
            if (list.length === 0) return null;
            const data = stats.byBereich[bereich];
            return (
              <View key={bereich} style={styles.bereichSection} wrap={false}>
                <View style={styles.bereichHeader}>
                  <View
                    style={[
                      styles.bereichDot,
                      { backgroundColor: BEREICH_COLORS[bereich] },
                    ]}
                  />
                  <Text style={styles.bereichTitle}>
                    {BEREICH_LABELS[bereich]}
                  </Text>
                  <Text style={styles.bereichBadge}>
                    {data.covered}/{data.total} abgedeckt
                  </Text>
                </View>

                {list.map((r) => (
                  <View
                    key={r.canonicalCode}
                    style={[
                      styles.competencyRow,
                      r.isCovered
                        ? styles.competencyRowCovered
                        : styles.competencyRowUncovered,
                    ]}
                    wrap={false}
                  >
                    <View
                      style={[
                        styles.statusIcon,
                        {
                          backgroundColor: r.isCovered
                            ? colors.covered
                            : colors.uncovered,
                        },
                      ]}
                    />
                    <View style={styles.competencyMain}>
                      <View style={styles.competencyHeaderLine}>
                        <Text style={styles.competencyCode}>
                          {r.displayCode}
                        </Text>
                        <Text style={styles.competencyName}>
                          {r.competencyName}
                        </Text>
                      </View>
                      {r.kompetenzbereich && (
                        <Text style={styles.competencySub}>
                          {r.kompetenzbereich}
                        </Text>
                      )}
                      {r.coveringEinheiten.length > 0 && (
                        <View style={styles.einheitenList}>
                          {r.coveringEinheiten.map((e) => (
                            <View key={e.einheitId} style={styles.einheitRow}>
                              <View
                                style={[
                                  styles.einheitDot,
                                  {
                                    backgroundColor:
                                      e.fachbereichFarbe || "#6b7280",
                                  },
                                ]}
                              />
                              <Text>
                                {e.fachbereichName || e.fachbereichId} · KW{" "}
                                {e.zeitraumStart}
                                {e.zeitraumStart !== e.zeitraumEnde
                                  ? `–${e.zeitraumEnde}`
                                  : ""}
                                {" · "}
                                {e.titel}
                                {e.linkedViaMiaTheme ? "  (via MIA-Thema)" : ""}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          }
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Seite ${pageNumber} von ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

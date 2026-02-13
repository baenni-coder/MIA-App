"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { JahresplanEinheit, JahresplanStatus, BeurteilungsTyp, Beurteilung } from "@/types";

// Farben
const colors = {
  primary: "#3b82f6",
  textPrimary: "#1f2937",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
  white: "#ffffff",
  ferien: "#f3f4f6",
  ferienText: "#9ca3af",
  statusGeplant: "#dbeafe",
  statusGeplantText: "#1e40af",
  statusDurchgefuehrt: "#fef3c7",
  statusDurchgefuehrtText: "#92400e",
  statusReflektiert: "#d1fae5",
  statusReflektiertText: "#065f46",
  beurteilungFormativ: "#3b82f6",
  beurteilungSummativ: "#f97316",
};

const STATUS_LABELS: Record<JahresplanStatus, string> = {
  geplant: "Geplant",
  durchgefuehrt: "Durchgeführt",
  reflektiert: "Reflektiert",
};

const BEURTEILUNG_LABELS: Record<BeurteilungsTyp, string> = {
  keine: "",
  formativ: "Formativ",
  summativ: "Summativ",
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.textPrimary,
  },
  // Header
  header: {
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  headerMeta: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 6,
  },
  // Quartal section
  quartalHeader: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Week row
  weekRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    minHeight: 22,
    alignItems: "stretch",
  },
  weekRowFerien: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    minHeight: 22,
    alignItems: "stretch",
    backgroundColor: colors.ferien,
  },
  weekLabel: {
    width: 55,
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
  },
  weekLabelText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  weekDates: {
    fontSize: 7,
    color: colors.textSecondary,
  },
  weekContent: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  ferienText: {
    fontSize: 9,
    color: colors.ferienText,
    fontStyle: "italic",
  },
  einheitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  einheitFarbe: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  einheitTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  einheitFachbereich: {
    fontSize: 7,
    color: colors.textSecondary,
    marginRight: 4,
  },
  statusBadge: {
    fontSize: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 3,
  },
  beurteilungBadge: {
    fontSize: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginLeft: 3,
    color: colors.white,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: colors.textSecondary,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 5,
  },
  // Wochenplanung Detail
  detailCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  detailFarbe: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
    marginTop: 2,
  },
  detailTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  detailSubtitle: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  detailBody: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  detailSection: {
    marginBottom: 8,
  },
  detailSectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.textSecondary,
    marginBottom: 3,
  },
  detailSectionText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  kompetenzBadge: {
    fontSize: 7,
    backgroundColor: colors.background,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 2,
    marginRight: 4,
    marginBottom: 3,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  notizenBox: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 3,
    fontSize: 8,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
});

function getStatusStyle(status: JahresplanStatus) {
  switch (status) {
    case "geplant":
      return { backgroundColor: colors.statusGeplant, color: colors.statusGeplantText };
    case "durchgefuehrt":
      return { backgroundColor: colors.statusDurchgefuehrt, color: colors.statusDurchgefuehrtText };
    case "reflektiert":
      return { backgroundColor: colors.statusReflektiert, color: colors.statusReflektiertText };
  }
}

function formatDateShort(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}.${m}.`;
}

function getMondayOfWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
  return targetDate;
}

function getFridayOfWeek(week: number, year: number): Date {
  const monday = getMondayOfWeek(week, year);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return friday;
}

// Quartal labels
const QUARTAL_LABELS: Record<number, string> = {
  1: "Quartal 1 (Sommerferien – Herbstferien)",
  2: "Quartal 2 (Herbstferien – Weihnachtsferien)",
  3: "Quartal 3 (Weihnachtsferien – Frühlingsferien)",
  4: "Quartal 4 (Frühlingsferien – Sommerferien)",
};

// Types
interface WocheInfo {
  kw: number;
  jahr: number;
  quartal: number;
  istFerien: boolean;
  ferienName?: string;
}

interface QuartalsplanungPDFProps {
  schuljahr: string;
  quartal: number;
  wochen: WocheInfo[];
  einheiten: JahresplanEinheit[];
  lehrerName?: string;
  klasse?: string;
}

interface WochenplanungPDFProps {
  schuljahr: string;
  kw: number;
  jahr: number;
  einheiten: JahresplanEinheit[];
  istFerien: boolean;
  ferienName?: string;
  lehrerName?: string;
  klasse?: string;
}

interface JahresplanungPDFProps {
  schuljahr: string;
  wochen: WocheInfo[];
  einheiten: JahresplanEinheit[];
  lehrerName?: string;
  klasse?: string;
}

/**
 * PDF für Quartalsplanung - Übersicht aller Wochen eines Quartals
 */
export function QuartalsplanungPDF({ schuljahr, quartal, wochen, einheiten, lehrerName, klasse }: QuartalsplanungPDFProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" });

  // Einheiten pro Woche gruppieren
  const einheitenProWoche = new Map<number, JahresplanEinheit[]>();
  einheiten.forEach((einheit) => {
    for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
      const current = einheitenProWoche.get(kw) || [];
      current.push(einheit);
      einheitenProWoche.set(kw, current);
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {QUARTAL_LABELS[quartal] || `Quartal ${quartal}`}
          </Text>
          <Text style={styles.headerSubtitle}>
            Schuljahr {schuljahr}
            {lehrerName || klasse ? ` · ${[lehrerName, klasse].filter(Boolean).join(" · ")}` : ""}
          </Text>
          <Text style={styles.headerMeta}>
            Erstellt am {dateStr} · MIA-App Jahresplanung
          </Text>
        </View>

        {/* Wochen */}
        {wochen.map((woche) => {
          const wochenEinheiten = einheitenProWoche.get(woche.kw) || [];
          const montag = getMondayOfWeek(woche.kw, woche.jahr);
          const freitag = getFridayOfWeek(woche.kw, woche.jahr);

          return (
            <View
              key={`${woche.kw}-${woche.jahr}`}
              style={woche.istFerien ? styles.weekRowFerien : styles.weekRow}
              wrap={false}
            >
              <View style={styles.weekLabel}>
                <Text style={styles.weekLabelText}>KW {woche.kw}</Text>
                <Text style={styles.weekDates}>
                  {formatDateShort(montag)}–{formatDateShort(freitag)}
                </Text>
              </View>
              <View style={styles.weekContent}>
                {woche.istFerien ? (
                  <Text style={styles.ferienText}>
                    {woche.ferienName || "Ferien"}
                  </Text>
                ) : wochenEinheiten.length === 0 ? (
                  <Text style={styles.ferienText}>–</Text>
                ) : (
                  wochenEinheiten.map((einheit) => {
                    const statusStyle = getStatusStyle(einheit.status);
                    // Beurteilungen nur für diese KW anzeigen
                    const kwBeurteilungen = (einheit.beurteilungen || [])
                      .filter((b: Beurteilung) => b.kalenderwoche === woche.kw);
                    const kompetenzLabel =
                      einheit.kompetenzenNamen && einheit.kompetenzenNamen.length > 0
                        ? einheit.kompetenzenNamen[0]
                        : einheit.fachbereichName || einheit.fachbereichId;

                    return (
                      <View key={einheit.id} style={{ marginBottom: 2 }}>
                        <View style={styles.einheitRow}>
                          <View
                            style={[
                              styles.einheitFarbe,
                              { backgroundColor: einheit.fachbereichFarbe || "#6b7280" },
                            ]}
                          />
                          <Text style={styles.einheitFachbereich}>
                            {kompetenzLabel}
                          </Text>
                          <Text style={styles.einheitTitle}>{einheit.titel}</Text>
                          <Text
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusStyle.backgroundColor, color: statusStyle.color },
                            ]}
                          >
                            {STATUS_LABELS[einheit.status]}
                          </Text>
                          {kwBeurteilungen.map((b: Beurteilung, bIdx: number) => (
                            <Text
                              key={bIdx}
                              style={[
                                styles.beurteilungBadge,
                                {
                                  backgroundColor:
                                    b.typ === "formativ"
                                      ? colors.beurteilungFormativ
                                      : colors.beurteilungSummativ,
                                },
                              ]}
                            >
                              {b.typ === "formativ" ? "Formativ" : "Summativ"}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>MIA-App · Jahresplanung {schuljahr}</Text>
          <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/**
 * PDF für Wochenplanung - Detailansicht einer Woche
 */
export function WochenplanungPDF({
  schuljahr,
  kw,
  jahr,
  einheiten,
  istFerien,
  ferienName,
  lehrerName,
  klasse,
}: WochenplanungPDFProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" });
  const montag = getMondayOfWeek(kw, jahr);
  const freitag = getFridayOfWeek(kw, jahr);

  const formatDateLong = (date: Date) =>
    date.toLocaleDateString("de-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kalenderwoche {kw}</Text>
          <Text style={styles.headerSubtitle}>
            {formatDateLong(montag)} – {formatDateLong(freitag)}
          </Text>
          <Text style={styles.headerMeta}>
            Schuljahr {schuljahr}
            {lehrerName || klasse ? ` · ${[lehrerName, klasse].filter(Boolean).join(" · ")}` : ""}
            {" · "}Erstellt am {dateStr} · MIA-App Jahresplanung
          </Text>
        </View>

        {istFerien ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: colors.ferienText }}>
              {ferienName || "Ferien"} – Kein regulärer Unterricht
            </Text>
          </View>
        ) : einheiten.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Keine Einheiten für diese Woche geplant
            </Text>
          </View>
        ) : (
          einheiten.map((einheit) => {
            const statusStyle = getStatusStyle(einheit.status);
            return (
              <View key={einheit.id} style={styles.detailCard} wrap={false}>
                {/* Card Header */}
                <View
                  style={[
                    styles.detailHeader,
                    { backgroundColor: `${einheit.fachbereichFarbe || "#6b7280"}10` },
                  ]}
                >
                  <View
                    style={[
                      styles.detailFarbe,
                      { backgroundColor: einheit.fachbereichFarbe || "#6b7280" },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailTitle}>{einheit.titel}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.detailSubtitle}>
                        {einheit.fachbereichName || einheit.fachbereichId} · KW {einheit.zeitraumStart}–{einheit.zeitraumEnde}
                      </Text>
                      <Text
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusStyle.backgroundColor, color: statusStyle.color },
                        ]}
                      >
                        {STATUS_LABELS[einheit.status]}
                      </Text>
                      {einheit.beurteilungstyp && einheit.beurteilungstyp !== "keine" && (
                        <Text
                          style={[
                            styles.beurteilungBadge,
                            {
                              backgroundColor:
                                einheit.beurteilungstyp === "formativ"
                                  ? colors.beurteilungFormativ
                                  : colors.beurteilungSummativ,
                            },
                          ]}
                        >
                          {BEURTEILUNG_LABELS[einheit.beurteilungstyp]}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.detailBody}>
                  {/* Lernziele */}
                  {einheit.lernziele && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>Lernziele</Text>
                      <Text style={styles.detailSectionText}>{einheit.lernziele}</Text>
                    </View>
                  )}

                  {/* Kompetenzen */}
                  {einheit.kompetenzenNamen && einheit.kompetenzenNamen.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>LP21-Kompetenzen</Text>
                      <View style={styles.badgeRow}>
                        {einheit.kompetenzenNamen.map((name, i) => (
                          <Text key={i} style={styles.kompetenzBadge}>
                            {name}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Materialien */}
                  {einheit.materialien && einheit.materialien.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>Materialien</Text>
                      <View style={styles.badgeRow}>
                        {einheit.materialien.map((mat, i) => (
                          <Text key={i} style={styles.kompetenzBadge}>
                            {mat}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Beurteilungen */}
                  {einheit.beurteilungen && einheit.beurteilungen.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>Beurteilungen</Text>
                      {einheit.beurteilungen.map((b: Beurteilung, bIdx: number) => (
                        <View key={bIdx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                          <Text
                            style={[
                              styles.beurteilungBadge,
                              {
                                backgroundColor: b.typ === "formativ" ? colors.beurteilungFormativ : colors.beurteilungSummativ,
                                marginLeft: 0,
                                marginRight: 4,
                              },
                            ]}
                          >
                            {b.typ === "formativ" ? "Formativ" : "Summativ"}
                          </Text>
                          <Text style={{ fontSize: 8, color: colors.textSecondary }}>
                            KW {b.kalenderwoche}{b.notiz ? ` – ${b.notiz}` : ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Notizen */}
                  {einheit.notizen && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>Reflexion / Notizen</Text>
                      <Text style={styles.notizenBox}>{einheit.notizen}</Text>
                    </View>
                  )}

                  {/* Verknüpftes MIA-Thema */}
                  {einheit.linkedMiaThemeName && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionLabel}>Verknüpftes MIA-Thema</Text>
                      <Text style={styles.detailSectionText}>{einheit.linkedMiaThemeName}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>MIA-App · Jahresplanung {schuljahr}</Text>
          <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/**
 * PDF für komplette Jahresplanung - alle 4 Quartale
 */
export function JahresplanungPDF({ schuljahr, wochen, einheiten, lehrerName, klasse }: JahresplanungPDFProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "long", year: "numeric" });

  // Einheiten pro Woche gruppieren
  const einheitenProWoche = new Map<number, JahresplanEinheit[]>();
  einheiten.forEach((einheit) => {
    for (let kw = einheit.zeitraumStart; kw <= einheit.zeitraumEnde; kw++) {
      const current = einheitenProWoche.get(kw) || [];
      current.push(einheit);
      einheitenProWoche.set(kw, current);
    }
  });

  // Wochen nach Quartal gruppieren
  const quartalWochen = new Map<number, WocheInfo[]>();
  wochen.forEach((w) => {
    const current = quartalWochen.get(w.quartal) || [];
    current.push(w);
    quartalWochen.set(w.quartal, current);
  });

  return (
    <Document>
      {[1, 2, 3, 4].map((q) => {
        const qWochen = quartalWochen.get(q) || [];
        if (qWochen.length === 0) return null;

        return (
          <Page key={q} size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Jahresplanung {schuljahr}</Text>
              <Text style={styles.headerSubtitle}>
                {QUARTAL_LABELS[q]}
                {lehrerName || klasse ? ` · ${[lehrerName, klasse].filter(Boolean).join(" · ")}` : ""}
              </Text>
              <Text style={styles.headerMeta}>
                Erstellt am {dateStr} · MIA-App
              </Text>
            </View>

            {/* Wochen */}
            {qWochen.map((woche) => {
              const wochenEinheiten = einheitenProWoche.get(woche.kw) || [];
              const montag = getMondayOfWeek(woche.kw, woche.jahr);
              const freitag = getFridayOfWeek(woche.kw, woche.jahr);

              return (
                <View
                  key={`${woche.kw}-${woche.jahr}`}
                  style={woche.istFerien ? styles.weekRowFerien : styles.weekRow}
                  wrap={false}
                >
                  <View style={styles.weekLabel}>
                    <Text style={styles.weekLabelText}>KW {woche.kw}</Text>
                    <Text style={styles.weekDates}>
                      {formatDateShort(montag)}–{formatDateShort(freitag)}
                    </Text>
                  </View>
                  <View style={styles.weekContent}>
                    {woche.istFerien ? (
                      <Text style={styles.ferienText}>
                        {woche.ferienName || "Ferien"}
                      </Text>
                    ) : wochenEinheiten.length === 0 ? (
                      <Text style={styles.ferienText}>–</Text>
                    ) : (
                      wochenEinheiten.map((einheit) => {
                        const statusStyle = getStatusStyle(einheit.status);
                        const kwBeurteilungen = (einheit.beurteilungen || [])
                          .filter((b: Beurteilung) => b.kalenderwoche === woche.kw);
                        const kompetenzLabel =
                          einheit.kompetenzenNamen && einheit.kompetenzenNamen.length > 0
                            ? einheit.kompetenzenNamen[0]
                            : einheit.fachbereichName || einheit.fachbereichId;

                        return (
                          <View key={einheit.id} style={{ marginBottom: 2 }}>
                            <View style={styles.einheitRow}>
                              <View
                                style={[
                                  styles.einheitFarbe,
                                  { backgroundColor: einheit.fachbereichFarbe || "#6b7280" },
                                ]}
                              />
                              <Text style={styles.einheitFachbereich}>
                                {kompetenzLabel}
                              </Text>
                              <Text style={styles.einheitTitle}>{einheit.titel}</Text>
                              <Text
                                style={[
                                  styles.statusBadge,
                                  { backgroundColor: statusStyle.backgroundColor, color: statusStyle.color },
                                ]}
                              >
                                {STATUS_LABELS[einheit.status]}
                              </Text>
                              {kwBeurteilungen.map((b: Beurteilung, bIdx: number) => (
                                <Text
                                  key={bIdx}
                                  style={[
                                    styles.beurteilungBadge,
                                    {
                                      backgroundColor:
                                        b.typ === "formativ"
                                          ? colors.beurteilungFormativ
                                          : colors.beurteilungSummativ,
                                    },
                                  ]}
                                >
                                  {b.typ === "formativ" ? "Formativ" : "Summativ"}
                                </Text>
                              ))}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })}

            {/* Footer */}
            <View style={styles.footer} fixed>
              <Text>MIA-App · Jahresplanung {schuljahr}</Text>
              <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

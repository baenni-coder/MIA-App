"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
  Circle,
} from "@react-pdf/renderer";
import {
  Student,
  StudentProgress,
  StudentBadge,
  Kompetenz,
  ClassThemeProgress,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_COLORS,
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
} from "@/types";
import { getDiceBearUrl } from "./StudentAvatar";

// Farben
const colors = {
  primary: "#3b82f6", // Blau
  secondary: "#8b5cf6", // Lila
  success: "#22c55e", // Grün
  warning: "#f59e0b", // Orange
  starFilled: "#fbbf24", // Gelb
  starEmpty: "#d1d5db", // Grau
  textPrimary: "#1f2937",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
  background: "#f9fafb",
  white: "#ffffff",
};

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.textPrimary,
  },
  // Cover Page
  coverPage: {
    padding: 40,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 20,
  },
  coverSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 30,
    overflow: "hidden",
  },
  avatar: {
    width: 120,
    height: 120,
  },
  coverName: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  coverClass: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  coverDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 40,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: "23%",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  // Badge
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderLeftWidth: 4,
  },
  badgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIconText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: "Helvetica-Bold",
  },
  badgeName: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  badgeInfo: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  // Kompetenz
  kompetenzArea: {
    marginBottom: 15,
  },
  kompetenzAreaTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.textPrimary,
    marginBottom: 8,
    backgroundColor: colors.background,
    padding: 6,
    borderRadius: 4,
  },
  kompetenzRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kompetenzCode: {
    width: "25%",
    fontSize: 9,
    color: colors.textSecondary,
  },
  kompetenzStars: {
    flexDirection: "row",
    gap: 2,
  },
  // Progress Bar
  progressContainer: {
    marginBottom: 12,
  },
  progressLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabelText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  progressLabelValue: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  // Theme
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  themeName: {
    flex: 1,
    fontSize: 10,
  },
  themeDate: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.textSecondary,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.textSecondary,
  },
});

// Star SVG Component (gefüllt oder leer)
const StarIcon = ({ filled }: { filled: boolean }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? colors.starFilled : "none"}
      stroke={filled ? colors.starFilled : colors.starEmpty}
      strokeWidth={2}
    />
  </Svg>
);

// Star Rating Component
const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => (
  <View style={styles.kompetenzStars}>
    {Array.from({ length: max }, (_, i) => (
      <StarIcon key={i} filled={i < rating} />
    ))}
  </View>
);

// Badge Icon (Buchstabe im Kreis statt Emoji)
const BadgeIconCircle = ({ name, color }: { name: string; color: string }) => (
  <View style={[styles.badgeIcon, { backgroundColor: color }]}>
    <Text style={styles.badgeIconText}>{name.charAt(0).toUpperCase()}</Text>
  </View>
);

// Progress Bar Component
const ProgressBar = ({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabel}>
        <Text style={styles.progressLabelText}>{label}</Text>
        <Text style={styles.progressLabelValue}>
          {value} / {max} ({percentage.toFixed(0)}%)
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

// Props Interface
interface KompetenzenpassPDFProps {
  student: Student;
  progress: StudentProgress | null;
  badges: StudentBadge[];
  kompetenzen: Kompetenz[];
  completedThemes: ClassThemeProgress[];
}

// Main PDF Document
export const KompetenzenpassPDF = ({
  student,
  progress,
  badges,
  kompetenzen,
  completedThemes,
}: KompetenzenpassPDFProps) => {
  const ratings = progress?.ratings || {};
  const ratingEntries = Object.entries(ratings);
  const totalRated = ratingEntries.filter(([, r]) => r > 0).length;
  const totalKompetenzen = kompetenzen.length;
  const fiveStarCount = ratingEntries.filter(([, r]) => r === 5).length;
  const fourPlusCount = ratingEntries.filter(([, r]) => r >= 4).length;
  const averageRating =
    totalRated > 0
      ? ratingEntries.filter(([, r]) => r > 0).reduce((sum, [, r]) => sum + r, 0) / totalRated
      : 0;

  // Avatar URL
  const avatarConfig: AvatarConfig = student.avatarConfig || {
    ...DEFAULT_AVATAR_CONFIG,
    seed: student.id,
  };
  const avatarUrl = getDiceBearUrl(avatarConfig, 240);

  // Kompetenzen nach Bereich gruppieren
  const kompetenzByArea: Record<string, Kompetenz[]> = {};
  const areaStats: Record<string, { rated: number; total: number }> = {};

  kompetenzen.forEach((k) => {
    const area = k.kompetenzbereich || "Sonstige";
    if (!kompetenzByArea[area]) {
      kompetenzByArea[area] = [];
      areaStats[area] = { rated: 0, total: 0 };
    }
    kompetenzByArea[area].push(k);
    areaStats[area].total++;
    if (ratings[k.id] && ratings[k.id] > 0) {
      areaStats[area].rated++;
    }
  });

  const areas = ["Medien", "Informatik", "Anwendungskompetenzen"];
  const currentDate = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>Kompetenzenpass</Text>
        <Text style={styles.coverSubtitle}>
          Medien, Informatik und Anwendungskompetenzen
        </Text>

        <View style={styles.avatarContainer}>
          <Image src={avatarUrl} style={styles.avatar} />
        </View>

        <Text style={styles.coverName}>{student.name}</Text>
        <Text style={styles.coverClass}>{student.className || "Klasse"}</Text>
        {student.teacherName && (
          <Text style={styles.coverClass}>
            Lehrperson: {student.teacherName}
          </Text>
        )}

        <Text style={styles.coverDate}>Stand: {currentDate}</Text>
      </Page>

      {/* Summary Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Zusammenfassung</Text>
            <Text style={styles.headerSubtitle}>{student.name}</Text>
          </View>
          <Text style={styles.headerSubtitle}>{currentDate}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalRated}</Text>
            <Text style={styles.statLabel}>Bewertete Kompetenzen</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {averageRating.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Durchschnitt</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>
              {badges.length}
            </Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {completedThemes.length}
            </Text>
            <Text style={styles.statLabel}>Themen</Text>
          </View>
        </View>

        {/* Progress by Area */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fortschritt nach Bereich</Text>
          {areas.map((area, idx) => {
            const stats = areaStats[area] || { rated: 0, total: 0 };
            const areaColors = [colors.primary, colors.secondary, colors.success];
            return (
              <ProgressBar
                key={area}
                label={area}
                value={stats.rated}
                max={stats.total}
                color={areaColors[idx]}
              />
            );
          })}
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Erhaltene Badges ({badges.length})
            </Text>
            {badges.slice(0, 8).map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeRow,
                  { borderLeftColor: BADGE_RARITY_COLORS[badge.badgeRarity] },
                ]}
              >
                <BadgeIconCircle
                  name={badge.badgeName}
                  color={BADGE_RARITY_COLORS[badge.badgeRarity]}
                />
                <Text style={styles.badgeName}>{badge.badgeName}</Text>
                <Text style={styles.badgeInfo}>
                  {BADGE_RARITY_LABELS[badge.badgeRarity]} -{" "}
                  {new Date(badge.awardedAt).toLocaleDateString("de-CH")}
                </Text>
              </View>
            ))}
            {badges.length > 8 && (
              <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 4 }}>
                ... und {badges.length - 8} weitere Badges
              </Text>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text>MIA-App Kompetenzenpass</Text>
          <Text style={styles.pageNumber}>Seite 2</Text>
        </View>
      </Page>

      {/* Competencies Pages */}
      {areas.map((area, areaIndex) => {
        const areaKompetenzen = kompetenzByArea[area] || [];
        if (areaKompetenzen.length === 0) return null;

        // Split into chunks of ~25 per page
        const itemsPerPage = 25;
        const pages = [];
        for (let i = 0; i < areaKompetenzen.length; i += itemsPerPage) {
          pages.push(areaKompetenzen.slice(i, i + itemsPerPage));
        }

        return pages.map((pageKompetenzen, pageIndex) => (
          <Page
            key={`${area}-${pageIndex}`}
            size="A4"
            style={styles.page}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>{area}</Text>
                <Text style={styles.headerSubtitle}>
                  {areaStats[area]?.rated || 0} von {areaStats[area]?.total || 0} bewertet
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>{student.name}</Text>
            </View>

            <View style={styles.kompetenzArea}>
              {pageKompetenzen.map((k) => {
                const rating = ratings[k.id] || 0;
                return (
                  <View key={k.id} style={styles.kompetenzRow}>
                    <Text style={styles.kompetenzCode}>
                      {k.lpCode || k.name?.substring(0, 20) || "—"}
                    </Text>
                    <StarRating rating={rating} />
                  </View>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Text>MIA-App Kompetenzenpass</Text>
              <Text style={styles.pageNumber}>
                Seite {3 + areaIndex + pageIndex}
              </Text>
            </View>
          </Page>
        ));
      })}

      {/* Completed Themes Page */}
      {completedThemes.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Bearbeitete Themen</Text>
              <Text style={styles.headerSubtitle}>
                {completedThemes.length} Themen im Unterricht behandelt
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>{student.name}</Text>
          </View>

          <View style={styles.section}>
            {completedThemes.map((theme) => (
              <View key={theme.id} style={styles.themeRow}>
                <Text style={styles.themeName}>{theme.themeName}</Text>
                <Text style={styles.themeDate}>
                  {new Date(theme.markedCompletedAt).toLocaleDateString("de-CH")}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text>MIA-App Kompetenzenpass</Text>
            <Text style={styles.pageNumber}>
              Seite {3 + areas.length + Math.ceil(kompetenzen.length / 25)}
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

export default KompetenzenpassPDF;

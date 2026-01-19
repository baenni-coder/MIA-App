"use client";

import { useAuth } from "@/contexts/AuthContext";
import StudentProtectedRoute from "@/components/StudentProtectedRoute";
import StudentDashboardLayout from "@/components/StudentDashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Student,
  Badge,
  StudentBadge,
  BadgeRarity,
  BADGE_RARITY_COLORS,
  BADGE_RARITY_LABELS,
} from "@/types";
import { Trophy, Lock, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Badge Card Component
function BadgeCard({
  badge,
  earned,
  earnedBadge,
}: {
  badge: Badge;
  earned: boolean;
  earnedBadge?: StudentBadge;
}) {
  const rarityColor = BADGE_RARITY_COLORS[badge.rarity];

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-300",
        earned
          ? "bg-gradient-to-br from-white via-white to-gray-50 shadow-md hover:shadow-lg hover:scale-105"
          : "bg-gray-100 border-gray-200 opacity-60"
      )}
      style={{
        borderColor: earned ? rarityColor : undefined,
      }}
    >
      {/* Rarity Indicator */}
      {earned && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          style={{ backgroundColor: rarityColor }}
        />
      )}

      {/* Lock Icon for unearned */}
      {!earned && (
        <div className="absolute top-2 right-2">
          <Lock className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Badge Content */}
      <div className="text-center">
        <span
          className={cn(
            "text-4xl block mb-3 transition-transform",
            earned ? "" : "grayscale"
          )}
        >
          {badge.emoji}
        </span>
        <h3
          className={cn(
            "font-semibold text-sm mb-1",
            !earned && "text-gray-500"
          )}
        >
          {badge.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {badge.description}
        </p>
        <BadgeUI
          variant="outline"
          className="text-xs"
          style={{
            color: earned ? rarityColor : undefined,
            borderColor: earned ? rarityColor : undefined,
          }}
        >
          {BADGE_RARITY_LABELS[badge.rarity]}
        </BadgeUI>

        {/* Earned Date */}
        {earned && earnedBadge && (
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(earnedBadge.awardedAt).toLocaleDateString("de-CH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// Rarity Progress Component
function RarityProgress({
  rarity,
  earned,
  total,
}: {
  rarity: BadgeRarity;
  earned: number;
  total: number;
}) {
  const color = BADGE_RARITY_COLORS[rarity];
  const label = BADGE_RARITY_LABELS[rarity];
  const percent = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span style={{ color }}>{label}</span>
        <span className="text-muted-foreground">
          {earned}/{total}
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2"
        style={
          {
            "--progress-foreground": color,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

export default function StudentBadgesPage() {
  const { user, userProfile } = useAuth();
  const studentProfile = userProfile as Student | null;

  const [loading, setLoading] = useState(true);
  const [systemBadges, setSystemBadges] = useState<Badge[]>([]);
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<StudentBadge[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user || !studentProfile) return;

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch system badges, custom badges, and earned badges in parallel
      const [systemResponse, customResponse, earnedResponse] = await Promise.all([
        fetch("/api/student-progress/badges?system=true", { headers }),
        fetch("/api/student-progress/badges?custom=true", { headers }),
        fetch(`/api/student-progress/badges?studentId=${studentProfile.id}`, {
          headers,
        }),
      ]);

      if (systemResponse.ok) {
        const data = await systemResponse.json();
        setSystemBadges(data.badges || []);
      }

      if (customResponse.ok) {
        const data = await customResponse.json();
        setCustomBadges(data.badges || []);
      }

      if (earnedResponse.ok) {
        const data = await earnedResponse.json();
        setEarnedBadges(data.badges || []);
      }
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  }, [user, studentProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combine system and custom badges
  const allBadges = [...systemBadges, ...customBadges];

  // Calculate stats
  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId));
  const totalBadges = allBadges.length;
  const totalEarned = earnedBadges.length;
  const progressPercent =
    totalBadges > 0 ? Math.round((totalEarned / totalBadges) * 100) : 0;

  // Group badges by rarity (including custom badges)
  const badgesByRarity = allBadges.reduce(
    (acc, badge) => {
      if (!acc[badge.rarity]) acc[badge.rarity] = [];
      acc[badge.rarity].push(badge);
      return acc;
    },
    {} as Record<BadgeRarity, Badge[]>
  );

  // Count earned by rarity
  const earnedByRarity = earnedBadges.reduce(
    (acc, badge) => {
      acc[badge.badgeRarity] = (acc[badge.badgeRarity] || 0) + 1;
      return acc;
    },
    {} as Record<BadgeRarity, number>
  );

  const rarityOrder: BadgeRarity[] = ["common", "rare", "epic", "legendary"];

  if (loading) {
    return (
      <StudentProtectedRoute>
        <StudentDashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </StudentDashboardLayout>
      </StudentProtectedRoute>
    );
  }

  return (
    <StudentProtectedRoute>
      <StudentDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-7 w-7 text-yellow-500" />
                Meine Badges
              </h1>
              <p className="text-muted-foreground">
                Sammle Auszeichnungen durch das Bewerten deiner Kompetenzen
              </p>
            </div>
          </div>

          {/* Stats Card */}
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Overall Progress */}
                <div className="md:col-span-1">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-white border-4 border-yellow-300 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-yellow-600">
                            {totalEarned}
                          </span>
                          <span className="text-sm text-gray-500 block">
                            /{totalBadges}
                          </span>
                        </div>
                      </div>
                      {totalEarned > 0 && (
                        <div className="absolute -top-1 -right-1">
                          <Sparkles className="h-6 w-6 text-yellow-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">Gesammelte Badges</h3>
                      <p className="text-sm text-muted-foreground">
                        {progressPercent}% der Sammlung
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rarity Progress */}
                <div className="md:col-span-2 space-y-3">
                  {rarityOrder.map((rarity) => {
                    const badges = badgesByRarity[rarity] || [];
                    const earned = earnedByRarity[rarity] || 0;
                    if (badges.length === 0) return null;
                    return (
                      <RarityProgress
                        key={rarity}
                        rarity={rarity}
                        earned={earned}
                        total={badges.length}
                      />
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges by Rarity */}
          {rarityOrder.map((rarity) => {
            const badges = badgesByRarity[rarity] || [];
            if (badges.length === 0) return null;

            const earnedCount = earnedByRarity[rarity] || 0;
            const color = BADGE_RARITY_COLORS[rarity];
            const label = BADGE_RARITY_LABELS[rarity];

            return (
              <Card key={rarity}>
                <CardHeader>
                  <CardTitle
                    className="flex items-center gap-2"
                    style={{ color }}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </CardTitle>
                  <CardDescription>
                    {earnedCount} von {badges.length} Badges freigeschaltet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {badges.map((badge) => {
                      const earned = earnedBadgeIds.has(badge.id);
                      const earnedBadge = earnedBadges.find(
                        (eb) => eb.badgeId === badge.id
                      );
                      return (
                        <BadgeCard
                          key={badge.id}
                          badge={badge}
                          earned={earned}
                          earnedBadge={earnedBadge}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Empty State */}
          {systemBadges.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Keine Badges verfügbar
                </h3>
                <p className="text-muted-foreground">
                  Badges werden von deiner Lehrperson eingerichtet.
                </p>
              </CardContent>
            </Card>
          )}

          {/* How to earn badges */}
          <Card>
            <CardHeader>
              <CardTitle>Wie verdiene ich Badges?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">🌱</span>
                  <div>
                    <h4 className="font-medium">Kompetenzen bewerten</h4>
                    <p className="text-sm text-muted-foreground">
                      Bewerte regelmässig deine Kompetenzen mit 1-5 Sternen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <h4 className="font-medium">Hohe Bewertungen</h4>
                    <p className="text-sm text-muted-foreground">
                      Verdiene Badges für 4 oder 5 Sterne Bewertungen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h4 className="font-medium">Vollständigkeit</h4>
                    <p className="text-sm text-muted-foreground">
                      Bewerte alle Kompetenzen für legendäre Badges
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">🎖️</span>
                  <div>
                    <h4 className="font-medium">Besondere Leistungen</h4>
                    <p className="text-sm text-muted-foreground">
                      Manche Badges werden von deiner Lehrperson vergeben
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}

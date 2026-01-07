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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Student, Kompetenz, StudentProgress, ClassThemeProgress, StudentBadge } from "@/types";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Star, Search, Filter, BookOpen, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Kompetenzbereich-Farben
const AREA_COLORS: Record<string, string> = {
  Medien: "bg-purple-100 text-purple-800 border-purple-200",
  Informatik: "bg-blue-100 text-blue-800 border-blue-200",
  Anwendungskompetenzen: "bg-green-100 text-green-800 border-green-200",
};

// Zyklus-Farben
const ZYKLUS_COLORS: Record<string, string> = {
  "Zyklus 1": "bg-yellow-100 text-yellow-800",
  "Zyklus 2": "bg-orange-100 text-orange-800",
  "Zyklus 3": "bg-red-100 text-red-800",
};

// Star Rating Komponente
function StarRating({
  rating,
  onRatingChange,
  disabled = false,
  size = "md",
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            "transition-all duration-150",
            !disabled && "hover:scale-110 cursor-pointer",
            disabled && "cursor-default"
          )}
          onMouseEnter={() => !disabled && setHoverRating(star)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
          onClick={() => onRatingChange?.(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors duration-150",
              (hoverRating || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Badge-Earned-Dialog
function BadgeEarnedDialog({
  badges,
  onClose,
}: {
  badges: StudentBadge[];
  onClose: () => void;
}) {
  if (badges.length === 0) return null;

  return (
    <Dialog open={badges.length > 0} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {badges.length === 1 ? "Neues Badge verdient!" : "Neue Badges verdient!"}
          </DialogTitle>
          <DialogDescription>
            Herzlichen Glückwunsch! Du hast {badges.length === 1 ? "ein neues Badge" : "neue Badges"} erhalten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200"
            >
              <span className="text-4xl">{badge.badgeEmoji}</span>
              <div>
                <h3 className="font-semibold">{badge.badgeName}</h3>
                <p className="text-sm text-muted-foreground">{badge.reason}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={onClose} className="w-full">
          Super!
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function StudentKompetenzenContent() {
  const { user, userProfile } = useAuth();
  const studentProfile = userProfile as Student | null;
  const searchParams = useSearchParams();
  const highlightedCompRef = useRef<HTMLDivElement>(null);

  const [competencies, setCompetencies] = useState<Kompetenz[]>([]);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [completedThemes, setCompletedThemes] = useState<ClassThemeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<StudentBadge[]>([]);

  // URL params for highlighting
  const highlightCompetencyId = searchParams.get("highlight");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterZyklus, setFilterZyklus] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [filterTreated, setFilterTreated] = useState<string>("all");

  // Selected Competency for Detail View
  const [selectedCompetency, setSelectedCompetency] = useState<Kompetenz | null>(
    null
  );

  // Get all competency IDs from completed themes
  const treatedCompetencyIds = new Set(
    completedThemes.flatMap((t) => t.competencyIds)
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user || !studentProfile) return;

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch competencies, progress, and completed themes in parallel
      const [compResponse, progressResponse, themesResponse] = await Promise.all([
        fetch("/api/kompetenzen", { headers }),
        fetch(`/api/student-progress?studentId=${studentProfile.id}`, { headers }),
        fetch(`/api/class-themes?classId=${studentProfile.classId}`, { headers }),
      ]);

      if (compResponse.ok) {
        const data = await compResponse.json();
        setCompetencies(data.kompetenzen || []);
      }

      if (progressResponse.ok) {
        const data = await progressResponse.json();
        setProgress(data.progress);
      }

      if (themesResponse.ok) {
        const data = await themesResponse.json();
        setCompletedThemes(data.themes || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, studentProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-open highlighted competency from URL
  useEffect(() => {
    if (highlightCompetencyId && competencies.length > 0 && !loading) {
      const comp = competencies.find((c) => c.id === highlightCompetencyId);
      if (comp) {
        setSelectedCompetency(comp);
        // Scroll to the highlighted competency card after a short delay
        setTimeout(() => {
          highlightedCompRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    }
  }, [highlightCompetencyId, competencies, loading]);

  // Update rating
  const handleRatingChange = async (competencyId: string, rating: number) => {
    if (!user || !studentProfile) return;

    setSavingId(competencyId);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/student-progress", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: studentProfile.id,
          competencyId,
          rating,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update local progress
        setProgress((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ratings: {
              ...prev.ratings,
              [competencyId]: rating,
            },
          };
        });

        // Show new badges
        if (data.newBadges && data.newBadges.length > 0) {
          setNewBadges(data.newBadges);
        }
      }
    } catch (error) {
      console.error("Error updating rating:", error);
    } finally {
      setSavingId(null);
    }
  };

  // Group competencies by area
  const groupedCompetencies = competencies.reduce(
    (acc, comp) => {
      const area = comp.kompetenzbereich || "Andere";
      if (!acc[area]) acc[area] = [];
      acc[area].push(comp);
      return acc;
    },
    {} as Record<string, Kompetenz[]>
  );

  // Sort areas in the right order
  const sortedAreas = ["Medien", "Informatik", "Anwendungskompetenzen"].filter(
    (area) => groupedCompetencies[area]
  );

  // Filter competencies
  const filterCompetency = (comp: Kompetenz) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        comp.name?.toLowerCase().includes(query) ||
        comp.lpCode?.toLowerCase().includes(query) ||
        comp.kompetenz?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Area filter
    if (filterArea !== "all" && comp.kompetenzbereich !== filterArea) {
      return false;
    }

    // Zyklus filter
    if (filterZyklus !== "all") {
      if (!comp.zyklus?.includes(filterZyklus)) return false;
    }

    // Rating filter
    if (filterRating !== "all") {
      const rating = progress?.ratings[comp.id] || 0;
      if (filterRating === "unrated" && rating > 0) return false;
      if (filterRating === "rated" && rating === 0) return false;
    }

    // Treated filter (from completed themes)
    if (filterTreated !== "all") {
      const isTreated = treatedCompetencyIds.has(comp.id);
      if (filterTreated === "treated" && !isTreated) return false;
      if (filterTreated === "untreated" && isTreated) return false;
    }

    return true;
  };

  // Get themes that cover a competency
  const getThemesForCompetency = (competencyId: string) => {
    return completedThemes.filter((theme) =>
      theme.competencyIds.includes(competencyId)
    );
  };

  // Calculate stats
  const totalCompetencies = competencies.length;
  const ratedCompetencies = Object.values(progress?.ratings || {}).filter(
    (r) => r > 0
  ).length;
  const progressPercent =
    totalCompetencies > 0
      ? Math.round((ratedCompetencies / totalCompetencies) * 100)
      : 0;

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
              <h1 className="text-2xl font-bold">Meine Kompetenzen</h1>
              <p className="text-muted-foreground">
                Bewerte deine Fähigkeiten mit 1-5 Sternen
              </p>
            </div>

            {/* Progress Overview */}
            <Card className="md:min-w-[200px]">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Bewertet</div>
                    <div className="font-semibold">
                      {ratedCompetencies} / {totalCompetencies}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {progressPercent}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Kompetenz suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterArea} onValueChange={setFilterArea}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Bereich" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Bereiche</SelectItem>
                      <SelectItem value="Medien">Medien</SelectItem>
                      <SelectItem value="Informatik">Informatik</SelectItem>
                      <SelectItem value="Anwendungskompetenzen">
                        Anwendung
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterZyklus} onValueChange={setFilterZyklus}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Zyklus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Zyklen</SelectItem>
                      <SelectItem value="Zyklus 1">Zyklus 1</SelectItem>
                      <SelectItem value="Zyklus 2">Zyklus 2</SelectItem>
                      <SelectItem value="Zyklus 3">Zyklus 3</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterRating} onValueChange={setFilterRating}>
                    <SelectTrigger className="w-[140px]">
                      <Star className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Bewertung" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="unrated">Nicht bewertet</SelectItem>
                      <SelectItem value="rated">Bewertet</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterTreated} onValueChange={setFilterTreated}>
                    <SelectTrigger className="w-[160px]">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Behandelt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kompetenzen</SelectItem>
                      <SelectItem value="treated">Im Unterricht behandelt</SelectItem>
                      <SelectItem value="untreated">Noch nicht behandelt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competencies by Area */}
          <Accordion
            type="multiple"
            defaultValue={sortedAreas}
            className="space-y-4"
          >
            {sortedAreas.map((area) => {
              const areaCompetencies = groupedCompetencies[area].filter(filterCompetency);
              if (areaCompetencies.length === 0) return null;

              const areaRated = areaCompetencies.filter(
                (c) => (progress?.ratings[c.id] || 0) > 0
              ).length;

              return (
                <AccordionItem
                  key={area}
                  value={area}
                  className="bg-card rounded-lg border"
                >
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn("font-medium", AREA_COLORS[area])}
                      >
                        {area}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {areaRated} / {areaCompetencies.length} bewertet
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-3">
                      {areaCompetencies.map((comp) => {
                        const rating = progress?.ratings[comp.id] || 0;
                        const themes = getThemesForCompetency(comp.id);
                        const isSaving = savingId === comp.id;
                        const isTreated = treatedCompetencyIds.has(comp.id);
                        const isHighlighted = highlightCompetencyId === comp.id;

                        return (
                          <Card
                            key={comp.id}
                            ref={isHighlighted ? highlightedCompRef : undefined}
                            className={cn(
                              "transition-all",
                              rating > 0 && "border-green-200 bg-green-50/30",
                              isTreated && rating === 0 && "border-blue-200 bg-blue-50/30",
                              isHighlighted && "ring-2 ring-blue-500 ring-offset-2"
                            )}
                          >
                            <CardContent className="py-3">
                              <div className="flex flex-col md:flex-row md:items-center gap-3">
                                {/* Competency Info */}
                                <div
                                  className="flex-1 cursor-pointer hover:opacity-80"
                                  onClick={() => setSelectedCompetency(comp)}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {comp.lpCode && (
                                      <Badge variant="secondary" className="text-xs">
                                        {comp.lpCode}
                                      </Badge>
                                    )}
                                    {comp.zyklus?.map((z) => (
                                      <Badge
                                        key={z}
                                        variant="outline"
                                        className={cn(
                                          "text-xs",
                                          ZYKLUS_COLORS[z]
                                        )}
                                      >
                                        {z}
                                      </Badge>
                                    ))}
                                    {isTreated && (
                                      <Badge
                                        variant="default"
                                        className="text-xs bg-blue-500"
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Behandelt
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="font-medium text-sm">
                                    {comp.name}
                                  </h3>
                                  {comp.kompetenz && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {comp.kompetenz}
                                    </p>
                                  )}
                                </div>

                                {/* Rating */}
                                <div className="flex items-center gap-4">
                                  {themes.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <BookOpen className="h-3 w-3" />
                                      <span>{themes.length} Thema(en)</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    {isSaving && (
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    )}
                                    <StarRating
                                      rating={rating}
                                      onRatingChange={(r) =>
                                        handleRatingChange(comp.id, r)
                                      }
                                      disabled={isSaving}
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Empty State */}
          {competencies.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Keine Kompetenzen gefunden
                </h3>
                <p className="text-muted-foreground">
                  Es konnten keine Kompetenzen geladen werden.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Competency Detail Dialog */}
        <Dialog
          open={!!selectedCompetency}
          onOpenChange={() => setSelectedCompetency(null)}
        >
          {selectedCompetency && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCompetency.lpCode && (
                    <Badge variant="secondary">{selectedCompetency.lpCode}</Badge>
                  )}
                  {selectedCompetency.name}
                </DialogTitle>
                <DialogDescription>
                  Kompetenz-Details und deine Bewertung
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Area Badge */}
                {selectedCompetency.kompetenzbereich && (
                  <Badge
                    variant="outline"
                    className={AREA_COLORS[selectedCompetency.kompetenzbereich]}
                  >
                    {selectedCompetency.kompetenzbereich}
                  </Badge>
                )}

                {/* Description */}
                {selectedCompetency.kompetenz && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Beschreibung</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCompetency.kompetenz}
                    </p>
                  </div>
                )}

                {/* Kompetenzstufe */}
                {selectedCompetency.kompetenzstufe && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Kompetenzstufe</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCompetency.kompetenzstufe}
                    </p>
                  </div>
                )}

                {/* Grundanspruch */}
                {selectedCompetency.grundanspruch && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Grundanspruch</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCompetency.grundanspruch}
                    </p>
                  </div>
                )}

                {/* Zyklus & Klassenstufe */}
                <div className="flex gap-4">
                  {selectedCompetency.zyklus &&
                    selectedCompetency.zyklus.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Zyklus</h4>
                        <div className="flex gap-1">
                          {selectedCompetency.zyklus.map((z) => (
                            <Badge
                              key={z}
                              variant="outline"
                              className={ZYKLUS_COLORS[z]}
                            >
                              {z}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {selectedCompetency.klassenstufe &&
                    selectedCompetency.klassenstufe.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Klassenstufe</h4>
                        <div className="flex gap-1 flex-wrap">
                          {selectedCompetency.klassenstufe.map((k) => (
                            <Badge key={k} variant="outline">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Completed Themes */}
                {getThemesForCompetency(selectedCompetency.id).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Behandelte Themen
                    </h4>
                    <div className="space-y-2">
                      {getThemesForCompetency(selectedCompetency.id).map(
                        (theme) => (
                          <div
                            key={theme.id}
                            className="text-sm p-2 bg-muted rounded"
                          >
                            {theme.themeName}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Rating */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Deine Bewertung</h4>
                  <div className="flex items-center gap-4">
                    <StarRating
                      rating={progress?.ratings[selectedCompetency.id] || 0}
                      onRatingChange={(r) =>
                        handleRatingChange(selectedCompetency.id, r)
                      }
                      size="lg"
                      disabled={savingId === selectedCompetency.id}
                    />
                    {savingId === selectedCompetency.id && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>

        {/* Badge Earned Dialog */}
        <BadgeEarnedDialog
          badges={newBadges}
          onClose={() => setNewBadges([])}
        />
      </StudentDashboardLayout>
    </StudentProtectedRoute>
  );
}

// Wrapper with Suspense for useSearchParams
export default function StudentKompetenzenPage() {
  return (
    <Suspense
      fallback={
        <StudentProtectedRoute>
          <StudentDashboardLayout>
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          </StudentDashboardLayout>
        </StudentProtectedRoute>
      }
    >
      <StudentKompetenzenContent />
    </Suspense>
  );
}

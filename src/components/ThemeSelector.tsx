"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Loader2, BookOpen, X } from "lucide-react";
import { Thema } from "@/types";

interface ThemeSelectorProps {
  selectedThemeIds: string[];
  onSelectionChange: (themeIds: string[], themeNames: string[]) => void;
  disabled?: boolean;
}

export default function ThemeSelector({
  selectedThemeIds,
  onSelectionChange,
  disabled = false,
}: ThemeSelectorProps) {
  const { user } = useAuth();
  const [themes, setThemes] = useState<Thema[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadThemes();
  }, [user]);

  const loadThemes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      // Lade alle Themen (ohne Stufen-Filter)
      const response = await fetch("/api/themen?grouped=false", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Flatten wenn gruppiert, sonst direkt verwenden
        const allThemes: Thema[] = Array.isArray(data)
          ? data
          : Object.values(data).flat();
        setThemes(allThemes);
      }
    } catch (err) {
      console.error("Error loading themes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Suche in Themen
  const filteredThemes = useMemo(() => {
    if (!searchQuery.trim()) return themes;
    const query = searchQuery.toLowerCase();
    return themes.filter(
      (theme) =>
        theme.thema.toLowerCase().includes(query) ||
        theme.lehrmittel?.toLowerCase().includes(query) ||
        theme.beschreibung?.toLowerCase().includes(query)
    );
  }, [themes, searchQuery]);

  // Gruppiere nach Lehrmittel
  const groupedThemes = useMemo(() => {
    const groups: Record<string, Thema[]> = {};
    filteredThemes.forEach((theme) => {
      const key = theme.lehrmittel || "Ohne Lehrmittel";
      if (!groups[key]) groups[key] = [];
      groups[key].push(theme);
    });
    // Sortiere Gruppen alphabetisch
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredThemes]);

  const handleToggleTheme = (theme: Thema) => {
    if (disabled) return;

    const isSelected = selectedThemeIds.includes(theme.id);
    let newIds: string[];
    let newNames: string[];

    if (isSelected) {
      newIds = selectedThemeIds.filter((id) => id !== theme.id);
    } else {
      newIds = [...selectedThemeIds, theme.id];
    }

    // Hole die Namen für die ausgewählten IDs
    newNames = themes
      .filter((t) => newIds.includes(t.id))
      .map((t) => t.thema);

    onSelectionChange(newIds, newNames);
  };

  const handleRemoveTheme = (themeId: string) => {
    if (disabled) return;

    const newIds = selectedThemeIds.filter((id) => id !== themeId);
    const newNames = themes
      .filter((t) => newIds.includes(t.id))
      .map((t) => t.thema);

    onSelectionChange(newIds, newNames);
  };

  // Ausgewählte Themen-Objekte
  const selectedThemes = themes.filter((t) => selectedThemeIds.includes(t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Ausgewählte Themen */}
      {selectedThemes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedThemes.map((theme) => (
            <Badge
              key={theme.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <BookOpen className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{theme.thema}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTheme(theme.id)}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Suchfeld */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Themen suchen..."
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {/* Themen-Liste */}
      <div className="h-[200px] border rounded-md overflow-y-auto">
        <div className="p-2 space-y-4">
          {groupedThemes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Themen gefunden
            </p>
          )}

          {groupedThemes.map(([lehrmittel, themesInGroup]) => (
            <div key={lehrmittel}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background">
                {lehrmittel}
              </h4>
              <div className="space-y-1">
                {themesInGroup.map((theme) => {
                  const isSelected = selectedThemeIds.includes(theme.id);
                  return (
                    <div
                      key={theme.id}
                      className={`flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer ${
                        isSelected ? "bg-muted" : ""
                      }`}
                      onClick={() => handleToggleTheme(theme)}
                    >
                      <Checkbox
                        id={`theme-${theme.id}`}
                        checked={isSelected}
                        disabled={disabled}
                        onCheckedChange={() => handleToggleTheme(theme)}
                      />
                      <Label
                        htmlFor={`theme-${theme.id}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {theme.thema}
                      </Label>
                      {theme.anzahlLektionen && (
                        <span className="text-xs text-muted-foreground">
                          {theme.anzahlLektionen} Lekt.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedThemeIds.length} Thema(s) ausgewählt
      </p>
    </div>
  );
}

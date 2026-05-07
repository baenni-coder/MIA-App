"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Thema,
  Zeitraum,
  Stufe,
  SchoolJahresplanAssignment,
  JahresplanMode,
  Fachbereich,
} from "@/types";
import IntegrationsfaecherMultiSelect from "@/components/IntegrationsfaecherMultiSelect";
import {
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Pencil,
  RotateCcw,
} from "lucide-react";

const ZEITRAEUME: Zeitraum[] = [
  "Sommerferien-Herbstferien",
  "Herbstferien-Weihnachtsferien",
  "Weihnachtsferien-Winterferien",
  "Winterferien-Frühlingsferien",
  "Frühlingsferien-Sommerferien",
  "Zusatz",
];

const ALL_STUFEN: Stufe[] = [
  "KiGa",
  "1. Klasse",
  "2. Klasse",
  "3. Klasse",
  "4. Klasse",
  "5. Klasse",
  "6. Klasse",
  "7. Klasse",
  "8. Klasse",
  "9. Klasse",
];

interface SchoolOption {
  id: string;
  name: string;
  ort?: string;
}

interface PoolEntry {
  // Original-Thema aus der Pool-API (ungefiltert, keine Overrides)
  id: string;
  thema: string;
  beschreibung?: string;
  lehrmittel?: string;
  anzahlLektionen?: number;
  schuljahr: Stufe[];
  zeitraum?: Zeitraum;
  fileRouge?: string;
  unterlagen?: string;
  empfohleneIntegrationsfaecher?: Fachbereich[];
  isCustom?: boolean;
  sourceType: "system" | "custom";
}

export default function JahresplanPoolPage() {
  const router = useRouter();
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "picts_admin" || userRole === "super_admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Schulen & Auswahl
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Modus & Daten
  const [mode, setMode] = useState<JahresplanMode>("open");
  const [poolEntries, setPoolEntries] = useState<PoolEntry[]>([]);
  const [assignments, setAssignments] = useState<SchoolJahresplanAssignment[]>(
    []
  );

  // Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [zeitraumFilter, setZeitraumFilter] = useState<Zeitraum | "all">("all");

  // Edit Dialog
  const [editingAssignment, setEditingAssignment] =
    useState<SchoolJahresplanAssignment | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<PoolEntry | null>(null);

  // Zugangsprüfung
  useEffect(() => {
    if (!user || !userRole) return;
    if (!isAdmin) {
      router.push("/dashboard");
    }
  }, [user, userRole, isAdmin, router]);

  // Schulen + initiale Schul-Auswahl
  useEffect(() => {
    if (!user || !isAdmin) return;
    loadSchoolsAndDefault();
  }, [user, isAdmin]);

  // Wenn Schule wechselt: Daten laden
  useEffect(() => {
    if (!selectedSchoolId) return;
    loadSchoolData(selectedSchoolId);
  }, [selectedSchoolId]);

  const loadSchoolsAndDefault = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      // Super-Admin kann alle Schulen wählen, PICTS-Admin nur die eigene.
      if (isSuperAdmin) {
        const res = await fetch("/api/admin/schools", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Schulen konnten nicht geladen werden");
        const data = await res.json();
        const list: SchoolOption[] = (data.schools || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          ort: s.ort,
        }));
        setSchools(list);
        // Default: eigene Schule, sonst erste
        const teacherRes = await fetch(`/api/teachers?userId=${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (teacherRes.ok) {
          const teacher = await teacherRes.json();
          if (teacher?.schuleId && list.some((s) => s.id === teacher.schuleId)) {
            setSelectedSchoolId(teacher.schuleId);
          } else if (list.length > 0) {
            setSelectedSchoolId(list[0].id);
          }
        } else if (list.length > 0) {
          setSelectedSchoolId(list[0].id);
        }
      } else {
        // PICTS-Admin: nur eigene Schule
        const teacherRes = await fetch(`/api/teachers?userId=${user.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!teacherRes.ok) throw new Error("Profil konnte nicht geladen werden");
        const teacher = await teacherRes.json();
        if (teacher?.schuleId) {
          setSchools([
            {
              id: teacher.schuleId,
              name: teacher.schule?.name || "Meine Schule",
              ort: teacher.schule?.ort,
            },
          ]);
          setSelectedSchoolId(teacher.schuleId);
        } else {
          setError("Keine Schulzuordnung gefunden.");
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolData = async (schuleId: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();

      // Parallel: Modus, Pool-Themen (open), Assignments
      const [modeRes, poolRes, assignmentsRes] = await Promise.all([
        fetch(`/api/admin/schools/${schuleId}/jahresplan-mode`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/themen?grouped=false`),
        fetch(
          `/api/school-jahresplan?schuleId=${encodeURIComponent(schuleId)}&includeInactive=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      if (!modeRes.ok) throw new Error("Modus konnte nicht geladen werden");
      if (!poolRes.ok) throw new Error("Pool-Themen konnten nicht geladen werden");
      if (!assignmentsRes.ok) throw new Error("Zuordnungen konnten nicht geladen werden");

      const modeData = await modeRes.json();
      const poolData: Thema[] = await poolRes.json();
      const assignmentsData = await assignmentsRes.json();

      setMode(modeData.mode || "open");

      // Pool-Themen: wir nehmen Airtable-Themen + approved Custom Themes
      // /api/themen liefert beides bereits kombiniert (ohne Stufen-Filter).
      const entries: PoolEntry[] = (poolData || []).map((t) => ({
        id: t.id,
        thema: t.thema,
        beschreibung: t.beschreibung,
        lehrmittel: t.lehrmittel,
        anzahlLektionen: t.anzahlLektionen,
        schuljahr: t.schuljahr || [],
        zeitraum: t.zeitraum,
        fileRouge: t.fileRouge,
        unterlagen: t.unterlagen,
        empfohleneIntegrationsfaecher: t.empfohleneIntegrationsfaecher,
        isCustom: t.isCustom,
        sourceType: t.isCustom ? "custom" : "system",
      }));
      setPoolEntries(entries);
      setAssignments(assignmentsData.assignments || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  // Lookup: sourceType:sourceThemeId → Assignment
  const assignmentMap = useMemo(() => {
    const m = new Map<string, SchoolJahresplanAssignment>();
    assignments.forEach((a) => {
      m.set(`${a.sourceType}:${a.sourceThemeId}`, a);
    });
    return m;
  }, [assignments]);

  const activeAssignmentCount = useMemo(
    () => assignments.filter((a) => a.isActive).length,
    [assignments]
  );

  // Filter auf Pool-Einträge anwenden
  const filteredPool = useMemo(() => {
    let list = poolEntries;
    if (zeitraumFilter !== "all") {
      list = list.filter((e) => e.zeitraum === zeitraumFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.thema.toLowerCase().includes(q) ||
          (e.lehrmittel || "").toLowerCase().includes(q) ||
          (e.beschreibung || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [poolEntries, zeitraumFilter, searchQuery]);

  // Gruppierung nach Zeitraum für die Anzeige
  const groupedPool = useMemo(() => {
    const g: Record<string, PoolEntry[]> = {};
    for (const z of ZEITRAEUME) g[z] = [];
    g["(kein Zeitraum)"] = [];
    for (const e of filteredPool) {
      const key = e.zeitraum || "(kein Zeitraum)";
      if (!g[key]) g[key] = [];
      g[key].push(e);
    }
    return g;
  }, [filteredPool]);

  const toggleAssignment = async (entry: PoolEntry, checked: boolean) => {
    if (!user || !selectedSchoolId) return;
    const key = `${entry.sourceType}:${entry.id}`;
    const existing = assignmentMap.get(key);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await user.getIdToken();
      if (checked) {
        // Zuordnen (oder Reaktivieren)
        const res = await fetch("/api/school-jahresplan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            schuleId: selectedSchoolId,
            sourceThemeId: entry.id,
            sourceType: entry.sourceType,
          }),
        });
        if (!res.ok) throw new Error("Zuordnung fehlgeschlagen");
        await loadSchoolData(selectedSchoolId);
      } else if (existing) {
        // Entfernen (Soft-Delete)
        const res = await fetch(`/api/school-jahresplan/${existing.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Entfernen fehlgeschlagen");
        await loadSchoolData(selectedSchoolId);
      }
    } catch (e: any) {
      setError(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = async (newMode: JahresplanMode) => {
    if (!user || !selectedSchoolId) return;
    const confirm =
      newMode === "curated"
        ? window.confirm(
            "Modus auf 'Kuratiert' umstellen?\n\n" +
              "Lehrpersonen sehen ab dann nur noch die von Ihnen zugeordneten Themen. " +
              "Sie können die Zuordnung danach weiter anpassen."
          )
        : window.confirm(
            "Modus auf 'Offen' umstellen?\n\n" +
              "Lehrpersonen sehen dann wieder alle System- und freigegebenen Custom-Themen – " +
              "Ihre Zuordnungen bleiben gespeichert und werden bei erneutem Umschalten wiederverwendet."
          );
    if (!confirm) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/schools/${selectedSchoolId}/jahresplan-mode`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode: newMode }),
        }
      );
      if (!res.ok) throw new Error("Modus konnte nicht geändert werden");
      setMode(newMode);
      setSuccess(
        newMode === "curated"
          ? "Modus: Kuratiert – Lehrpersonen sehen jetzt den schulinternen Jahresplan."
          : "Modus: Offen – Lehrpersonen sehen wieder alle Pool-Themen."
      );
    } catch (e: any) {
      setError(e.message || "Fehler beim Umstellen");
    } finally {
      setSaving(false);
    }
  };

  const handleInitialPopulate = async () => {
    if (!user || !selectedSchoolId) return;
    const confirm = window.confirm(
      "Alle aktuellen System- und freigegebenen Custom-Themen der Schule zuordnen?\n\n" +
        "Bereits aktive Zuordnungen bleiben erhalten, inaktive werden reaktiviert."
    );
    if (!confirm) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/school-jahresplan/initial-populate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schuleId: selectedSchoolId }),
      });
      if (!res.ok) throw new Error("Bulk-Zuordnung fehlgeschlagen");
      const result = await res.json();
      setSuccess(
        `Zuordnungen aktualisiert: ${result.created} neu, ${result.reactivated} reaktiviert, ${result.skipped} bereits aktiv.`
      );
      await loadSchoolData(selectedSchoolId);
    } catch (e: any) {
      setError(e.message || "Fehler beim Befüllen");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (entry: PoolEntry) => {
    const assignment = assignmentMap.get(`${entry.sourceType}:${entry.id}`);
    if (!assignment) return;
    setEditingOriginal(entry);
    setEditingAssignment(assignment);
  };

  const closeEditDialog = () => {
    setEditingOriginal(null);
    setEditingAssignment(null);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Jahresplan-Pool
              </h2>
              <p className="text-muted-foreground mt-2">
                Themen zum schulinternen Jahresplan MIA zuordnen und bearbeiten.
              </p>
            </div>
            {isSuperAdmin && schools.length > 1 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Schule:</Label>
                <Select
                  value={selectedSchoolId || ""}
                  onValueChange={(v) => setSelectedSchoolId(v)}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Schule wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.ort ? ` (${s.ort})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Modus-Karte */}
          <Card>
            <CardHeader>
              <CardTitle>Modus des Jahresplans</CardTitle>
              <CardDescription>
                {mode === "open"
                  ? "Offen – Lehrpersonen sehen alle System- und freigegebenen Custom-Themen (Standard)."
                  : "Kuratiert – Lehrpersonen sehen nur die von Ihnen zugeordneten Themen."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge variant={mode === "curated" ? "default" : "secondary"}>
                Aktueller Modus: {mode === "curated" ? "Kuratiert" : "Offen"}
              </Badge>
              {mode === "open" ? (
                <Button
                  onClick={() => handleModeChange("curated")}
                  disabled={saving || !selectedSchoolId}
                >
                  Auf Kuratiert umstellen
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleModeChange("open")}
                  disabled={saving || !selectedSchoolId}
                >
                  Auf Offen zurücksetzen
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleInitialPopulate}
                disabled={saving || !selectedSchoolId}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Alle Pool-Themen zuordnen
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">
                {activeAssignmentCount} aktive Zuordnungen
              </span>
            </CardContent>
          </Card>

          {/* Filter */}
          <Card>
            <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Thema, Lehrmittel oder Beschreibung suchen..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={zeitraumFilter}
                onValueChange={(v) => setZeitraumFilter(v as Zeitraum | "all")}
              >
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Zeiträume</SelectItem>
                  {ZEITRAEUME.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Pool-Liste */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {ZEITRAEUME.concat(["(kein Zeitraum)" as any]).map((z) => {
                const entries = groupedPool[z] || [];
                if (entries.length === 0) return null;
                return (
                  <Card key={z}>
                    <CardHeader>
                      <CardTitle className="text-lg">{z}</CardTitle>
                      <CardDescription>
                        {entries.length}{" "}
                        {entries.length === 1 ? "Thema" : "Themen"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {entries.map((entry) => {
                        const assignment = assignmentMap.get(
                          `${entry.sourceType}:${entry.id}`
                        );
                        const isAssigned = !!assignment?.isActive;
                        const hasOverride =
                          assignment &&
                          (assignment.themaOverride !== undefined ||
                            assignment.beschreibungOverride !== undefined ||
                            assignment.zeitraumOverride !== undefined ||
                            (assignment.stufeOverride !== undefined &&
                              assignment.stufeOverride.length > 0) ||
                            assignment.lehrmittelOverride !== undefined ||
                            assignment.anzahlLektionenOverride !== undefined ||
                            assignment.fileRougeOverride !== undefined ||
                            assignment.unterlagenOverride !== undefined ||
                            (assignment.empfohleneIntegrationsfaecherOverride !==
                              undefined &&
                              assignment.empfohleneIntegrationsfaecherOverride
                                .length > 0) ||
                            (assignment.schulMaterialien !== undefined &&
                              assignment.schulMaterialien.length > 0) ||
                            (assignment.schulNotizen !== undefined &&
                              assignment.schulNotizen.length > 0));
                        return (
                          <div
                            key={`${entry.sourceType}:${entry.id}`}
                            className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted/40 transition-colors"
                          >
                            <Checkbox
                              checked={isAssigned}
                              disabled={saving}
                              onCheckedChange={(c) => toggleAssignment(entry, c)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-medium truncate">
                                  {assignment?.themaOverride || entry.thema}
                                </span>
                                {entry.isCustom && (
                                  <Badge variant="secondary" className="text-xs">
                                    Eigenes Thema
                                  </Badge>
                                )}
                                {hasOverride && (
                                  <Badge variant="outline" className="text-xs">
                                    Schul-angepasst
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                {entry.lehrmittel && (
                                  <span>📖 {entry.lehrmittel}</span>
                                )}
                                {typeof entry.anzahlLektionen === "number" && (
                                  <span>🕐 {entry.anzahlLektionen} Lektionen</span>
                                )}
                                {entry.schuljahr?.length > 0 && (
                                  <span>
                                    👥{" "}
                                    {(assignment?.stufeOverride &&
                                    assignment.stufeOverride.length > 0
                                      ? assignment.stufeOverride
                                      : entry.schuljahr
                                    ).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isAssigned && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(entry)}
                                title="Schul-Anpassungen bearbeiten"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
              {filteredPool.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Keine Themen gefunden.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Edit Dialog */}
          {editingAssignment && editingOriginal && (
            <AssignmentEditDialog
              original={editingOriginal}
              assignment={editingAssignment}
              onClose={closeEditDialog}
              onSaved={async () => {
                closeEditDialog();
                if (selectedSchoolId) await loadSchoolData(selectedSchoolId);
              }}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/**
 * Dialog zum Bearbeiten von Schul-Overrides und -Ergänzungen
 */
function AssignmentEditDialog({
  original,
  assignment,
  onClose,
  onSaved,
}: {
  original: PoolEntry;
  assignment: SchoolJahresplanAssignment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [thema, setThema] = useState<string>(
    assignment.themaOverride ?? original.thema
  );
  const [beschreibung, setBeschreibung] = useState<string>(
    assignment.beschreibungOverride ?? original.beschreibung ?? ""
  );
  const [lehrmittel, setLehrmittel] = useState<string>(
    assignment.lehrmittelOverride ?? original.lehrmittel ?? ""
  );
  const [anzahlLektionen, setAnzahlLektionen] = useState<string>(
    String(
      assignment.anzahlLektionenOverride ?? original.anzahlLektionen ?? ""
    )
  );
  const [zeitraum, setZeitraum] = useState<Zeitraum | "">(
    assignment.zeitraumOverride ?? original.zeitraum ?? ""
  );
  const [stufen, setStufen] = useState<Stufe[]>(
    assignment.stufeOverride && assignment.stufeOverride.length > 0
      ? assignment.stufeOverride
      : original.schuljahr
  );
  const [fileRouge, setFileRouge] = useState<string>(
    assignment.fileRougeOverride ?? original.fileRouge ?? ""
  );
  const [unterlagen, setUnterlagen] = useState<string>(
    assignment.unterlagenOverride ?? original.unterlagen ?? ""
  );
  const [integrationsfaecher, setIntegrationsfaecher] = useState<Fachbereich[]>(
    assignment.empfohleneIntegrationsfaecherOverride &&
      assignment.empfohleneIntegrationsfaecherOverride.length > 0
      ? assignment.empfohleneIntegrationsfaecherOverride
      : original.empfohleneIntegrationsfaecher || []
  );
  const [schulMaterialien, setSchulMaterialien] = useState<string>(
    (assignment.schulMaterialien || []).join("\n")
  );
  const [schulNotizen, setSchulNotizen] = useState<string>(
    assignment.schulNotizen ?? ""
  );

  const toggleStufe = (s: Stufe) => {
    setStufen((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // Baut das Update-Payload: null = Override entfernen, unchanged = nicht senden
  const buildUpdate = () => {
    const u: Record<string, any> = {};
    const originalThema = original.thema;
    u.themaOverride = thema.trim() === originalThema || thema.trim() === "" ? null : thema.trim();

    const originalBeschreibung = original.beschreibung || "";
    u.beschreibungOverride =
      beschreibung === originalBeschreibung ? null : beschreibung;

    const originalLehrmittel = original.lehrmittel || "";
    u.lehrmittelOverride =
      lehrmittel === originalLehrmittel ? null : lehrmittel;

    const parsedAnzahl = anzahlLektionen.trim() === "" ? null : Number(anzahlLektionen);
    if (parsedAnzahl === null) {
      u.anzahlLektionenOverride = null;
    } else if (!Number.isNaN(parsedAnzahl)) {
      u.anzahlLektionenOverride =
        parsedAnzahl === original.anzahlLektionen ? null : parsedAnzahl;
    }

    u.zeitraumOverride =
      zeitraum === "" || zeitraum === original.zeitraum
        ? null
        : (zeitraum as Zeitraum);

    const sameStufen =
      stufen.length === original.schuljahr.length &&
      stufen.every((s) => original.schuljahr.includes(s));
    u.stufeOverride = sameStufen ? null : stufen;

    const originalFileRouge = original.fileRouge || "";
    const trimmedFileRouge = fileRouge.trim();
    u.fileRougeOverride =
      trimmedFileRouge === "" || trimmedFileRouge === originalFileRouge
        ? null
        : trimmedFileRouge;

    const originalUnterlagen = original.unterlagen || "";
    const trimmedUnterlagen = unterlagen.trim();
    u.unterlagenOverride =
      trimmedUnterlagen === "" || trimmedUnterlagen === originalUnterlagen
        ? null
        : trimmedUnterlagen;

    const originalIntegration = original.empfohleneIntegrationsfaecher || [];
    const sameIntegration =
      integrationsfaecher.length === originalIntegration.length &&
      integrationsfaecher.every((f) => originalIntegration.includes(f));
    u.empfohleneIntegrationsfaecherOverride = sameIntegration
      ? null
      : integrationsfaecher;

    u.schulMaterialien = schulMaterialien
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    u.schulNotizen = schulNotizen;
    return u;
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/school-jahresplan/${assignment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildUpdate()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Fehler");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!user) return;
    if (
      !window.confirm(
        "Alle Schul-Anpassungen für dieses Thema zurücksetzen? Schul-Notizen und Materialien bleiben erhalten."
      )
    )
      return;
    setSaving(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/school-jahresplan/${assignment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          themaOverride: null,
          beschreibungOverride: null,
          lehrmittelOverride: null,
          anzahlLektionenOverride: null,
          zeitraumOverride: null,
          stufeOverride: null,
          fileRougeOverride: null,
          unterlagenOverride: null,
          bildLehrmittelOverride: null,
          empfohleneIntegrationsfaecherOverride: null,
        }),
      });
      if (!res.ok) throw new Error("Zurücksetzen fehlgeschlagen");
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Fehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schul-Anpassungen bearbeiten</DialogTitle>
          <DialogDescription>
            Original: <span className="font-medium">{original.thema}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Titel (Schul-Anpassung)</Label>
            <Input
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              placeholder={original.thema}
            />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder={original.beschreibung || ""}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Lehrmittel</Label>
              <Input
                value={lehrmittel}
                onChange={(e) => setLehrmittel(e.target.value)}
                placeholder={original.lehrmittel || ""}
              />
            </div>
            <div>
              <Label>Anzahl Lektionen</Label>
              <Input
                type="number"
                min={0}
                value={anzahlLektionen}
                onChange={(e) => setAnzahlLektionen(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Zeitraum</Label>
            <Select
              value={zeitraum || original.zeitraum || ""}
              onValueChange={(v) => setZeitraum(v as Zeitraum)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Zeitraum wählen" />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "Sommerferien-Herbstferien",
                    "Herbstferien-Weihnachtsferien",
                    "Weihnachtsferien-Winterferien",
                    "Winterferien-Frühlingsferien",
                    "Frühlingsferien-Sommerferien",
                    "Zusatz",
                  ] as Zeitraum[]
                ).map((z) => (
                  <SelectItem key={z} value={z}>
                    {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stufen</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ALL_STUFEN.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 border rounded px-2 py-1 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={stufen.includes(s)}
                    onCheckedChange={() => toggleStufe(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>File rouge (URL)</Label>
              <Input
                value={fileRouge}
                onChange={(e) => setFileRouge(e.target.value)}
                placeholder={original.fileRouge || "https://..."}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leer = Original behalten. Erscheint im Jahresplan unter Links &amp; Materialien.
              </p>
            </div>
            <div>
              <Label>Unterlagen (URL)</Label>
              <Input
                value={unterlagen}
                onChange={(e) => setUnterlagen(e.target.value)}
                placeholder={original.unterlagen || "https://..."}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leer = Original behalten. Erscheint im Jahresplan unter Links &amp; Materialien.
              </p>
            </div>
          </div>
          <div>
            <Label>Empfohlene Integrationsfächer</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              In welchen Fächern soll dieses Thema in eurer Schule integrativ
              durchgeführt werden? Überschreibt die Empfehlung des Originals.
            </p>
            <IntegrationsfaecherMultiSelect
              value={integrationsfaecher}
              onChange={setIntegrationsfaecher}
            />
          </div>
          <div>
            <Label>Zusätzliche Schul-Materialien (eine pro Zeile)</Label>
            <Textarea
              value={schulMaterialien}
              onChange={(e) => setSchulMaterialien(e.target.value)}
              rows={3}
              placeholder="z.B. Arbeitsblatt_V2.pdf"
            />
          </div>
          <div>
            <Label>Schul-Notizen</Label>
            <Textarea
              value={schulNotizen}
              onChange={(e) => setSchulNotizen(e.target.value)}
              rows={3}
            />
          </div>

          {err && (
            <Alert variant="destructive">
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={resetAll}
            disabled={saving}
            className="text-destructive"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Anpassungen zurücksetzen
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

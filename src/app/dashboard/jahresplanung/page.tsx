"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Copy,
  ChevronRight,
  AlertTriangle,
  Users,
  BarChart3,
  Settings2,
  UserPlus,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  getAktuellesSchuljahr,
  getSchuljahrListe,
  getSchulwochenFuerSchuljahr,
  getLp21FachbereichFarbe,
} from "@/lib/data/lp21-data";
import type { JahresplanEinheit, SchulferienCustom, PlanungsTeam } from "@/types";

// Typ für Planungsperioden (5 Perioden statt 4 Quartale)
interface PlanungsPeriode {
  id: string; // z.B. "q1", "q2a", "q2b", "q3", "q4"
  quartal: number; // Quartal-Nummer (1-4) für API-Filter
  label: string;
  abschnitt?: "a" | "b"; // Für Q2-Teilung
  einheiten: JahresplanEinheit[];
  wochenCount: number;
  ferienWochenCount: number;
}

export default function JahresplanungPage() {
  const { user } = useAuth();
  const [schuljahr, setSchuljahr] = useState(getAktuellesSchuljahr());
  const [einheiten, setEinheiten] = useState<JahresplanEinheit[]>([]);
  const [sharedEinheiten, setSharedEinheiten] = useState<JahresplanEinheit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState("");
  const [copying, setCopying] = useState(false);
  const [showShared, setShowShared] = useState(false);
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);

  // Team-State
  const [teams, setTeams] = useState<PlanungsTeam[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>(""); // "" = eigene Planung
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [managingTeam, setManagingTeam] = useState<PlanungsTeam | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [colleagues, setColleagues] = useState<Array<{ id: string; name: string; email: string; stufe?: string }>>([]);
  const [loadingColleagues, setLoadingColleagues] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [savingMembers, setSavingMembers] = useState(false);

  const schuljahrListe = useMemo(() => getSchuljahrListe(4, 1), []);
  const copySchuljahrListe = useMemo(() => getSchuljahrListe(1, 6), []);
  // Fachbereiche aus LP21 API laden
  const [fachbereiche, setFachbereiche] = useState<
    { code: string; name: string; farbe: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kompetenzen/lp21/struktur")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.fachbereiche?.length > 0) {
          setFachbereiche(
            data.fachbereiche.map((fb: { code: string; name: string }) => ({
              code: fb.code,
              name: fb.name,
              farbe: getLp21FachbereichFarbe(fb.code),
            }))
          );
        }
      })
      .catch((err) => console.error("Error loading Fachbereiche:", err));
    return () => { cancelled = true; };
  }, []);

  // Wochen für das Schuljahr berechnen (mit Custom-Ferien wenn vorhanden)
  const schulwochen = useMemo(() => {
    return getSchulwochenFuerSchuljahr(
      "SO_BeLoSe",
      schuljahr,
      customFerien.length > 0 ? customFerien : undefined
    );
  }, [schuljahr, customFerien]);

  // Teams laden
  const fetchTeams = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/planungsteams?schuljahr=${encodeURIComponent(schuljahr)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  }, [user, schuljahr]);

  // Einheiten und Custom-Ferien laden
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();

        // URL mit optionalem teamId-Parameter
        const einheitenUrl = activeTeamId
          ? `/api/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}&teamId=${activeTeamId}`
          : `/api/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}&includeShared=true`;

        const [einheitenRes, ferienRes] = await Promise.all([
          fetch(einheitenUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        if (einheitenRes.ok) {
          const data = await einheitenRes.json();
          setEinheiten(data.einheiten || []);
          setSharedEinheiten(data.sharedEinheiten || []);
        }

        if (ferienRes.ok) {
          const data = await ferienRes.json();
          setCustomFerien(data.ferien || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, schuljahr, activeTeamId]);

  // Teams laden beim Seitenladen und Schuljahr-Wechsel
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Schuljahr-Start- und Endjahr
  const [startYear, endYear] = useMemo(() => {
    const [s] = schuljahr.split("/").map(Number);
    return [s, s + 1];
  }, [schuljahr]);

  // 5 Planungsperioden (von Ferien zu Ferien)
  const periodenData: PlanungsPeriode[] = useMemo(() => {
    // Q2-Wochen aufteilen: startYear-Wochen = Q2a, endYear-Wochen = Q2b
    const q2Wochen = schulwochen.filter((w) => w.quartal === 2);
    const q2aWochen = q2Wochen.filter((w) => w.jahr === startYear);
    const q2bWochen = q2Wochen.filter((w) => w.jahr === endYear);

    // Einheiten für Q2 aufteilen nach zeitraumStart
    const q2Einheiten = einheiten.filter((e) => e.quartal === 2);
    const q2aEinheiten = q2Einheiten.filter((e) => e.zeitraumStart >= 42);
    const q2bEinheiten = q2Einheiten.filter((e) => e.zeitraumStart < 42);

    return [
      {
        id: "q1",
        quartal: 1,
        label: "Sommer → Herbst",
        einheiten: einheiten.filter((e) => e.quartal === 1),
        wochenCount: schulwochen.filter((w) => w.quartal === 1 && !w.istFerien).length,
        ferienWochenCount: schulwochen.filter((w) => w.quartal === 1 && w.istFerien).length,
      },
      {
        id: "q2a",
        quartal: 2,
        abschnitt: "a" as const,
        label: "Herbst → Weihnachten",
        einheiten: q2aEinheiten,
        wochenCount: q2aWochen.filter((w) => !w.istFerien).length,
        ferienWochenCount: q2aWochen.filter((w) => w.istFerien).length,
      },
      {
        id: "q2b",
        quartal: 2,
        abschnitt: "b" as const,
        label: "Weihnachten → Sport",
        einheiten: q2bEinheiten,
        wochenCount: q2bWochen.filter((w) => !w.istFerien).length,
        ferienWochenCount: q2bWochen.filter((w) => w.istFerien).length,
      },
      {
        id: "q3",
        quartal: 3,
        label: "Sport → Frühling",
        einheiten: einheiten.filter((e) => e.quartal === 3),
        wochenCount: schulwochen.filter((w) => w.quartal === 3 && !w.istFerien).length,
        ferienWochenCount: schulwochen.filter((w) => w.quartal === 3 && w.istFerien).length,
      },
      {
        id: "q4",
        quartal: 4,
        label: "Frühling → Sommer",
        einheiten: einheiten.filter((e) => e.quartal === 4),
        wochenCount: schulwochen.filter((w) => w.quartal === 4 && !w.istFerien).length,
        ferienWochenCount: schulwochen.filter((w) => w.quartal === 4 && w.istFerien).length,
      },
    ];
  }, [einheiten, schulwochen, startYear, endYear]);

  // Fachbereich-Verteilung berechnen
  const fachbereichVerteilung = useMemo(() => {
    const verteilung = new Map<string, number>();
    einheiten.forEach((e) => {
      const current = verteilung.get(e.fachbereichId) || 0;
      verteilung.set(e.fachbereichId, current + 1);
    });

    return Array.from(verteilung.entries())
      .map(([id, count]) => {
        const fb = fachbereiche.find((f) => f.code === id);
        // Fallback auf die Einheit-Daten (z.B. Pseudo-Fachbereich "Spezialwoche")
        const einheitMitFb = einheiten.find((e) => e.fachbereichId === id);
        return {
          id,
          name: fb?.name || einheitMitFb?.fachbereichName || id,
          farbe:
            fb?.farbe ||
            einheitMitFb?.fachbereichFarbe ||
            getLp21FachbereichFarbe(id),
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [einheiten, fachbereiche]);

  // Aktives Team-Objekt
  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeTeamId) || null,
    [teams, activeTeamId]
  );

  // Team erstellen
  const handleCreateTeam = async () => {
    if (!user || !newTeamName.trim()) return;

    try {
      setCreatingTeam(true);
      const token = await user.getIdToken();
      const res = await fetch("/api/planungsteams", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          schuljahr,
        }),
      });

      if (res.ok) {
        setNewTeamName("");
        setShowTeamDialog(false);
        await fetchTeams();
      } else {
        const error = await res.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating team:", error);
    } finally {
      setCreatingTeam(false);
    }
  };

  // Team löschen
  const handleDeleteTeam = async (teamId: string) => {
    if (!user) return;
    if (!confirm("Möchten Sie dieses Planungsteam und alle zugehörigen Einheiten wirklich löschen?")) return;

    try {
      setDeletingTeam(true);
      const token = await user.getIdToken();
      const res = await fetch(`/api/planungsteams/${teamId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        if (activeTeamId === teamId) {
          setActiveTeamId("");
        }
        await fetchTeams();
      } else {
        const error = await res.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting team:", error);
    } finally {
      setDeletingTeam(false);
    }
  };

  // Kolleg:innen laden
  const loadColleagues = async () => {
    if (!user || colleagues.length > 0) return;
    try {
      setLoadingColleagues(true);
      const token = await user.getIdToken();

      const teacherRes = await fetch(`/api/teachers?userId=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!teacherRes.ok) return;
      const teacherData = await teacherRes.json();
      const schuleId = teacherData.schuleId;
      if (!schuleId) return;

      const colleaguesRes = await fetch(`/api/teachers?schuleId=${schuleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (colleaguesRes.ok) {
        const data = await colleaguesRes.json();
        setColleagues(
          (data.teachers || []).filter(
            (t: { id: string }) => t.id !== user.uid
          )
        );
      }
    } catch (error) {
      console.error("Error loading colleagues:", error);
    } finally {
      setLoadingColleagues(false);
    }
  };

  // Mitglieder-Dialog öffnen
  const handleOpenMembersDialog = (team: PlanungsTeam) => {
    setManagingTeam(team);
    setSelectedMembers(
      team.members
        .filter((m) => m.userId !== user?.uid)
        .map((m) => m.userId)
    );
    setShowMembersDialog(true);
    loadColleagues();
  };

  // Mitglieder speichern
  const handleSaveMembers = async () => {
    if (!user || !managingTeam) return;

    try {
      setSavingMembers(true);
      const token = await user.getIdToken();

      // Owner + selected colleagues
      const ownerMember = managingTeam.members.find(
        (m) => m.userId === user.uid
      );
      const members = [
        ownerMember || { userId: user.uid, name: user.displayName || "Ich", role: "owner" },
        ...selectedMembers.map((uid) => {
          const colleague = colleagues.find((c) => c.id === uid);
          return {
            userId: uid,
            name: colleague?.name || uid,
            role: "editor" as const,
          };
        }),
      ];

      const res = await fetch(`/api/planungsteams/${managingTeam.id}/members`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ members }),
      });

      if (res.ok) {
        setShowMembersDialog(false);
        await fetchTeams();
      } else {
        const error = await res.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving members:", error);
    } finally {
      setSavingMembers(false);
    }
  };

  // Jahresplan kopieren
  const handleCopyJahresplan = async () => {
    if (!user || !copyFromYear) return;

    try {
      setCopying(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/jahresplanung/kopieren", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vonSchuljahr: copyFromYear,
          nachSchuljahr: schuljahr,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.count} Einheiten wurden kopiert!`);
        setShowCopyDialog(false);
        // Neu laden
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error copying jahresplan:", error);
      alert("Fehler beim Kopieren des Jahresplans");
    } finally {
      setCopying(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                Jahresplanung
              </h1>
              <p className="text-gray-600 mt-1">
                {activeTeam
                  ? `Team: ${activeTeam.name}`
                  : "Planen Sie Ihren Unterricht über alle Fachbereiche"}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Schuljahr-Auswahl */}
              <Select value={schuljahr} onValueChange={setSchuljahr}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schuljahrListe.map((sj) => (
                    <SelectItem key={sj} value={sj}>
                      {sj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Ferien verwalten */}
              <Link href={`/dashboard/jahresplanung/ferien?schuljahr=${schuljahr}`}>
                <Button variant="outline">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Ferien
                </Button>
              </Link>

              {/* Vorjahr kopieren */}
              <Button
                variant="outline"
                onClick={() => setShowCopyDialog(true)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Schuljahr kopieren
              </Button>

              {/* Neue Einheit */}
              <Link href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}${activeTeamId ? `&teamId=${activeTeamId}` : ""}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Einheit
                </Button>
              </Link>
            </div>
          </div>

          {/* Team-Selector */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-500">Planung:</span>

                {/* Eigene Planung */}
                <Button
                  variant={activeTeamId === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTeamId("")}
                >
                  Meine Planung
                </Button>

                {/* Team-Buttons */}
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-1">
                    <Button
                      variant={activeTeamId === team.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTeamId(team.id)}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      {team.name}
                      <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                        {team.members.length}
                      </Badge>
                    </Button>
                    {team.createdBy === user?.uid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenMembersDialog(team)}
                        title="Mitglieder verwalten"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Team erstellen */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTeamDialog(true)}
                  className="border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Neues Team
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistik-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Einheiten</p>
                    <p className="text-2xl font-bold">{einheiten.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Fachbereiche</p>
                    <p className="text-2xl font-bold">{fachbereichVerteilung.length}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Schulwochen</p>
                    <p className="text-2xl font-bold">
                      {schulwochen.filter((w) => !w.istFerien).length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Von Kolleg:innen</p>
                    <p className="text-2xl font-bold">{sharedEinheiten.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
                {sharedEinheiten.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1"
                    onClick={() => setShowShared(!showShared)}
                  >
                    {showShared ? "Ausblenden" : "Anzeigen"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fachbereich-Verteilung */}
          {fachbereichVerteilung.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  Fachbereich-Verteilung
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {fachbereichVerteilung.map((fb) => (
                    <Badge
                      key={fb.id}
                      style={{
                        backgroundColor: `${fb.farbe}20`,
                        color: fb.farbe,
                        borderColor: fb.farbe,
                      }}
                      variant="outline"
                    >
                      {fb.name}: {fb.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Planungsperioden (5 Kacheln: von Ferien zu Ferien) */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {periodenData.map((periode) => {
                const teamParam = activeTeamId ? `&teamId=${activeTeamId}` : "";
                const href = periode.abschnitt
                  ? `/dashboard/jahresplanung/quartal/${periode.quartal}?schuljahr=${schuljahr}&abschnitt=${periode.abschnitt}${teamParam}`
                  : `/dashboard/jahresplanung/quartal/${periode.quartal}?schuljahr=${schuljahr}${teamParam}`;

                return (
                  <Link key={periode.id} href={href}>
                    <Card className="hover:border-blue-500 hover:shadow-md transition-all cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{periode.label}</span>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          {periode.wochenCount} Schulwochen
                          {periode.ferienWochenCount > 0 && (
                            <span className="text-gray-400">
                              {" "}
                              · {periode.ferienWochenCount} Ferien
                            </span>
                          )}
                        </p>
                      </CardHeader>
                      <CardContent>
                        {periode.einheiten.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">
                            Keine Einheiten
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {periode.einheiten.slice(0, 3).map((einheit) => (
                              <div
                                key={einheit.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      einheit.fachbereichFarbe || "#6b7280",
                                  }}
                                />
                                <span className="truncate">{einheit.titel}</span>
                              </div>
                            ))}
                            {periode.einheiten.length > 3 && (
                              <p className="text-xs text-gray-400">
                                +{periode.einheiten.length - 3} weitere
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Leere State */}
          {!loading && einheiten.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Noch keine Planung vorhanden
                </h3>
                <p className="text-gray-500 mb-4">
                  Beginnen Sie mit Ihrer Jahresplanung für {schuljahr}
                </p>
                <div className="flex justify-center gap-3">
                  <Link href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}${activeTeamId ? `&teamId=${activeTeamId}` : ""}`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Erste Einheit erstellen
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Schuljahr kopieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Geteilte Einheiten */}
          {showShared && sharedEinheiten.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Planungen von Kolleg:innen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sharedEinheiten.map((einheit) => (
                    <div
                      key={einheit.id}
                      className="flex items-center gap-3 p-2 rounded bg-gray-50"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: einheit.fachbereichFarbe || "#6b7280",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{einheit.titel}</p>
                        <p className="text-sm text-gray-500">
                          {einheit.fachbereichName} · KW {einheit.zeitraumStart}–
                          {einheit.zeitraumEnde}
                        </p>
                      </div>
                      <Badge variant="outline">Q{einheit.quartal}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Team erstellen Dialog */}
        <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Planungsteam erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Erstellen Sie ein Team, um mit Kolleg:innen eine gemeinsame
                Jahresplanung zu führen. Sie können danach Mitglieder hinzufügen.
              </p>

              <div>
                <label className="text-sm font-medium">Teamname *</label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="z.B. 5a – Deutsch/NMG"
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTeam();
                    }
                  }}
                />
              </div>

              <p className="text-xs text-gray-400">
                Schuljahr: {schuljahr}
              </p>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTeamDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || creatingTeam}
                >
                  {creatingTeam ? "Erstelle..." : "Team erstellen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mitglieder verwalten Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Mitglieder – {managingTeam?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Wählen Sie Kolleg:innen aus, die in diesem Team mitarbeiten sollen.
                Alle Mitglieder können Einheiten erstellen, bearbeiten und löschen.
              </p>

              {loadingColleagues ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : colleagues.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Keine Kolleg:innen an Ihrer Schule gefunden
                </p>
              ) : (
                <div className="space-y-1">
                  {colleagues.map((colleague) => {
                    const isSelected = selectedMembers.includes(colleague.id);
                    return (
                      <button
                        key={colleague.id}
                        type="button"
                        onClick={() => {
                          setSelectedMembers((prev) =>
                            prev.includes(colleague.id)
                              ? prev.filter((id) => id !== colleague.id)
                              : [...prev, colleague.id]
                          );
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors ${
                          isSelected
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {colleague.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {colleague.stufe || colleague.email}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    setShowMembersDialog(false);
                    if (managingTeam) {
                      handleDeleteTeam(managingTeam.id);
                    }
                  }}
                  disabled={deletingTeam}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Team löschen
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMembersDialog(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveMembers}
                    disabled={savingMembers}
                  >
                    {savingMembers ? "Speichere..." : "Speichern"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Kopieren-Dialog */}
        <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Jahresplan kopieren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Kopieren Sie alle Einheiten aus einem anderen Schuljahr nach{" "}
                <strong>{schuljahr}</strong>.
              </p>

              {einheiten.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Es existieren bereits {einheiten.length} Einheiten für{" "}
                    {schuljahr}. Die neuen Einheiten werden hinzugefügt.
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Von Schuljahr</label>
                <Select value={copyFromYear} onValueChange={setCopyFromYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Schuljahr wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {copySchuljahrListe
                      .filter((sj) => sj !== schuljahr)
                      .map((sj) => (
                        <SelectItem key={sj} value={sj}>
                          {sj}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCopyDialog(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCopyJahresplan}
                  disabled={!copyFromYear || copying}
                >
                  {copying ? "Kopiere..." : "Kopieren"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

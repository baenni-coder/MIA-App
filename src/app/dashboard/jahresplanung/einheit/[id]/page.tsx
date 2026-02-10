"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Trash2, Plus, X } from "lucide-react";
import Link from "next/link";
import KompetenzPicker from "@/components/jahresplanung/KompetenzPicker";
import {
  getAktuellesSchuljahr,
  getAlleFachbereiche,
  getFachbereichById,
} from "@/lib/data/lp21-data";
import type { JahresplanEinheit, BeurteilungsTyp, JahresplanStatus } from "@/types";

// Import der berechneQuartal Funktion aus den Helper-Funktionen
function calculateQuartal(kw: number): number {
  if (kw >= 33 && kw <= 41) return 1;
  if (kw >= 42 && kw <= 52) return 2;
  if (kw >= 1 && kw <= 14) return 3;
  if (kw >= 15 && kw <= 32) return 4;
  return 1;
}

export default function EinheitFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const einheitId = params.id as string;
  const isNew = einheitId === "neu";
  const schuljahr = searchParams.get("schuljahr") || getAktuellesSchuljahr();
  const initialKw = searchParams.get("kw")
    ? parseInt(searchParams.get("kw")!)
    : undefined;
  const initialQuartal = searchParams.get("quartal")
    ? parseInt(searchParams.get("quartal")!)
    : undefined;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Formular-State
  const [titel, setTitel] = useState("");
  const [fachbereichId, setFachbereichId] = useState("");
  const [lernziele, setLernziele] = useState("");
  const [kompetenzenIds, setKompetenzenIds] = useState<string[]>([]);
  const [kompetenzenNamen, setKompetenzenNamen] = useState<string[]>([]);
  const [zeitraumStart, setZeitraumStart] = useState<number>(initialKw || 33);
  const [zeitraumEnde, setZeitraumEnde] = useState<number>(initialKw || 35);
  const [beurteilungstyp, setBeurteilungstyp] = useState<BeurteilungsTyp>("keine");
  const [beurteilungsNotiz, setBeurteilungsNotiz] = useState("");
  const [materialien, setMaterialien] = useState<string[]>([]);
  const [newMaterial, setNewMaterial] = useState("");
  const [istPufferwoche, setIstPufferwoche] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const fachbereiche = useMemo(() => getAlleFachbereiche(), []);

  // Bestehende Einheit laden
  useEffect(() => {
    async function fetchEinheit() {
      if (isNew || !user) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await fetch(`/api/jahresplanung/${einheitId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const einheit = data.einheit as JahresplanEinheit;

          setTitel(einheit.titel);
          setFachbereichId(einheit.fachbereichId);
          setLernziele(einheit.lernziele || "");
          setKompetenzenIds(einheit.kompetenzenIds || []);
          setKompetenzenNamen(einheit.kompetenzenNamen || []);
          setZeitraumStart(einheit.zeitraumStart);
          setZeitraumEnde(einheit.zeitraumEnde);
          setBeurteilungstyp(einheit.beurteilungstyp);
          setBeurteilungsNotiz(einheit.beurteilungsNotiz || "");
          setMaterialien(einheit.materialien || []);
          setIstPufferwoche(einheit.istPufferwoche);
          setIsShared(einheit.isShared);
        } else if (response.status === 404) {
          alert("Einheit nicht gefunden");
          router.push(`/dashboard/jahresplanung?schuljahr=${schuljahr}`);
        }
      } catch (error) {
        console.error("Error fetching einheit:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEinheit();
  }, [einheitId, isNew, user, router, schuljahr]);

  // Speichern
  const handleSave = async () => {
    if (!user || !titel || !fachbereichId) {
      alert("Bitte füllen Sie Titel und Fachbereich aus");
      return;
    }

    if (zeitraumStart > zeitraumEnde) {
      alert("Die Start-Woche muss vor oder gleich der End-Woche sein");
      return;
    }

    try {
      setSaving(true);
      const token = await user.getIdToken();

      const fb = getFachbereichById(fachbereichId);

      const body = {
        schuljahr,
        titel,
        fachbereichId,
        fachbereichName: fb?.name,
        fachbereichFarbe: fb?.farbe,
        lernziele,
        kompetenzenIds,
        kompetenzenNamen,
        zeitraumStart,
        zeitraumEnde,
        beurteilungstyp,
        beurteilungsNotiz,
        materialien,
        istPufferwoche,
        isShared,
        farbe: fb?.farbe,
      };

      const url = isNew
        ? "/api/jahresplanung"
        : `/api/jahresplanung/${einheitId}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const quartal = calculateQuartal(zeitraumStart);
        router.push(
          `/dashboard/jahresplanung/quartal/${quartal}?schuljahr=${schuljahr}`
        );
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving einheit:", error);
      alert("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  // Löschen
  const handleDelete = async () => {
    if (!user || isNew) return;

    if (!confirm("Möchten Sie diese Einheit wirklich löschen?")) return;

    try {
      setDeleting(true);
      const token = await user.getIdToken();

      const response = await fetch(`/api/jahresplanung/${einheitId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        router.push(`/dashboard/jahresplanung?schuljahr=${schuljahr}`);
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting einheit:", error);
      alert("Fehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };

  // Material hinzufügen
  const addMaterial = () => {
    if (newMaterial.trim()) {
      setMaterialien([...materialien, newMaterial.trim()]);
      setNewMaterial("");
    }
  };

  // Material entfernen
  const removeMaterial = (index: number) => {
    setMaterialien(materialien.filter((_, i) => i !== index));
  };

  // Kalenderwochen generieren
  const kwOptions = useMemo(() => {
    const options: number[] = [];
    for (let i = 1; i <= 52; i++) {
      options.push(i);
    }
    return options;
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/jahresplanung?schuljahr=${schuljahr}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">
                {isNew ? "Neue Einheit" : "Einheit bearbeiten"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {!isNew && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Lösche..." : "Löschen"}
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Speichere..." : "Speichern"}
              </Button>
            </div>
          </div>

          {/* Formular */}
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Titel */}
              <div>
                <label className="text-sm font-medium">Titel *</label>
                <Input
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  placeholder="z.B. Märchen lesen und schreiben"
                  className="mt-1"
                />
              </div>

              {/* Fachbereich */}
              <div>
                <label className="text-sm font-medium">Fachbereich *</label>
                <Select value={fachbereichId} onValueChange={setFachbereichId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Fachbereich wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fachbereiche.map((fb) => (
                      <SelectItem key={fb.id} value={fb.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: fb.farbe }}
                          />
                          {fb.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zeitraum */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Von KW *</label>
                  <Select
                    value={zeitraumStart.toString()}
                    onValueChange={(v) => setZeitraumStart(parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kwOptions.map((kw) => (
                        <SelectItem key={kw} value={kw.toString()}>
                          KW {kw}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Bis KW *</label>
                  <Select
                    value={zeitraumEnde.toString()}
                    onValueChange={(v) => setZeitraumEnde(parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kwOptions.map((kw) => (
                        <SelectItem key={kw} value={kw.toString()}>
                          KW {kw}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lernziele */}
              <div>
                <label className="text-sm font-medium">Lernziele</label>
                <Textarea
                  value={lernziele}
                  onChange={(e) => setLernziele(e.target.value)}
                  placeholder="Was sollen die SuS am Ende können?"
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Kompetenzen */}
          <Card>
            <CardHeader>
              <CardTitle>LP21-Kompetenzen</CardTitle>
            </CardHeader>
            <CardContent>
              <KompetenzPicker
                selectedKompetenzen={kompetenzenIds}
                onKompetenzenChange={(ids, namen) => {
                  setKompetenzenIds(ids);
                  setKompetenzenNamen(namen);
                }}
              />
            </CardContent>
          </Card>

          {/* Beurteilung */}
          <Card>
            <CardHeader>
              <CardTitle>Beurteilung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Beurteilungstyp</label>
                <Select
                  value={beurteilungstyp}
                  onValueChange={(v) => setBeurteilungstyp(v as BeurteilungsTyp)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keine">Keine Beurteilung</SelectItem>
                    <SelectItem value="formativ">
                      Formativ (prozessbegleitend)
                    </SelectItem>
                    <SelectItem value="summativ">
                      Summativ (abschließend)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {beurteilungstyp !== "keine" && (
                <div>
                  <label className="text-sm font-medium">
                    Details zur Beurteilung
                  </label>
                  <Textarea
                    value={beurteilungsNotiz}
                    onChange={(e) => setBeurteilungsNotiz(e.target.value)}
                    placeholder="z.B. Lernkontrolle, Präsentation, Portfolio..."
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Materialien */}
          <Card>
            <CardHeader>
              <CardTitle>Materialien & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bestehende Materialien */}
              {materialien.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {materialien.map((material, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <span className="max-w-[200px] truncate">{material}</span>
                      <button
                        type="button"
                        onClick={() => removeMaterial(i)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Neues Material hinzufügen */}
              <div className="flex gap-2">
                <Input
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="Material oder Link hinzufügen..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMaterial();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addMaterial}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weitere Optionen */}
          <Card>
            <CardHeader>
              <CardTitle>Weitere Optionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pufferwoche"
                  checked={istPufferwoche}
                  onCheckedChange={(checked) =>
                    setIstPufferwoche(checked as boolean)
                  }
                />
                <label htmlFor="pufferwoche" className="text-sm">
                  Als Pufferwoche markieren (Vertiefung, Repetition)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="shared"
                  checked={isShared}
                  onCheckedChange={(checked) => setIsShared(checked as boolean)}
                />
                <label htmlFor="shared" className="text-sm">
                  Für Kolleg:innen freigeben (nur Lesezugriff)
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

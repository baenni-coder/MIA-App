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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Trash2, Plus, X, BookOpen, LinkIcon, Circle, Diamond, Paperclip, FileText, Upload, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import KompetenzPicker from "@/components/jahresplanung/KompetenzPicker";
import SchoolFileUpload from "@/components/SchoolFileUpload";
import type { SchoolFile } from "@/types";
import {
  getAktuellesSchuljahr,
  getAlleFachbereiche,
  findFachbereich,
  getQuartalSchema,
} from "@/lib/data/lp21-data";
import type { JahresplanEinheit, BeurteilungsTyp, JahresplanStatus, Thema, Beurteilung } from "@/types";

// Quartal berechnen (von Ferien zu Ferien)
// Q2 erweitert: Herbst→Sport (inkl. Weihnachten→Sport)
function calculateQuartal(kw: number, sportferienEndeKW: number = 7): number {
  if (kw >= 33 && kw <= 41) return 1;
  if (kw >= 42 && kw <= 52) return 2;
  if (kw >= 1 && kw <= sportferienEndeKW) return 2;
  if (kw >= sportferienEndeKW + 1 && kw <= 14) return 3;
  if (kw >= 15 && kw <= 32) return 4;
  return 1;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const initialFachbereichId = searchParams.get("fachbereichId") || "";
  const teamId = searchParams.get("teamId") || "";

  // Erste KW des Quartals als Default ermitteln
  const quartalStartKw = useMemo(() => {
    if (initialKw) return initialKw;
    if (!initialQuartal) return 33;
    const schema = getQuartalSchema();
    const q = schema.find((s) => s.quartal === initialQuartal);
    if (!q?.typischeWochen) return 33;
    const match = q.typischeWochen.match(/KW\s*(\d+)/);
    return match ? parseInt(match[1]) : 33;
  }, [initialKw, initialQuartal]);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Formular-State
  const [titel, setTitel] = useState("");
  const [fachbereichId, setFachbereichId] = useState(initialFachbereichId);
  const [lernziele, setLernziele] = useState("");
  const [kompetenzenIds, setKompetenzenIds] = useState<string[]>([]);
  const [kompetenzenNamen, setKompetenzenNamen] = useState<string[]>([]);
  const [zeitraumStart, setZeitraumStart] = useState<number>(quartalStartKw);
  const [zeitraumEnde, setZeitraumEnde] = useState<number>(quartalStartKw + 2);
  const [beurteilungen, setBeurteilungen] = useState<Beurteilung[]>([]);
  const [materialien, setMaterialien] = useState<string[]>([]);
  const [newMaterial, setNewMaterial] = useState("");
  const [istPufferwoche, setIstPufferwoche] = useState(false);
  const [einheitTeamId, setEinheitTeamId] = useState<string>("");

  // MIA-Thema Verknüpfung
  const [linkedMiaThemeId, setLinkedMiaThemeId] = useState<string>("");
  const [linkedMiaThemeName, setLinkedMiaThemeName] = useState<string>("");
  const [miaThemen, setMiaThemen] = useState<Thema[]>([]);
  const [loadingMiaThemen, setLoadingMiaThemen] = useState(false);

  // Schul-Dateien Verknüpfung
  const [linkedFileIds, setLinkedFileIds] = useState<string[]>([]);
  const [linkedFileNames, setLinkedFileNames] = useState<string[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<Array<{ id: string; name: string; contentType: string; size: number; uploadedByName: string; storageUrl: string }>>([]);
  const [filePickerTab, setFilePickerTab] = useState<"browse" | "upload">("browse");
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Fachbereiche aus statischer JSON-Datei (statt API - zuverlässiger und schneller)
  const fachbereiche = useMemo(() => {
    return getAlleFachbereiche().map((fb) => ({
      code: fb.id,
      name: fb.name,
      farbe: fb.farbe,
      kuerzel: fb.fachbereichKuerzel,
    }));
  }, []);
  const loadingFachbereiche = false;

  // MIA-Themen laden wenn Fachbereich = MI oder IB
  useEffect(() => {
    async function fetchMiaThemen() {
      if (fachbereichId !== "MI" && fachbereichId !== "IB") {
        setMiaThemen([]);
        return;
      }

      try {
        setLoadingMiaThemen(true);
        const response = await fetch("/api/themen?grouped=true");
        if (response.ok) {
          const data = await response.json();
          // Alle Themen aus allen Zeiträumen sammeln
          const alleThemen: Thema[] = [];
          for (const zeitraum of Object.values(data)) {
            if (Array.isArray(zeitraum)) {
              alleThemen.push(...(zeitraum as Thema[]));
            }
          }
          // Duplikate entfernen (nach ID) und sortieren
          const unique = alleThemen.filter(
            (t, i, arr) => arr.findIndex((a) => a.id === t.id) === i
          );
          unique.sort((a, b) => a.thema.localeCompare(b.thema, "de"));
          setMiaThemen(unique);
        }
      } catch (error) {
        console.error("Error fetching MIA themen:", error);
      } finally {
        setLoadingMiaThemen(false);
      }
    }

    fetchMiaThemen();
  }, [fachbereichId]);

  // MIA-Thema auswählen und Felder vorbefüllen
  const handleMiaThemeSelect = (themeId: string) => {
    if (!themeId || themeId === "none") {
      setLinkedMiaThemeId("");
      setLinkedMiaThemeName("");
      return;
    }

    const theme = miaThemen.find((t) => t.id === themeId);
    if (!theme) return;

    setLinkedMiaThemeId(theme.id);
    setLinkedMiaThemeName(theme.thema);

    // Felder vorbefüllen (nur wenn noch leer)
    if (!titel) {
      setTitel(theme.thema);
    }
    if (!lernziele && theme.beschreibung) {
      setLernziele(theme.beschreibung);
    }

    // Kompetenzen aus dem MIA-Thema übernehmen
    if (theme.kompetenzen && theme.kompetenzen.length > 0) {
      const ids = theme.kompetenzen.map((k) => k.id);
      const namen = theme.kompetenzen.map(
        (k) => k.lpCode || k.name || k.id
      );
      setKompetenzenIds(ids);
      setKompetenzenNamen(namen);
    }

    // Materialien aus Unterlagen-Link
    if (theme.unterlagen && materialien.length === 0) {
      setMaterialien([theme.unterlagen]);
    }
  };

  // Schul-Dateien laden
  const fetchAvailableFiles = async () => {
    if (!user) return;
    try {
      setLoadingFiles(true);
      const token = await user.getIdToken();
      const response = await fetch("/api/school-files", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableFiles(
          (data.files || []).map((f: SchoolFile) => ({
            id: f.id,
            name: f.name,
            contentType: f.contentType,
            size: f.size,
            uploadedByName: f.uploadedByName,
            storageUrl: f.storageUrl,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching school files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Datei verknüpfen / entfernen
  const toggleFileLink = (fileId: string, fileName: string) => {
    if (linkedFileIds.includes(fileId)) {
      const idx = linkedFileIds.indexOf(fileId);
      setLinkedFileIds(linkedFileIds.filter((_, i) => i !== idx));
      setLinkedFileNames(linkedFileNames.filter((_, i) => i !== idx));
    } else {
      setLinkedFileIds([...linkedFileIds, fileId]);
      setLinkedFileNames([...linkedFileNames, fileName]);
    }
  };

  const removeLinkedFile = (index: number) => {
    setLinkedFileIds(linkedFileIds.filter((_, i) => i !== index));
    setLinkedFileNames(linkedFileNames.filter((_, i) => i !== index));
  };

  // Datei-Upload abgeschlossen
  const handleFileUploadComplete = (file: SchoolFile) => {
    // Datei direkt verknüpfen
    setLinkedFileIds([...linkedFileIds, file.id]);
    setLinkedFileNames([...linkedFileNames, file.name]);
    // Auch zur Liste verfügbarer Dateien hinzufügen
    setAvailableFiles([
      ...availableFiles,
      {
        id: file.id,
        name: file.name,
        contentType: file.contentType,
        size: file.size,
        uploadedByName: file.uploadedByName,
        storageUrl: file.storageUrl,
      },
    ]);
    setShowFilePicker(false);
  };

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
          // Normalize fachbereichId: API codes (FS1F, FS2E) → static JSON ids (FS1, FS2)
          const fbMatch = findFachbereich(einheit.fachbereichId);
          setFachbereichId(fbMatch?.id || einheit.fachbereichId);
          setLernziele(einheit.lernziele || "");
          setKompetenzenIds(einheit.kompetenzenIds || []);
          setKompetenzenNamen(einheit.kompetenzenNamen || []);
          setZeitraumStart(einheit.zeitraumStart);
          setZeitraumEnde(einheit.zeitraumEnde);
          setBeurteilungen(einheit.beurteilungen || []);
          setMaterialien(einheit.materialien || []);
          setIstPufferwoche(einheit.istPufferwoche);
          setEinheitTeamId(einheit.teamId || "");
          if (einheit.linkedMiaThemeId) {
            setLinkedMiaThemeId(einheit.linkedMiaThemeId);
            setLinkedMiaThemeName(einheit.linkedMiaThemeName || "");
          }
          if (einheit.linkedFileIds) {
            setLinkedFileIds(einheit.linkedFileIds);
            setLinkedFileNames(einheit.linkedFileNames || []);
          }
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

      const fb = fachbereiche.find((f) => f.code === fachbereichId);

      const body: Record<string, unknown> = {
        schuljahr,
        titel,
        fachbereichId,
        fachbereichName: fb?.name || fachbereichId,
        fachbereichFarbe: fb?.farbe || fb?.farbe || "#6b7280",
        lernziele,
        kompetenzenIds,
        kompetenzenNamen,
        zeitraumStart,
        zeitraumEnde,
        beurteilungen,
        beurteilungstyp: beurteilungen.length > 0 ? beurteilungen[0].typ : "keine",
        beurteilungsNotiz: beurteilungen.length > 0 ? beurteilungen[0].notiz : "",
        materialien,
        istPufferwoche,
        farbe: fb?.farbe || fb?.farbe || "#6b7280",
      };

      // TeamId nur bei neuen Einheiten setzen
      if (isNew && teamId) {
        body.teamId = teamId;
      }

      // MIA-Thema Verknüpfung hinzufügen (auch leerer String zum Entfernen)
      if ((fachbereichId === "MI" || fachbereichId === "IB")) {
        body.linkedMiaThemeId = linkedMiaThemeId || null;
        body.linkedMiaThemeName = linkedMiaThemeName || null;
      } else {
        body.linkedMiaThemeId = null;
        body.linkedMiaThemeName = null;
      }

      // Schul-Dateien Verknüpfung
      body.linkedFileIds = linkedFileIds;
      body.linkedFileNames = linkedFileNames;

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
                {loadingFachbereiche ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-gray-500 mt-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    Fachbereiche werden geladen...
                  </div>
                ) : (
                  <Select value={fachbereichId} onValueChange={setFachbereichId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Fachbereich wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fachbereiche.map((fb) => (
                        <SelectItem key={fb.code} value={fb.code}>
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
                )}
              </div>

              {/* MIA-Thema Verknüpfung (nur bei Informatische Bildung) */}
              {(fachbereichId === "MI" || fachbereichId === "IB") && (
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    MIA-Thema als Vorlage
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5 mb-1">
                    Wählen Sie ein bestehendes MIA-Thema, um Titel, Beschreibung und Kompetenzen zu übernehmen.
                  </p>
                  {loadingMiaThemen ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                      Themen werden geladen...
                    </div>
                  ) : (
                    <Select
                      value={linkedMiaThemeId}
                      onValueChange={handleMiaThemeSelect}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="MIA-Thema auswählen (optional)..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Kein Thema verknüpfen
                        </SelectItem>
                        {miaThemen.map((thema) => (
                          <SelectItem key={thema.id} value={thema.id}>
                            <div className="flex items-center gap-2">
                              <span className="truncate">{thema.thema}</span>
                              {thema.lehrmittel && (
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  ({thema.lehrmittel})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {linkedMiaThemeId && linkedMiaThemeName && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-indigo-600">
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>Verknüpft mit: {linkedMiaThemeName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkedMiaThemeId("");
                          setLinkedMiaThemeName("");
                        }}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                defaultFachbereich={fachbereichId}
              />
            </CardContent>
          </Card>

          {/* Beurteilungen */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Beurteilungen</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBeurteilungen([
                      ...beurteilungen,
                      {
                        typ: "formativ",
                        kalenderwoche: zeitraumEnde,
                        notiz: "",
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Beurteilung
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {beurteilungen.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Noch keine Beurteilung geplant
                </p>
              ) : (
                beurteilungen.map((b, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 space-y-3 relative"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setBeurteilungen(beurteilungen.filter((_, i) => i !== idx))
                      }
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Typ</label>
                        <Select
                          value={b.typ}
                          onValueChange={(v) => {
                            const updated = [...beurteilungen];
                            updated[idx] = { ...updated[idx], typ: v as "formativ" | "summativ" };
                            setBeurteilungen(updated);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="formativ">
                              Formativ (prozessbegleitend)
                            </SelectItem>
                            <SelectItem value="summativ">
                              Summativ (abschliessend)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Kalenderwoche
                        </label>
                        <Select
                          value={b.kalenderwoche.toString()}
                          onValueChange={(v) => {
                            const updated = [...beurteilungen];
                            updated[idx] = { ...updated[idx], kalenderwoche: parseInt(v) };
                            setBeurteilungen(updated);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              { length: zeitraumEnde - zeitraumStart + 1 },
                              (_, i) => zeitraumStart + i
                            ).map((kwOpt) => (
                              <SelectItem key={kwOpt} value={kwOpt.toString()}>
                                KW {kwOpt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">
                        Details
                      </label>
                      <Textarea
                        value={b.notiz}
                        onChange={(e) => {
                          const updated = [...beurteilungen];
                          updated[idx] = { ...updated[idx], notiz: e.target.value };
                          setBeurteilungen(updated);
                        }}
                        placeholder="z.B. Lernkontrolle, Präsentation, Portfolio..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {b.typ === "formativ" ? (
                        <Badge variant="outline" className="text-xs">
                          <Circle className="h-3 w-3 fill-blue-500 text-blue-500 mr-1" />
                          Formativ · KW {b.kalenderwoche}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Diamond className="h-3 w-3 fill-orange-500 text-orange-500 mr-1" />
                          Summativ · KW {b.kalenderwoche}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
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

          {/* Schul-Dateien */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Schul-Dateien
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilePickerTab("browse");
                    fetchAvailableFiles();
                    setShowFilePicker(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Datei verknüpfen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {linkedFileIds.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Keine Dateien verknüpft
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {linkedFileNames.map((name, i) => (
                    <Badge
                      key={linkedFileIds[i]}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="max-w-[200px] truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeLinkedFile(i)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schul-Dateien Dialog */}
          <Dialog open={showFilePicker} onOpenChange={setShowFilePicker}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schul-Dateien verknüpfen</DialogTitle>
              </DialogHeader>

              {/* Tab-Buttons */}
              <div className="flex gap-2 border-b pb-2">
                <Button
                  type="button"
                  variant={filePickerTab === "browse" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilePickerTab("browse")}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Vorhandene Dateien
                </Button>
                <Button
                  type="button"
                  variant={filePickerTab === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilePickerTab("upload")}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Neue Datei hochladen
                </Button>
              </div>

              {filePickerTab === "browse" ? (
                <div className="space-y-2">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  ) : availableFiles.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>Keine Schul-Dateien vorhanden.</p>
                      <p className="mt-1">
                        Laden Sie zuerst eine Datei hoch oder erstellen Sie eine unter{" "}
                        <Link href="/dashboard/dateien" className="text-blue-600 underline">
                          Schul-Dateien
                        </Link>.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">
                        Wählen Sie Dateien aus, die mit dieser Einheit verknüpft werden sollen.
                      </p>
                      {availableFiles.map((file) => {
                        const isLinked = linkedFileIds.includes(file.id);
                        return (
                          <div
                            key={file.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isLinked
                                ? "bg-blue-50 border-blue-200"
                                : "hover:bg-gray-50 border-gray-200"
                            }`}
                            onClick={() => toggleFileLink(file.id, file.name)}
                          >
                            <Checkbox
                              checked={isLinked}
                              onCheckedChange={() => toggleFileLink(file.id, file.name)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {file.uploadedByName} · {formatFileSize(file.size)}
                              </p>
                            </div>
                            {file.storageUrl && (
                              <a
                                href={file.storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-400 hover:text-blue-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => setShowFilePicker(false)}
                    >
                      Fertig
                    </Button>
                  </div>
                </div>
              ) : (
                <SchoolFileUpload
                  onUploadComplete={handleFileUploadComplete}
                  onCancel={() => setFilePickerTab("browse")}
                />
              )}
            </DialogContent>
          </Dialog>

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

              {/* Team-Info */}
              {(teamId || einheitTeamId) && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <Users className="h-4 w-4" />
                  <span>Diese Einheit gehört zu einem Planungsteam</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

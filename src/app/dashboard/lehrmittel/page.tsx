"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Thema, JahresplanEinheit, Lehrmittel } from "@/types";
import {
  BookOpen,
  FileText,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Upload,
  Loader2,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

// Feste Thumbnail-Mappings (überschreiben Register-/Themen-Bilder)
const LEHRMITTEL_THUMBNAILS: Record<string, string> = {
  "PICTS BeLoSe": "/PICTS_Graffiti.png",
};

const normalizeKey = (name: string) => name.trim().toLowerCase();

interface LehrmittelGroup {
  key: string;
  displayName: string;
  bildUrl?: string;
  themen: Thema[];
  einheiten: JahresplanEinheit[];
  register?: Lehrmittel;
}

export default function LehrmittelPage() {
  const { user, userProfile, isAdmin } = useAuth();
  const [register, setRegister] = useState<Lehrmittel[]>([]);
  const [allThemen, setAllThemen] = useState<Thema[]>([]);
  const [einheiten, setEinheiten] = useState<JahresplanEinheit[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog-State
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBeschreibung, setFormBeschreibung] = useState("");
  const [formBildUrl, setFormBildUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const schuleId = (userProfile as { schuleId?: string } | null)?.schuleId;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const authHeaders = { Authorization: `Bearer ${token}` };

      const themenUrl = schuleId
        ? `/api/themen?includeCustom=true&curated=true&schuleId=${encodeURIComponent(
            schuleId
          )}`
        : `/api/themen?includeCustom=true`;

      const [regRes, themenRes, einheitenRes] = await Promise.all([
        fetch("/api/lehrmittel", { headers: authHeaders }),
        fetch(themenUrl),
        fetch("/api/jahresplanung", { headers: authHeaders }),
      ]);

      if (regRes.ok) {
        const d = await regRes.json();
        setRegister(d.lehrmittel || []);
      }
      if (themenRes.ok) {
        const d = await themenRes.json();
        setAllThemen(Array.isArray(d) ? d : []);
      }
      if (einheitenRes.ok) {
        const d = await einheitenRes.json();
        setEinheiten(d.einheiten || []);
      }
    } catch (err) {
      console.error("Error loading lehrmittel data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, schuleId]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Gruppierung nach normalisiertem Namen
  const groups: LehrmittelGroup[] = (() => {
    const map = new Map<string, LehrmittelGroup>();

    const ensure = (name: string): LehrmittelGroup => {
      const key = normalizeKey(name);
      let g = map.get(key);
      if (!g) {
        g = { key, displayName: name, themen: [], einheiten: [] };
        map.set(key, g);
      }
      return g;
    };

    // Register zuerst (liefert kanonischen Namen + Bild + Meta)
    register.forEach((l) => {
      const g = ensure(l.name);
      g.displayName = l.name;
      g.register = l;
      if (l.bildUrl) g.bildUrl = l.bildUrl;
    });

    allThemen.forEach((t) => {
      if (!t.lehrmittel) return;
      const g = ensure(t.lehrmittel);
      g.themen.push(t);
    });

    einheiten.forEach((e) => {
      if (!e.lehrmittel) return;
      const g = ensure(e.lehrmittel);
      g.einheiten.push(e);
    });

    // Bild-Fallbacks + Sortierung
    const arr = Array.from(map.values());
    arr.forEach((g) => {
      if (!g.bildUrl) {
        g.bildUrl =
          LEHRMITTEL_THUMBNAILS[g.displayName] ||
          g.themen.find((t) => t.bildLehrmittel)?.bildLehrmittel;
      }
    });
    return arr.sort((a, b) => a.displayName.localeCompare(b.displayName));
  })();

  // Dialog öffnen (neu / bearbeiten)
  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormBeschreibung("");
    setFormBildUrl("");
    setShowDialog(true);
  };
  const openEdit = (l: Lehrmittel) => {
    setEditingId(l.id);
    setFormName(l.name);
    setFormBeschreibung(l.beschreibung || "");
    setFormBildUrl(l.bildUrl || "");
    setShowDialog(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    try {
      setUploadingImage(true);
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("compress", "true");
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const d = await res.json();
        setFormBildUrl(d.imageUrl);
      } else {
        const d = await res.json().catch(() => ({}));
        alert("Bild-Upload fehlgeschlagen: " + (d.error || res.status));
      }
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Bild-Upload fehlgeschlagen.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) {
      alert("Bitte einen Namen eingeben.");
      return;
    }
    try {
      setSaving(true);
      const token = await user.getIdToken();
      const body = {
        name: formName.trim(),
        beschreibung: formBeschreibung || undefined,
        bildUrl: formBildUrl || undefined,
      };
      const res = await fetch(
        editingId ? `/api/lehrmittel/${editingId}` : "/api/lehrmittel",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Fehler beim Speichern");
      }
      setShowDialog(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (l: Lehrmittel) => {
    if (!user) return;
    if (!confirm(`Lehrmittel „${l.name}" wirklich löschen?`)) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/lehrmittel/${l.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Fehler beim Löschen");
      }
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleToggleSystemWide = async (l: Lehrmittel) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/lehrmittel/${l.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isSystemWide: !l.isSystemWide }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Fehler beim Ändern der Freigabe");
      }
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Lehrmittel-Übersicht
              </h2>
              <p className="text-muted-foreground mt-2">
                Lehrmittel erfassen und zugehörige Themen sowie Ihre Einheiten
                sammeln
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Lehrmittel hinzufügen
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">
                  Lehrmittel werden geladen...
                </p>
              </div>
            </div>
          ) : groups.length > 0 ? (
            <Accordion type="multiple" className="space-y-4">
              {groups.map((g) => {
                const reg = g.register;
                const isOwn = reg && reg.createdBy === user?.uid;
                const canManage = reg && (isOwn || isAdmin);
                return (
                  <AccordionItem
                    key={g.key}
                    value={g.key}
                    className="border rounded-lg bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-4 w-full">
                        {g.bildUrl ? (
                          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                            <img
                              src={g.bildUrl}
                              alt={g.displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const parent = e.currentTarget
                                  .parentElement as HTMLElement;
                                parent.className =
                                  "w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0";
                                parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="text-left flex-1 min-w-0">
                          <div className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                            {g.displayName}
                            {reg &&
                              (reg.isSystemWide ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-green-300 text-green-700"
                                >
                                  Systemweit
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-blue-300 text-blue-700"
                                >
                                  Schulweit
                                </Badge>
                              ))}
                            {isOwn && (
                              <Badge variant="secondary" className="text-xs">
                                Eigenes
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {g.themen.length}{" "}
                            {g.themen.length === 1 ? "Thema" : "Themen"} ·{" "}
                            {g.einheiten.length}{" "}
                            {g.einheiten.length === 1 ? "Einheit" : "Einheiten"}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Verwaltungs-Aktionen für Register-Einträge */}
                      {canManage && (
                        <div className="flex flex-wrap gap-2 pb-3 mb-3 border-b">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(reg!)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Bearbeiten
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleSystemWide(reg!)}
                            >
                              <Globe className="h-3.5 w-3.5 mr-1" />
                              {reg!.isSystemWide
                                ? "Freigabe zurücknehmen"
                                : "Systemweit freigeben"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(reg!)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Löschen
                          </Button>
                        </div>
                      )}

                      {reg?.beschreibung && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {reg.beschreibung}
                        </p>
                      )}

                      {g.themen.length === 0 && g.einheiten.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          Noch keine Themen oder Einheiten zugeordnet.
                        </p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {[...g.themen]
                            .sort((a, b) => a.thema.localeCompare(b.thema))
                            .map((thema) => (
                              <div
                                key={`t-${thema.id}`}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/dashboard/jahresplan?search=${encodeURIComponent(
                                      thema.thema
                                    )}&allStufen=true`}
                                    className="font-medium text-primary hover:underline flex items-center gap-1"
                                  >
                                    {thema.thema}
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                  {thema.beschreibung && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {thema.beschreibung}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {thema.schuljahr.slice(0, 4).map((stufe) => (
                                      <Badge
                                        key={stufe}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {stufe}
                                      </Badge>
                                    ))}
                                    {thema.schuljahr.length > 4 && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        +{thema.schuljahr.length - 4}
                                      </Badge>
                                    )}
                                    {thema.anzahlLektionen && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {thema.anzahlLektionen} Lektionen
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                          {[...g.einheiten]
                            .sort((a, b) => a.titel.localeCompare(b.titel))
                            .map((einheit) => (
                              <div
                                key={`e-${einheit.id}`}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <CalendarDays className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <Link
                                    href={`/dashboard/jahresplanung/einheit/${einheit.id}`}
                                    className="font-medium text-primary hover:underline flex items-center gap-1"
                                  >
                                    {einheit.titel}
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      Einheit
                                    </Badge>
                                    {einheit.fachbereichName && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {einheit.fachbereichName}
                                      </Badge>
                                    )}
                                    {einheit.schuljahr && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {einheit.schuljahr}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Noch keine Lehrmittel erfasst. Fügen Sie oben ein Lehrmittel
                hinzu.
              </p>
            </div>
          )}
        </div>

        {/* Dialog: Lehrmittel hinzufügen/bearbeiten */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Lehrmittel bearbeiten" : "Lehrmittel hinzufügen"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="lm-name">Name *</Label>
                <Input
                  id="lm-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="z.B. Medienkompass 1"
                />
              </div>
              <div>
                <Label htmlFor="lm-desc">Beschreibung</Label>
                <Textarea
                  id="lm-desc"
                  value={formBeschreibung}
                  onChange={(e) => setFormBeschreibung(e.target.value)}
                  placeholder="Optionale Beschreibung"
                  rows={3}
                />
              </div>
              <div>
                <Label>Bild</Label>
                <div className="mt-2 flex items-center gap-3">
                  {formBildUrl ? (
                    <img
                      src={formBildUrl}
                      alt="Lehrmittel"
                      className="w-20 h-20 object-cover rounded-md border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-md border bg-muted flex items-center justify-center">
                      <BookOpen className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      id="lm-image"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() =>
                        document.getElementById("lm-image")?.click()
                      }
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Bild wählen
                    </Button>
                    {formBildUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-red-600"
                        onClick={() => setFormBildUrl("")}
                      >
                        Entfernen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={saving}
              >
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving || uploadingImage}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

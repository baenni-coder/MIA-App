"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Lektionsplanung,
  CustomLektion,
  SchoolLektionOverride,
  SchoolJahresplanSourceType,
} from "@/types";

type RowMode = "original" | "eigene" | "hidden";

interface EditableFields {
  lektion: string;
  aufgaben: string;
  vorwissen: string;
  einstieg: string;
  hauptteil: string;
  abschluss: string;
  stolpersteine: string;
  material: string; // eine pro Zeile
}

interface Row extends EditableFields {
  key: string;
  isNew: boolean; // rein schuleigene Lektion (kein Original)
  originalLektionId?: string;
  originalLektionKey?: string;
  overrideId?: string; // bestehendes Override-Doc
  mode: RowMode; // nur relevant für Original-verknüpfte Zeilen
  // Original-Inhalt (read-only, für Anzeige/Prefill)
  original?: EditableFields;
}

const EMPTY_FIELDS: EditableFields = {
  lektion: "",
  aufgaben: "",
  vorwissen: "",
  einstieg: "",
  hauptteil: "",
  abschluss: "",
  stolpersteine: "",
  material: "",
};

function fieldsFromSystem(l: Lektionsplanung): EditableFields {
  return {
    lektion: typeof l.lektion === "string" ? l.lektion : "",
    aufgaben: typeof l.aufgaben === "string" ? l.aufgaben : "",
    vorwissen: typeof l.vorwissen === "string" ? l.vorwissen : "",
    einstieg: typeof l.einstieg === "string" ? l.einstieg : "",
    hauptteil: typeof l.hauptteil === "string" ? l.hauptteil : "",
    abschluss: typeof l.abschluss === "string" ? l.abschluss : "",
    stolpersteine: typeof l.stolpersteine === "string" ? l.stolpersteine : "",
    material: Array.isArray(l.material) ? l.material.join("\n") : "",
  };
}

function fieldsFromCustom(l: CustomLektion): EditableFields {
  return {
    lektion: l.lektion || "",
    aufgaben: l.aufgaben || "",
    vorwissen: l.vorwissen || "",
    einstieg: l.einstieg || "",
    hauptteil: l.hauptteil || "",
    abschluss: l.abschluss || "",
    stolpersteine: l.stolpersteine || "",
    material: Array.isArray(l.material) ? l.material.join("\n") : "",
  };
}

function fieldsFromOverride(o: SchoolLektionOverride): EditableFields {
  return {
    lektion: o.lektion || "",
    aufgaben: o.aufgaben || "",
    vorwissen: o.vorwissen || "",
    einstieg: o.einstieg || "",
    hauptteil: o.hauptteil || "",
    abschluss: o.abschluss || "",
    stolpersteine: o.stolpersteine || "",
    material: Array.isArray(o.material) ? o.material.join("\n") : "",
  };
}

interface SchoolLektionenEditorProps {
  schuleId: string;
  sourceType: SchoolJahresplanSourceType;
  sourceThemeId: string;
  themaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SchoolLektionenEditor({
  schuleId,
  sourceType,
  sourceThemeId,
  themaName,
  open,
  onOpenChange,
}: SchoolLektionenEditorProps) {
  const { user, getAuthToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  // IDs von Overrides, die beim Speichern gelöscht werden müssen (entfernte neue Lektionen)
  const [deletedOverrideIds, setDeletedOverrideIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDeletedOverrideIds([]);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Kein Auth-Token verfügbar");

      // Original-Lektionen laden
      let originals: Array<{ id: string; key: string; fields: EditableFields }> =
        [];
      if (sourceType === "system") {
        const res = await fetch(
          `/api/lektionsplanung?thema=${encodeURIComponent(themaName)}`
        );
        if (res.ok) {
          const data = await res.json();
          originals = (data.lektionen || []).map((l: Lektionsplanung) => ({
            id: l.id,
            key: l.eindeutigeBezeichnung || l.id,
            fields: fieldsFromSystem(l),
          }));
        }
      } else {
        const res = await fetch(
          `/api/custom-lektionen?themeId=${encodeURIComponent(sourceThemeId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          originals = (data.lektionen || []).map((l: CustomLektion) => ({
            id: l.id,
            key: l.eindeutigeBezeichnung || l.id,
            fields: fieldsFromCustom(l),
          }));
        }
      }

      // Bestehende Overrides laden
      const ovRes = await fetch(
        `/api/school-lektionen?schuleId=${encodeURIComponent(
          schuleId
        )}&sourceType=${sourceType}&sourceThemeId=${encodeURIComponent(
          sourceThemeId
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const overrides: SchoolLektionOverride[] = ovRes.ok
        ? (await ovRes.json()).overrides || []
        : [];

      const overrideByOriginal = new Map<string, SchoolLektionOverride>();
      const newOverrides: SchoolLektionOverride[] = [];
      overrides.forEach((o) => {
        if (o.originalLektionId) overrideByOriginal.set(o.originalLektionId, o);
        else newOverrides.push(o);
      });

      // Zeilen für Original-Lektionen bauen
      const originalRows: Row[] = originals.map((orig) => {
        const ov = overrideByOriginal.get(orig.id);
        let mode: RowMode = "original";
        let fields = orig.fields;
        if (ov) {
          if (ov.isHidden) mode = "hidden";
          else if (!ov.useOriginal) {
            mode = "eigene";
            fields = fieldsFromOverride(ov);
          }
        }
        return {
          key: `orig:${orig.id}`,
          isNew: false,
          originalLektionId: orig.id,
          originalLektionKey: orig.key,
          overrideId: ov?.id,
          mode,
          original: orig.fields,
          ...fields,
        };
      });

      // Zeilen für rein schuleigene Lektionen
      const newRows: Row[] = newOverrides
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((o, i) => ({
          key: `new:${o.id}`,
          isNew: true,
          overrideId: o.id,
          mode: "eigene" as RowMode,
          ...fieldsFromOverride(o),
          lektion: o.lektion || `Lektion ${originalRows.length + i + 1}`,
        }));

      setRows([...originalRows, ...newRows]);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [open, getAuthToken, sourceType, sourceThemeId, themaName, schuleId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };

  const setMode = (key: string, mode: RowMode) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        // Beim Wechsel auf "eigene" die Felder mit dem Original vorbefüllen,
        // falls noch leer (bequemer Ausgangspunkt zum Anpassen).
        if (mode === "eigene" && r.original && !r.aufgaben && !r.hauptteil) {
          return { ...r, mode, ...r.original };
        }
        return { ...r, mode };
      })
    );
  };

  const addNewLesson = () => {
    const nextNr = rows.length + 1;
    setRows((prev) => [
      ...prev,
      {
        key: `draft:${Date.now()}`,
        isNew: true,
        mode: "eigene",
        ...EMPTY_FIELDS,
        lektion: `Lektion ${nextNr}`,
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.key === key);
      if (row?.overrideId) {
        setDeletedOverrideIds((ids) => [...ids, row.overrideId!]);
      }
      return prev.filter((r) => r.key !== key);
    });
  };

  const buildOverridePayload = (row: Row) => {
    const material = row.material
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);
    return {
      schuleId,
      sourceType,
      sourceThemeId,
      originalLektionId: row.originalLektionId,
      originalLektionKey: row.originalLektionKey,
      useOriginal: false,
      isHidden: false,
      lektion: row.lektion || "Lektion",
      aufgaben: row.aufgaben || undefined,
      vorwissen: row.vorwissen || undefined,
      material: material.length > 0 ? material : undefined,
      einstieg: row.einstieg || undefined,
      hauptteil: row.hauptteil || undefined,
      abschluss: row.abschluss || undefined,
      stolpersteine: row.stolpersteine || undefined,
    };
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Kein Auth-Token verfügbar");
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Zuerst entfernte Overrides löschen
      for (const id of deletedOverrideIds) {
        await fetch(`/api/school-lektionen/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      let sortOrder = 0;
      for (const row of rows) {
        sortOrder += 1;

        if (!row.isNew) {
          // Original-verknüpfte Zeile
          if (row.mode === "original") {
            // Kein Override gewünscht → bestehendes löschen
            if (row.overrideId) {
              await fetch(`/api/school-lektionen/${row.overrideId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
            }
            continue;
          }

          if (row.mode === "hidden") {
            const payload = {
              schuleId,
              sourceType,
              sourceThemeId,
              originalLektionId: row.originalLektionId,
              originalLektionKey: row.originalLektionKey,
              isHidden: true,
              useOriginal: true,
              lektion: row.lektion || "Lektion",
            };
            if (row.overrideId) {
              await fetch(`/api/school-lektionen/${row.overrideId}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify({ isHidden: true, useOriginal: true }),
              });
            } else {
              await fetch("/api/school-lektionen", {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(payload),
              });
            }
            continue;
          }

          // mode === "eigene"
          const payload = buildOverridePayload(row);
          if (row.overrideId) {
            await fetch(`/api/school-lektionen/${row.overrideId}`, {
              method: "PUT",
              headers: authHeaders,
              body: JSON.stringify({
                useOriginal: false,
                isHidden: false,
                lektion: payload.lektion,
                aufgaben: payload.aufgaben ?? null,
                vorwissen: payload.vorwissen ?? null,
                material: payload.material ?? null,
                einstieg: payload.einstieg ?? null,
                hauptteil: payload.hauptteil ?? null,
                abschluss: payload.abschluss ?? null,
                stolpersteine: payload.stolpersteine ?? null,
              }),
            });
          } else {
            await fetch("/api/school-lektionen", {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify(payload),
            });
          }
          continue;
        }

        // Neue schuleigene Lektion
        const payload = { ...buildOverridePayload(row), sortOrder };
        if (row.overrideId) {
          await fetch(`/api/school-lektionen/${row.overrideId}`, {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify({
              lektion: payload.lektion,
              aufgaben: payload.aufgaben ?? null,
              vorwissen: payload.vorwissen ?? null,
              material: payload.material ?? null,
              einstieg: payload.einstieg ?? null,
              hauptteil: payload.hauptteil ?? null,
              abschluss: payload.abschluss ?? null,
              stolpersteine: payload.stolpersteine ?? null,
              sortOrder,
            }),
          });
        } else {
          await fetch("/api/school-lektionen", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(payload),
          });
        }
      }

      setSuccess("Lektionsplanung gespeichert.");
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const renderFields = (row: Row) => (
    <div className="space-y-3 pt-2">
      <div>
        <Label className="text-xs">Lektionsname</Label>
        <Input
          value={row.lektion}
          onChange={(e) => updateRow(row.key, { lektion: e.target.value })}
          placeholder="z.B. Lektion 1"
        />
      </div>
      <div>
        <Label className="text-xs">Aufgaben</Label>
        <Textarea
          rows={2}
          value={row.aufgaben}
          onChange={(e) => updateRow(row.key, { aufgaben: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Vorwissen</Label>
        <Textarea
          rows={2}
          value={row.vorwissen}
          onChange={(e) => updateRow(row.key, { vorwissen: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Einstieg</Label>
          <Textarea
            rows={3}
            value={row.einstieg}
            onChange={(e) => updateRow(row.key, { einstieg: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Hauptteil</Label>
          <Textarea
            rows={3}
            value={row.hauptteil}
            onChange={(e) => updateRow(row.key, { hauptteil: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Abschluss</Label>
          <Textarea
            rows={3}
            value={row.abschluss}
            onChange={(e) => updateRow(row.key, { abschluss: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Material (eine pro Zeile)</Label>
        <Textarea
          rows={2}
          value={row.material}
          onChange={(e) => updateRow(row.key, { material: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs">Stolpersteine</Label>
        <Textarea
          rows={2}
          value={row.stolpersteine}
          onChange={(e) =>
            updateRow(row.key, { stolpersteine: e.target.value })
          }
        />
      </div>
    </div>
  );

  const originalRows = rows.filter((r) => !r.isNew);
  const newRows = rows.filter((r) => r.isNew);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lektionsplanung anpassen
          </DialogTitle>
          <DialogDescription>
            {themaName} – Original übernehmen oder schulspezifisch anpassen.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
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

            {originalRows.length === 0 && newRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Für dieses Thema ist keine Original-Lektionsplanung hinterlegt.
                Sie können unten eigene Lektionen ergänzen.
              </p>
            )}

            {originalRows.length > 0 && (
              <Accordion type="multiple" className="w-full">
                {originalRows.map((row) => (
                  <AccordionItem key={row.key} value={row.key}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {row.original?.lektion || row.lektion || "Lektion"}
                        </span>
                        {row.mode === "original" && (
                          <Badge variant="secondary" className="text-xs">
                            Original
                          </Badge>
                        )}
                        {row.mode === "eigene" && (
                          <Badge className="text-xs">Eigene Fassung</Badge>
                        )}
                        {row.mode === "hidden" && (
                          <Badge variant="outline" className="text-xs">
                            Ausgeblendet
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {/* Modus-Umschaltung: Häkchen original / eigene */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              row.mode === "original" ? "default" : "outline"
                            }
                            onClick={() => setMode(row.key, "original")}
                          >
                            Original verwenden
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              row.mode === "eigene" ? "default" : "outline"
                            }
                            onClick={() => setMode(row.key, "eigene")}
                          >
                            Eigene Fassung
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              row.mode === "hidden" ? "default" : "outline"
                            }
                            onClick={() => setMode(row.key, "hidden")}
                          >
                            Ausblenden
                          </Button>
                        </div>

                        {row.mode === "original" && (
                          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                            <p className="font-medium text-foreground">
                              Vorschau Original:
                            </p>
                            {row.original?.aufgaben && (
                              <p className="whitespace-pre-wrap line-clamp-4">
                                {row.original.aufgaben}
                              </p>
                            )}
                            {!row.original?.aufgaben && (
                              <p>Lehrpersonen sehen die Original-Lektion.</p>
                            )}
                          </div>
                        )}

                        {row.mode === "hidden" && (
                          <p className="text-sm text-muted-foreground">
                            Diese Lektion wird den Lehrpersonen Ihrer Schule
                            nicht angezeigt.
                          </p>
                        )}

                        {row.mode === "eigene" && renderFields(row)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* Neue schuleigene Lektionen */}
            {newRows.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">
                  Zusätzliche schuleigene Lektionen
                </h4>
                <Accordion type="multiple" className="w-full">
                  {newRows.map((row) => (
                    <AccordionItem key={row.key} value={row.key}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {row.lektion || "Neue Lektion"}
                          </span>
                          <Badge className="text-xs">Schuleigen</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderFields(row)}
                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeRow(row.key)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Entfernen
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            <Button variant="outline" onClick={addNewLesson} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Eigene Lektion ergänzen
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Schliessen
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

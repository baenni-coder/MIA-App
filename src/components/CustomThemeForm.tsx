"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stufe, Zeitraum } from "@/types";
import { Upload, Loader2 } from "lucide-react";

const STUFEN: Stufe[] = [
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

const ZEITRAEUME: Zeitraum[] = [
  "Sommerferien-Herbstferien",
  "Herbstferien-Weihnachtsferien",
  "Weihnachtsferien-Winterferien",
  "Winterferien-Frühlingsferien",
  "Frühlingsferien-Sommerferien",
  "Zusatz",
];

interface CustomThemeFormProps {
  onSuccess?: (themeId: string) => void;
  initialData?: any;
  mode?: "create" | "edit";
  themeId?: string;
}

export default function CustomThemeForm({
  onSuccess,
  initialData,
  mode = "create",
  themeId,
}: CustomThemeFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [thema, setThema] = useState(initialData?.thema || "");
  const [beschreibung, setBeschreibung] = useState(
    initialData?.beschreibung || ""
  );
  const [lehrmittel, setLehrmittel] = useState(initialData?.lehrmittel || "");
  const [bildLehrmittel, setBildLehrmittel] = useState(
    initialData?.bildLehrmittel || ""
  );
  const [anzahlLektionen, setAnzahlLektionen] = useState(
    initialData?.anzahlLektionen || 1
  );
  const [schuljahr, setSchuljahr] = useState<Stufe[]>(
    initialData?.schuljahr || []
  );
  const [zeitraum, setZeitraum] = useState<Zeitraum | "">(
    initialData?.zeitraum || ""
  );
  const [kompetenzenIds, setKompetenzenIds] = useState<string[]>(
    initialData?.kompetenzenIds || []
  );
  const [fileRouge, setFileRouge] = useState(initialData?.fileRouge || "");
  const [unterlagen, setUnterlagen] = useState(initialData?.unterlagen || "");

  // Bild-Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("image", file);
      formData.append("compress", "true");

      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setBildLehrmittel(data.imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Fehler beim Hochladen des Bildes: " + (error as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Stufen Toggle
  const toggleStufe = (stufe: Stufe) => {
    setSchuljahr((prev) =>
      prev.includes(stufe) ? prev.filter((s) => s !== stufe) : [...prev, stufe]
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent, submitForReview = false) => {
    e.preventDefault();

    // Validierung
    if (!thema || !beschreibung || !zeitraum || schuljahr.length === 0) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    setLoading(true);

    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const body = {
        thema,
        beschreibung,
        lehrmittel,
        bildLehrmittel,
        anzahlLektionen,
        schuljahr,
        zeitraum,
        kompetenzenIds,
        fileRouge,
        unterlagen,
        submitForReview,
      };

      const url =
        mode === "edit" && themeId
          ? `/api/custom-themes/${themeId}`
          : "/api/custom-themes";

      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save theme");
      }

      const data = await response.json();

      if (submitForReview) {
        alert("Thema wurde zur Prüfung eingereicht!");
      } else {
        alert(
          mode === "edit"
            ? "Thema wurde aktualisiert!"
            : "Thema wurde als Entwurf gespeichert!"
        );
      }

      if (onSuccess) {
        onSuccess(data.themeId || themeId || "");
      }
    } catch (error) {
      console.error("Error saving theme:", error);
      alert("Fehler beim Speichern: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Thema */}
          <div>
            <Label htmlFor="thema">
              Thema <span className="text-red-500">*</span>
            </Label>
            <Input
              id="thema"
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              placeholder="z.B. Robotik Grundlagen"
              required
            />
          </div>

          {/* Beschreibung */}
          <div>
            <Label htmlFor="beschreibung">
              Beschreibung (Um was geht es?) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Beschreiben Sie das Thema..."
              rows={4}
              required
            />
          </div>

          {/* Lehrmittel */}
          <div>
            <Label htmlFor="lehrmittel">Lehrmittel</Label>
            <Input
              id="lehrmittel"
              value={lehrmittel}
              onChange={(e) => setLehrmittel(e.target.value)}
              placeholder="z.B. Medienkompass 1"
            />
          </div>

          {/* Bild Upload */}
          <div>
            <Label>Bild Lehrmittel</Label>
            <div className="mt-2">
              {bildLehrmittel ? (
                <div className="space-y-2">
                  <img
                    src={bildLehrmittel}
                    alt="Lehrmittel"
                    className="w-32 h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBildLehrmittel("")}
                  >
                    Bild entfernen
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label htmlFor="image-upload">
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center cursor-pointer hover:border-gray-400">
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Klicken zum Hochladen (max 10MB)
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            JPEG, PNG, WEBP
                          </p>
                        </>
                      )}
                    </div>
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Anzahl Lektionen */}
          <div>
            <Label htmlFor="anzahlLektionen">
              Anzahl Lektionen <span className="text-red-500">*</span>
            </Label>
            <Input
              id="anzahlLektionen"
              type="number"
              min="1"
              value={anzahlLektionen}
              onChange={(e) => setAnzahlLektionen(parseInt(e.target.value) || 1)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Klassenstufen & Zeitraum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Schuljahr (Multi-Select) */}
          <div>
            <Label>
              Schuljahr / Klassenstufen <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-2">
              {STUFEN.map((stufe) => (
                <div key={stufe} className="flex items-center space-x-2">
                  <Checkbox
                    id={stufe}
                    checked={schuljahr.includes(stufe)}
                    onCheckedChange={() => toggleStufe(stufe)}
                  />
                  <label
                    htmlFor={stufe}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {stufe}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Zeitraum */}
          <div>
            <Label htmlFor="zeitraum">
              Zeitraum der Bearbeitung <span className="text-red-500">*</span>
            </Label>
            <Select
              value={zeitraum}
              onValueChange={(value) => setZeitraum(value as Zeitraum)}
            >
              <SelectTrigger id="zeitraum">
                <SelectValue placeholder="Zeitraum wählen..." />
              </SelectTrigger>
              <SelectContent>
                {ZEITRAEUME.map((zeit) => (
                  <SelectItem key={zeit} value={zeit}>
                    {zeit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zusätzliche Informationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File rouge */}
          <div>
            <Label htmlFor="fileRouge">File rouge</Label>
            <Input
              id="fileRouge"
              value={fileRouge}
              onChange={(e) => setFileRouge(e.target.value)}
              placeholder="Roter Faden des Themas"
            />
          </div>

          {/* Unterlagen */}
          <div>
            <Label htmlFor="unterlagen">Unterlagen zum Kapitel (URL)</Label>
            <Input
              id="unterlagen"
              type="url"
              value={unterlagen}
              onChange={(e) => setUnterlagen(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={(e) => handleSubmit(e, false)}
          disabled={loading}
        >
          {mode === "edit" ? "Änderungen speichern" : "Als Entwurf speichern"}
        </Button>
        <Button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit"
            ? "Zur Prüfung einreichen"
            : "Erstellen & zur Prüfung einreichen"}
        </Button>
      </div>
    </form>
  );
}

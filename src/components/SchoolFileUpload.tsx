"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/firebase/config";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  Lock,
} from "lucide-react";
import { SchoolFile, FileShareLevel } from "@/types";

interface SchoolFileUploadProps {
  onUploadComplete: (file: SchoolFile) => void;
  onCancel: () => void;
  linkedThemeIds?: string[];
}

// Erlaubte Dateitypen
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Generiert sicheren Dateinamen
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
}

export default function SchoolFileUpload({
  onUploadComplete,
  onCancel,
  linkedThemeIds = [],
}: SchoolFileUploadProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [sharedWith, setSharedWith] = useState<FileShareLevel>("school");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return "Ungültiges Dateiformat. Erlaubt sind: PDF, Word, PowerPoint, Excel, JPEG, PNG, WEBP";
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `Datei ist zu groß. Maximum: ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(droppedFile);
      if (!customName) {
        setCustomName(droppedFile.name);
      }
    }
  }, [customName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      if (!customName) {
        setCustomName(selectedFile.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!user || !file || !storage) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const token = await user.getIdToken();

      // 1. Hole Teacher-Info für schuleId
      const teacherResponse = await fetch(`/api/teachers?userId=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!teacherResponse.ok) {
        throw new Error("Lehrerprofil konnte nicht geladen werden");
      }

      const teacherData = await teacherResponse.json();
      const schuleId = teacherData.schuleId;
      const teacherName = teacherData.name;

      if (!schuleId) {
        throw new Error("Keine Schule zugewiesen");
      }

      // 2. Generiere Storage-Pfad
      const timestamp = Date.now();
      const sanitizedName = sanitizeFilename(customName || file.name);
      const storagePath =
        sharedWith === "school"
          ? `school-files/${schuleId}/shared/${timestamp}_${sanitizedName}`
          : `school-files/${schuleId}/users/${user.uid}/${timestamp}_${sanitizedName}`;

      // 3. Upload direkt zu Firebase Storage (Client-seitig)
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          schuleId,
          uploadedBy: user.uid,
          sharedWith,
          originalName: file.name,
        },
      });

      // Fortschritt tracken
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setProgress(pct);
          },
          (err) => {
            console.error("Upload error:", err);
            reject(new Error("Upload fehlgeschlagen"));
          },
          () => {
            resolve();
          }
        );
      });

      // 4. Hole Download-URL
      const storageUrl = await getDownloadURL(storageRef);

      // 5. Speichere Metadaten in Firestore über API
      const metadataResponse = await fetch("/api/school-files/metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customName || file.name,
          storagePath,
          storageUrl,
          contentType: file.type,
          size: file.size,
          sharedWith,
          linkedThemeIds: linkedThemeIds.length > 0 ? linkedThemeIds : undefined,
          description: description || undefined,
        }),
      });

      if (!metadataResponse.ok) {
        const data = await metadataResponse.json();
        throw new Error(data.error || "Metadaten konnten nicht gespeichert werden");
      }

      const metadataResult = await metadataResponse.json();

      setProgress(100);
      setSuccess(true);

      // Erstelle SchoolFile Objekt für Callback
      const uploadedFile: SchoolFile = {
        id: metadataResult.fileId,
        name: customName || file.name,
        storagePath,
        storageUrl,
        contentType: file.type,
        size: file.size,
        schuleId,
        uploadedBy: user.uid,
        uploadedByName: teacherName,
        sharedWith,
        description: description || undefined,
        linkedThemeIds: linkedThemeIds.length > 0 ? linkedThemeIds : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Warte kurz, dann Callback
      setTimeout(() => {
        onUploadComplete(uploadedFile);
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "Fehler beim Hochladen der Datei"
      );
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      {!file && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Datei hierher ziehen oder klicken zum Auswählen
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, Word, PowerPoint, Excel, Bilder (max. {MAX_SIZE_MB}MB)
          </p>
          <Input
            type="file"
            className="hidden"
            id="file-upload"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            Datei auswählen
          </Button>
        </div>
      )}

      {/* Ausgewählte Datei */}
      {file && !success && (
        <div className="space-y-4">
          {/* Datei-Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileIcon className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setCustomName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Custom Name */}
          <div className="space-y-2">
            <Label htmlFor="custom-name">Dateiname (optional)</Label>
            <Input
              id="custom-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={file.name}
              disabled={uploading}
            />
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Worum geht es in dieser Datei?"
              rows={2}
              disabled={uploading}
            />
          </div>

          {/* Freigabe */}
          <div className="space-y-2">
            <Label>Freigabe</Label>
            <RadioGroup
              value={sharedWith}
              onValueChange={(v) => setSharedWith(v as FileShareLevel)}
              className="space-y-2"
              disabled={uploading}
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="school" id="share-school" />
                <Label
                  htmlFor="share-school"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Mit Schule teilen</p>
                    <p className="text-xs text-muted-foreground">
                      Alle Lehrpersonen Ihrer Schule können diese Datei sehen
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="private" id="share-private" />
                <Label
                  htmlFor="share-private"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Lock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Privat</p>
                    <p className="text-xs text-muted-foreground">
                      Nur Sie können diese Datei sehen
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Wird hochgeladen... {progress}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {success && (
        <div className="text-center py-6">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-green-700">
            Datei erfolgreich hochgeladen!
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      {!success && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={uploading}>
            Abbrechen
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Hochladen
          </Button>
        </div>
      )}
    </div>
  );
}

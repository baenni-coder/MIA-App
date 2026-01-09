"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentArtifact, ArtifactType } from "@/types";
import {
  Upload,
  Link as LinkIcon,
  Image,
  FileText,
  Loader2,
  X,
  Plus,
  ExternalLink,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

interface StudentArtifactUploadProps {
  competencyId: string;
  competencyName: string;
  artifacts: StudentArtifact[];
  onArtifactCreated: (artifact: StudentArtifact) => void;
  onArtifactDeleted: (artifactId: string) => void;
  getAuthToken: () => Promise<string>;
  studentId: string;
}

export default function StudentArtifactUpload({
  competencyId,
  competencyName,
  artifacts,
  onArtifactCreated,
  onArtifactDeleted,
  getAuthToken,
  studentId,
}: StudentArtifactUploadProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [artifactType, setArtifactType] = useState<ArtifactType>("image");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setUrl("");
    setFile(null);
    setError("");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Größenprüfung (20 MB)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError("Datei zu gross. Maximal 20 MB erlaubt.");
      return;
    }

    // Typ-Prüfung
    if (artifactType === "image" && !selectedFile.type.startsWith("image/")) {
      setError("Bitte wähle eine Bilddatei (JPG, PNG, etc.)");
      return;
    }

    if (artifactType === "pdf" && selectedFile.type !== "application/pdf") {
      setError("Bitte wähle eine PDF-Datei");
      return;
    }

    setFile(selectedFile);
    setError("");

    // Auto-fill title from filename
    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein");
      return;
    }

    if (artifactType === "link" && !url.trim()) {
      setError("Bitte gib eine URL ein");
      return;
    }

    if ((artifactType === "image" || artifactType === "pdf") && !file) {
      setError("Bitte wähle eine Datei aus");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const token = await getAuthToken();
      let storagePath: string | undefined;
      let storageUrl: string | undefined;
      let contentType: string | undefined;
      let size: number | undefined;

      // Datei hochladen wenn vorhanden
      if (file) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        storagePath = `student-artifacts/${studentId}/${timestamp}-${safeName}`;

        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              reject(error);
            },
            async () => {
              storageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });

        contentType = file.type;
        size = file.size;
      }

      // API-Aufruf zum Erstellen des Artefakts
      const response = await fetch("/api/student-artifacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          competencyId,
          competencyName,
          type: artifactType,
          title: title.trim(),
          description: description.trim() || undefined,
          storagePath,
          storageUrl,
          contentType,
          size,
          url: artifactType === "link" ? url.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }

      const data = await response.json();

      // Neues Artefakt an Parent übergeben
      const newArtifact: StudentArtifact = {
        id: data.id,
        studentId,
        studentName: "",
        classId: "",
        competencyId,
        competencyName,
        type: artifactType,
        title: title.trim(),
        description: description.trim() || undefined,
        storagePath,
        storageUrl,
        contentType,
        size,
        url: artifactType === "link" ? url.trim() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onArtifactCreated(newArtifact);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error creating artifact:", err);
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (artifactId: string) => {
    if (!confirm("Möchtest du dieses Artefakt wirklich löschen?")) return;

    setDeletingId(artifactId);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/student-artifacts/${artifactId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      onArtifactDeleted(artifactId);
    } catch (err) {
      console.error("Error deleting artifact:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeIcon = (type: ArtifactType) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Existing artifacts */}
      {artifacts.length > 0 && (
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border"
            >
              <div className="shrink-0 mt-0.5">
                {getTypeIcon(artifact.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{artifact.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {artifact.type === "image" ? "Bild" : artifact.type === "pdf" ? "PDF" : "Link"}
                  </Badge>
                </div>
                {artifact.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {artifact.description}
                  </p>
                )}
                {artifact.size && (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(artifact.size)}
                  </p>
                )}
                {/* Teacher comment */}
                {artifact.teacherComment && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-center gap-1 text-blue-700 font-medium">
                      <MessageSquare className="h-3 w-3" />
                      <span>{artifact.teacherCommentByName || "Lehrperson"}</span>
                    </div>
                    <p className="text-blue-800 mt-1">{artifact.teacherComment}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* View/Open button */}
                {(artifact.storageUrl || artifact.url) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(artifact.storageUrl || artifact.url, "_blank")}
                    title="Öffnen"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(artifact.id)}
                  disabled={deletingId === artifact.id}
                  title="Löschen"
                >
                  {deletingId === artifact.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          resetForm();
          setDialogOpen(true);
        }}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Artefakt hinzufügen
      </Button>

      {/* Upload dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neues Artefakt</DialogTitle>
            <DialogDescription>
              Füge einen Beleg für deine Kompetenz hinzu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type selection */}
            <div className="space-y-2">
              <Label>Art des Artefakts</Label>
              <Select
                value={artifactType}
                onValueChange={(v) => {
                  setArtifactType(v as ArtifactType);
                  setFile(null);
                  setUrl("");
                  setError("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <span>Bild</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>PDF-Dokument</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <span>Link / Website</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Mein Scratch-Projekt"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Was zeigt dieses Artefakt?"
                rows={2}
              />
            </div>

            {/* File upload for image/pdf */}
            {(artifactType === "image" || artifactType === "pdf") && (
              <div className="space-y-2">
                <Label>Datei hochladen *</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={artifactType === "image" ? "image/*" : "application/pdf"}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      {artifactType === "image" ? (
                        <Image className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-green-600" />
                      )}
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Klicke oder ziehe eine Datei hierher
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Max. 20 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* URL input for link */}
            {artifactType === "link" && (
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Upload progress */}
            {uploading && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Hochladen...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploading}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Hochladen...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Hinzufügen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

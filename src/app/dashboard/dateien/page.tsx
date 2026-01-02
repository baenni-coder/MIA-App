"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import SchoolFileUpload from "@/components/SchoolFileUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  ImageIcon,
  Download,
  Trash2,
  Share2,
  Lock,
  Users,
  Loader2,
  AlertCircle,
  Upload,
  RefreshCw,
  BookOpen,
  Pencil,
} from "lucide-react";
import { SchoolFile, FileShareLevel } from "@/types";
import ThemeSelector from "@/components/ThemeSelector";

// Datei-Icon basierend auf Content-Type
function getFileIcon(contentType: string) {
  if (contentType.includes("pdf")) {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (contentType.includes("word") || contentType.includes("document")) {
    return <FileText className="h-8 w-8 text-blue-500" />;
  }
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) {
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  }
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) {
    return <Presentation className="h-8 w-8 text-orange-500" />;
  }
  if (contentType.includes("image")) {
    return <ImageIcon className="h-8 w-8 text-purple-500" />;
  }
  return <FileIcon className="h-8 w-8 text-gray-500" />;
}

// Dateigröße formatieren
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Datum formatieren
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DateienPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<SchoolFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SchoolFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Dialog State
  const [editFile, setEditFile] = useState<SchoolFile | null>(null);
  const [editThemeIds, setEditThemeIds] = useState<string[]>([]);
  const [editThemeNames, setEditThemeNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/school-files", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Dateien");
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Error loading files:", err);
      setError("Fehler beim Laden der Dateien. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: SchoolFile) => {
    if (!user) return;

    try {
      // Hole frische URL
      const token = await user.getIdToken();
      const response = await fetch(`/api/school-files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Abrufen der Download-URL");
      }

      const data = await response.json();

      // Öffne Download in neuem Tab
      window.open(data.storageUrl, "_blank");
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Fehler beim Herunterladen der Datei");
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteConfirm) return;

    setDeleting(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/school-files/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Löschen der Datei");
      }

      // Entferne aus Liste
      setFiles((prev) => prev.filter((f) => f.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("Fehler beim Löschen der Datei");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleShare = async (file: SchoolFile) => {
    if (!user || file.uploadedBy !== user.uid) return;

    const newShareLevel: FileShareLevel =
      file.sharedWith === "school" ? "private" : "school";

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/school-files/${file.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sharedWith: newShareLevel }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Ändern der Freigabe");
      }

      // Aktualisiere in Liste
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, sharedWith: newShareLevel } : f
        )
      );
    } catch (err) {
      console.error("Error toggling share:", err);
      alert("Fehler beim Ändern der Freigabe");
    }
  };

  const handleUploadComplete = (newFile: SchoolFile) => {
    setFiles((prev) => [newFile, ...prev]);
    setShowUploadDialog(false);
  };

  const handleEditClick = (file: SchoolFile) => {
    setEditFile(file);
    setEditThemeIds(file.linkedThemeIds || []);
    setEditThemeNames(file.linkedThemeNames || []);
  };

  const handleSaveThemeLinks = async () => {
    if (!user || !editFile) return;

    setSaving(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/school-files/${editFile.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkedThemeIds: editThemeIds,
          linkedThemeNames: editThemeNames,
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }

      // Aktualisiere in Liste
      setFiles((prev) =>
        prev.map((f) =>
          f.id === editFile.id
            ? { ...f, linkedThemeIds: editThemeIds, linkedThemeNames: editThemeNames }
            : f
        )
      );
      setEditFile(null);
    } catch (err) {
      console.error("Error saving theme links:", err);
      alert("Fehler beim Speichern der Verknüpfungen");
    } finally {
      setSaving(false);
    }
  };

  // Filter anwenden
  const filteredFiles = files.filter((file) => {
    if (filter === "mine") return file.uploadedBy === user?.uid;
    if (filter === "shared")
      return file.sharedWith === "school" && file.uploadedBy !== user?.uid;
    return true;
  });

  // Statistiken berechnen
  const stats = {
    total: files.length,
    mine: files.filter((f) => f.uploadedBy === user?.uid).length,
    shared: files.filter(
      (f) => f.sharedWith === "school" && f.uploadedBy !== user?.uid
    ).length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Schul-Dateien</h1>
              <p className="text-muted-foreground">
                Unterlagen mit Kolleg:innen Ihrer Schule teilen
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={loadFiles} disabled={loading}>
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Aktualisieren
              </Button>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Datei hochladen
              </Button>
            </div>
          </div>

          {/* Statistiken */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">
                  Dateien insgesamt
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.mine}</div>
                <div className="text-sm text-muted-foreground">Meine Dateien</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.shared}</div>
                <div className="text-sm text-muted-foreground">
                  Von Kolleg:innen
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {formatFileSize(stats.totalSize)}
                </div>
                <div className="text-sm text-muted-foreground">Speicherplatz</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filter:</span>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as typeof filter)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Dateien</SelectItem>
                <SelectItem value="mine">Meine Dateien</SelectItem>
                <SelectItem value="shared">Von Kolleg:innen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fehlermeldung */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                {error}
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Datei-Liste */}
          {!loading && filteredFiles.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Dateien gefunden</p>
                {filter !== "all" && (
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setFilter("all")}
                  >
                    Alle Dateien anzeigen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {!loading && filteredFiles.length > 0 && (
            <div className="grid gap-4">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getFileIcon(file.contentType)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{file.name}</h3>
                          {file.sharedWith === "school" ? (
                            <Badge
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <Users className="h-3 w-3" />
                              Schule
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Lock className="h-3 w-3" />
                              Privat
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatFileSize(file.size)} •{" "}
                          {formatDate(file.createdAt)}
                          {file.uploadedBy !== user?.uid && (
                            <> • von {file.uploadedByName}</>
                          )}
                        </div>
                        {file.description && (
                          <p className="text-sm mt-1 text-muted-foreground truncate">
                            {file.description}
                          </p>
                        )}
                        {/* Verknüpfte Themen */}
                        {file.linkedThemeNames && file.linkedThemeNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {file.linkedThemeNames.map((themeName, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span className="max-w-[120px] truncate">{themeName}</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(file)}
                          title="Herunterladen"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        {file.uploadedBy === user?.uid && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(file)}
                              title="Themen-Verknüpfungen bearbeiten"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleShare(file)}
                              title={
                                file.sharedWith === "school"
                                  ? "Privat machen"
                                  : "Mit Schule teilen"
                              }
                            >
                              {file.sharedWith === "school" ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Share2 className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(file)}
                              title="Löschen"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Datei hochladen</DialogTitle>
              <DialogDescription>
                Laden Sie eine Datei hoch, um sie mit Ihrer Schule zu teilen oder
                privat zu speichern.
              </DialogDescription>
            </DialogHeader>
            <SchoolFileUpload
              onUploadComplete={handleUploadComplete}
              onCancel={() => setShowUploadDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={() => setDeleteConfirm(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Datei löschen?</DialogTitle>
              <DialogDescription>
                Möchten Sie die Datei &quot;{deleteConfirm?.name}&quot; wirklich
                löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Theme Links Dialog */}
        <Dialog open={!!editFile} onOpenChange={() => setEditFile(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Themen-Verknüpfungen bearbeiten</DialogTitle>
              <DialogDescription>
                Verknüpfen Sie die Datei &quot;{editFile?.name}&quot; mit Themen.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <ThemeSelector
                selectedThemeIds={editThemeIds}
                onSelectionChange={(ids, names) => {
                  setEditThemeIds(ids);
                  setEditThemeNames(names);
                }}
                disabled={saving}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditFile(null)}
                disabled={saving}
              >
                Abbrechen
              </Button>
              <Button onClick={handleSaveThemeLinks} disabled={saving}>
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

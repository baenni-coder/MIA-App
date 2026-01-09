"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { StudentArtifact } from "@/types";
import {
  Image,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  MessageSquare,
  Edit,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

interface TeacherArtifactViewerProps {
  artifacts: StudentArtifact[];
  onCommentAdded: (artifactId: string, comment: string) => void;
  onCommentRemoved: (artifactId: string) => void;
  getAuthToken: () => Promise<string | null>;
  teacherName: string;
}

export default function TeacherArtifactViewer({
  artifacts,
  onCommentAdded,
  onCommentRemoved,
  getAuthToken,
  teacherName,
}: TeacherArtifactViewerProps) {
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<StudentArtifact | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const getTypeIcon = (type: StudentArtifact["type"]) => {
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

  const handleOpenCommentDialog = (artifact: StudentArtifact) => {
    setSelectedArtifact(artifact);
    setComment(artifact.teacherComment || "");
    setCommentDialogOpen(true);
  };

  const handleSaveComment = async () => {
    if (!selectedArtifact || !comment.trim()) return;

    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht authentifiziert");
      }
      const response = await fetch(`/api/student-artifacts/${selectedArtifact.id}/comment`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: comment.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }

      onCommentAdded(selectedArtifact.id, comment.trim());
      setCommentDialogOpen(false);
      setSelectedArtifact(null);
      setComment("");
    } catch (err) {
      console.error("Error saving comment:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveComment = async (artifactId: string) => {
    if (!confirm("Möchtest du deinen Kommentar wirklich entfernen?")) return;

    setRemovingId(artifactId);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht authentifiziert");
      }
      const response = await fetch(`/api/student-artifacts/${artifactId}/comment`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Entfernen");
      }

      onCommentRemoved(artifactId);
    } catch (err) {
      console.error("Error removing comment:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Entfernen");
    } finally {
      setRemovingId(null);
    }
  };

  if (artifacts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Keine Artefakte vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="p-3 bg-muted/50 rounded-lg border space-y-2"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <div className="shrink-0 mt-0.5">
                {getTypeIcon(artifact.type)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{artifact.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {artifact.type === "image" ? "Bild" : artifact.type === "pdf" ? "PDF" : "Link"}
                  </Badge>
                </div>
                {artifact.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {artifact.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {artifact.size && <span>{formatFileSize(artifact.size)}</span>}
                  <span>
                    {new Date(artifact.createdAt).toLocaleDateString("de-CH")}
                  </span>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenCommentDialog(artifact)}
                title={artifact.teacherComment ? "Kommentar bearbeiten" : "Kommentar hinzufügen"}
              >
                {artifact.teacherComment ? (
                  <Edit className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Teacher comment */}
          {artifact.teacherComment && (
            <div className="ml-6 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-blue-700 font-medium">
                  <MessageSquare className="h-3 w-3" />
                  <span>{artifact.teacherCommentByName || teacherName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-blue-600 hover:text-destructive"
                  onClick={() => handleRemoveComment(artifact.id)}
                  disabled={removingId === artifact.id}
                  title="Kommentar entfernen"
                >
                  {removingId === artifact.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <p className="text-blue-800 mt-1">{artifact.teacherComment}</p>
            </div>
          )}
        </div>
      ))}

      {/* Comment dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kommentar zu Artefakt</DialogTitle>
            <DialogDescription>
              {selectedArtifact?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Schreibe einen Kommentar..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommentDialogOpen(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handleSaveComment} disabled={saving || !comment.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  ImageIcon,
  Download,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { SchoolFile } from "@/types";

interface LinkedFilesViewerProps {
  themeId: string;
  themeName: string;
}

// Datei-Icon basierend auf Content-Type
function getFileIcon(contentType: string) {
  if (contentType.includes("pdf")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (contentType.includes("word") || contentType.includes("document")) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  }
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) {
    return <Presentation className="h-5 w-5 text-orange-500" />;
  }
  if (contentType.includes("image")) {
    return <ImageIcon className="h-5 w-5 text-purple-500" />;
  }
  return <FileIcon className="h-5 w-5 text-gray-500" />;
}

// Dateigröße formatieren
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LinkedFilesViewer({
  themeId,
  themeName,
}: LinkedFilesViewerProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<SchoolFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [themeId, user]);

  const loadFiles = async () => {
    if (!user || !themeId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/school-files?themeId=${themeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setError("Fehler beim Laden der Dateien");
      }
    } catch (err) {
      console.error("Error loading linked files:", err);
      setError("Fehler beim Laden der Dateien");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: SchoolFile) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/school-files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.storageUrl, "_blank");
      }
    } catch (err) {
      console.error("Error downloading file:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Dateien werden geladen...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500">{error}</p>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <FolderOpen className="h-4 w-4" />
        Keine verknüpften Dateien vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
        >
          {getFileIcon(file.contentType)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} • von {file.uploadedByName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(file)}
            title="Herunterladen"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1">
        {files.length} Datei(en) verknüpft
      </p>
    </div>
  );
}

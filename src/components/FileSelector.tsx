"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Search,
  Loader2,
  FileIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  ImageIcon,
  X,
  FolderOpen,
} from "lucide-react";
import { SchoolFile } from "@/types";

interface FileSelectorProps {
  selectedFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
  disabled?: boolean;
  // Optional: Nur eigene Dateien anzeigen (Standard: true)
  ownFilesOnly?: boolean;
}

// Datei-Icon basierend auf Content-Type
function getFileIcon(contentType: string, className: string = "h-4 w-4") {
  if (contentType.includes("pdf")) {
    return <FileText className={`${className} text-red-500`} />;
  }
  if (contentType.includes("word") || contentType.includes("document")) {
    return <FileText className={`${className} text-blue-500`} />;
  }
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) {
    return <FileSpreadsheet className={`${className} text-green-500`} />;
  }
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) {
    return <Presentation className={`${className} text-orange-500`} />;
  }
  if (contentType.includes("image")) {
    return <ImageIcon className={`${className} text-purple-500`} />;
  }
  return <FileIcon className={`${className} text-gray-500`} />;
}

// Dateigröße formatieren
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileSelector({
  selectedFileIds,
  onSelectionChange,
  disabled = false,
  ownFilesOnly = true,
}: FileSelectorProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<SchoolFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadFiles();
  }, [user]);

  const loadFiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/school-files", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        let allFiles: SchoolFile[] = data.files || [];

        // Filtere auf eigene Dateien wenn gewünscht
        if (ownFilesOnly) {
          allFiles = allFiles.filter((f) => f.uploadedBy === user.uid);
        }

        setFiles(allFiles);
      }
    } catch (err) {
      console.error("Error loading files:", err);
    } finally {
      setLoading(false);
    }
  };

  // Suche in Dateien
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.linkedThemeNames?.some((name) =>
          name.toLowerCase().includes(query)
        )
    );
  }, [files, searchQuery]);

  const handleToggleFile = (file: SchoolFile) => {
    if (disabled) return;

    const isSelected = selectedFileIds.includes(file.id);
    let newIds: string[];

    if (isSelected) {
      newIds = selectedFileIds.filter((id) => id !== file.id);
    } else {
      newIds = [...selectedFileIds, file.id];
    }

    onSelectionChange(newIds);
  };

  const handleRemoveFile = (fileId: string) => {
    if (disabled) return;
    onSelectionChange(selectedFileIds.filter((id) => id !== fileId));
  };

  // Ausgewählte Datei-Objekte
  const selectedFiles = files.filter((f) => selectedFileIds.includes(f.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
        <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Sie haben noch keine eigenen Dateien hochgeladen.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Laden Sie Dateien unter &quot;Dateien&quot; hoch, um sie hier zu verknüpfen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Ausgewählte Dateien */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file) => (
            <Badge
              key={file.id}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1"
            >
              {getFileIcon(file.contentType, "h-3 w-3")}
              <span className="max-w-[150px] truncate">{file.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Suchfeld */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Dateien suchen..."
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {/* Datei-Liste */}
      <div className="h-[200px] border rounded-md overflow-y-auto">
        <div className="p-2 space-y-1">
          {filteredFiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keine Dateien gefunden
            </p>
          )}

          {filteredFiles.map((file) => {
            const isSelected = selectedFileIds.includes(file.id);
            return (
              <div
                key={file.id}
                className={`flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer ${
                  isSelected ? "bg-muted" : ""
                }`}
                onClick={() => handleToggleFile(file)}
              >
                <Checkbox
                  id={`file-${file.id}`}
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={() => handleToggleFile(file)}
                />
                {getFileIcon(file.contentType)}
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`file-${file.id}`}
                    className="cursor-pointer text-sm font-medium truncate block"
                  >
                    {file.name}
                  </Label>
                  {file.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {file.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatFileSize(file.size)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedFileIds.length} Datei(en) ausgewählt
      </p>
    </div>
  );
}

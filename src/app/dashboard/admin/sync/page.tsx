"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Trash2, CheckCircle, XCircle, Clock, ImageIcon, BookOpen } from "lucide-react";

interface SyncMetadata {
  syncStatus: "idle" | "syncing" | "completed" | "error";
  lastSyncedAt?: Date;
  lastSyncDuration?: number;
  lastSyncError?: string;
}

interface SyncLog {
  id: string;
  triggeredBy: string;
  triggeredAt: Date;
  status: "success" | "error";
  duration: number;
  recordsCached: {
    themes: number;
    schulen: number;
    kompetenzen: number;
    lektionen: number;
  };
  error?: string;
}

export default function AdminSyncPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const [metadata, setMetadata] = useState<SyncMetadata | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncingImages, setSyncingImages] = useState(false);
  const [imageStatus, setImageStatus] = useState<{
    total: number;
    inFirebaseStorage: number;
    inAirtable: number;
    noImage: number;
    allSynced: boolean;
  } | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    step: string;
    current: number;
    total: number;
    status: "pending" | "running" | "success" | "error";
  } | null>(null);

  // LP21 Sync State
  const [syncingLP21, setSyncingLP21] = useState(false);
  const [lp21Kanton, setLp21Kanton] = useState("v-fe");
  const [lp21Fachbereich, setLp21Fachbereich] = useState("auto");
  const [lp21Fachbereiche, setLp21Fachbereiche] = useState<{ code: string; bezeichnung: string }[]>([]);
  const [loadingFachbereiche, setLoadingFachbereiche] = useState(false);
  const [lp21Result, setLp21Result] = useState<{
    success: boolean;
    added: number;
    updated: number;
    totalKompetenzstufen: number;
    kompetenzbereiche: number;
    orientierungspunkte: number;
    totalDuration: number;
    crawlDuration: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  // LP21 Fachbereiche laden wenn Kanton sich ändert
  const loadLP21Fachbereiche = async (kanton: string) => {
    if (!user) return;
    setLoadingFachbereiche(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/sync/lp21/fachbereiche?kanton=${kanton}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.fachbereiche) {
        setLp21Fachbereiche(data.fachbereiche);
      }
    } catch (err) {
      console.error("Error loading LP21 fachbereiche:", err);
    } finally {
      setLoadingFachbereiche(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSyncStatus();
      loadImageStatus();
      // Auto-refresh alle 10 Sekunden wenn am syncen
      const interval = setInterval(() => {
        if (metadata?.syncStatus === "syncing") {
          loadSyncStatus();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, metadata?.syncStatus]);

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/auth/check-admin?userId=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.role === "super_admin" || data.role === "picts_admin") {
          setIsAdmin(true);
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sync/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMetadata({
          syncStatus: data.metadata.syncStatus,
          lastSyncedAt: data.metadata.lastFullSync
            ? new Date(data.metadata.lastFullSync)
            : undefined,
          lastSyncDuration: data.metadata.lastSyncDuration,
          lastSyncError: data.metadata.errorMessage,
        });
        setLogs(
          (data.recentLogs || []).map((log: any) => ({
            id: log.id,
            triggeredBy: log.triggeredBy,
            triggeredAt: new Date(log.timestamp),
            status: log.status,
            duration: log.duration,
            recordsCached: log.recordsProcessed
              ? {
                  themes: log.recordsProcessed.themes?.added + log.recordsProcessed.themes?.updated || 0,
                  schulen: log.recordsProcessed.schulen?.added + log.recordsProcessed.schulen?.updated || 0,
                  kompetenzen: log.recordsProcessed.kompetenzen?.added + log.recordsProcessed.kompetenzen?.updated || 0,
                  lektionen: log.recordsProcessed.lektionen?.added + log.recordsProcessed.lektionen?.updated || 0,
                }
              : { themes: 0, schulen: 0, kompetenzen: 0, lektionen: 0 },
            error: log.errors?.join("; "),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const loadImageStatus = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sync-images", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setImageStatus(data);
      }
    } catch (error) {
      console.error("Error loading image status:", error);
    }
  };

  const triggerImageSync = async () => {
    if (!user) return;
    setSyncingImages(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sync-images", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          `🖼️ Bilder-Sync abgeschlossen!\n` +
            `   ${data.stats.synced} synchronisiert, ${data.stats.failed} fehlgeschlagen\n` +
            `   ${data.stats.alreadySynced} waren bereits in Firebase Storage`
        );
        loadImageStatus();
      } else {
        setError(`Bilder-Sync Fehler: ${data.error || data.message}`);
      }
    } catch (error: any) {
      setError(`Bilder-Sync Fehler: ${error.message}`);
    } finally {
      setSyncingImages(false);
    }
  };

  const triggerLP21Sync = async () => {
    if (!user) return;
    setSyncingLP21(true);
    setError(null);
    setSuccess(null);
    setLp21Result(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sync/lp21", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kanton: lp21Kanton,
          ...(lp21Fachbereich !== "auto" ? { fachbereich: lp21Fachbereich } : {}),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLp21Result({
          success: true,
          added: data.added || 0,
          updated: data.updated || 0,
          totalKompetenzstufen: data.totalKompetenzstufen || 0,
          kompetenzbereiche: data.kompetenzbereiche || 0,
          orientierungspunkte: data.orientierungspunkte || 0,
          totalDuration: data.totalDuration || 0,
          crawlDuration: data.crawlDuration || 0,
        });
        setSuccess(
          `LP21 Sync erfolgreich! ${data.totalKompetenzstufen} Kompetenzstufen geladen ` +
            `(+${data.added} neu, ~${data.updated} aktualisiert) in ${(data.totalDuration / 1000).toFixed(1)}s`
        );
      } else {
        setLp21Result({
          success: false,
          added: 0,
          updated: 0,
          totalKompetenzstufen: 0,
          kompetenzbereiche: 0,
          orientierungspunkte: 0,
          totalDuration: data.duration || 0,
          crawlDuration: 0,
          error: data.error || "Unbekannter Fehler",
        });
        setError(`LP21 Sync Fehler: ${data.error || "Unbekannter Fehler"}`);
      }
    } catch (error: any) {
      setError(`LP21 Sync Fehler: ${error.message}`);
      setLp21Result(null);
    } finally {
      setSyncingLP21(false);
    }
  };

  const triggerSync = async () => {
    if (!user) return;

    setSyncing(true);
    setError(null);
    setSuccess(null);

    const token = await user.getIdToken();
    const startTime = Date.now();
    const results = {
      schulen: { added: 0, updated: 0, deleted: 0 },
      themen: { added: 0, updated: 0, deleted: 0 },
      kompetenzen: { added: 0, updated: 0, deleted: 0 },
      lektionen: { added: 0, updated: 0, deleted: 0 },
    };

    try {
      // Update Sync Status zu "syncing"
      await fetch("/api/admin/sync/status", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ syncStatus: "syncing" }),
      });

      // 1. Sync Schulen
      setSyncProgress({ step: "Schulen", current: 1, total: 5, status: "running" });
      const schulenResponse = await fetch("/api/admin/sync/schulen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!schulenResponse.ok) {
        throw new Error("Schulen Sync fehlgeschlagen");
      }

      const schulenData = await schulenResponse.json();
      results.schulen = {
        added: schulenData.added || 0,
        updated: schulenData.updated || 0,
        deleted: schulenData.deleted || 0,
      };
      setSyncProgress({ step: "Schulen", current: 1, total: 5, status: "success" });

      // 2. Sync Themen
      setSyncProgress({ step: "Themen", current: 2, total: 5, status: "running" });
      const themenResponse = await fetch("/api/admin/sync/themen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!themenResponse.ok) {
        throw new Error("Themen Sync fehlgeschlagen");
      }

      const themenData = await themenResponse.json();
      results.themen = {
        added: themenData.added || 0,
        updated: themenData.updated || 0,
        deleted: themenData.deleted || 0,
      };
      setSyncProgress({ step: "Themen", current: 2, total: 5, status: "success" });

      // 3. Sync Kompetenzen
      setSyncProgress({ step: "Kompetenzen", current: 3, total: 5, status: "running" });
      const kompetenzenResponse = await fetch("/api/admin/sync/kompetenzen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!kompetenzenResponse.ok) {
        throw new Error("Kompetenzen Sync fehlgeschlagen");
      }

      const kompetenzenData = await kompetenzenResponse.json();
      results.kompetenzen = {
        added: kompetenzenData.added || 0,
        updated: kompetenzenData.updated || 0,
        deleted: kompetenzenData.deleted || 0,
      };
      setSyncProgress({ step: "Kompetenzen", current: 3, total: 5, status: "success" });

      // 4. Sync Lektionen
      setSyncProgress({ step: "Lektionen", current: 4, total: 4, status: "running" });
      const lektionenResponse = await fetch("/api/admin/sync/lektionen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!lektionenResponse.ok) {
        throw new Error("Lektionen Sync fehlgeschlagen");
      }

      const lektionenData = await lektionenResponse.json();
      results.lektionen = {
        added: lektionenData.added || 0,
        updated: lektionenData.updated || 0,
        deleted: lektionenData.deleted || 0,
      };
      setSyncProgress({ step: "Lektionen", current: 4, total: 5, status: "success" });

      // 5. Sync Bilder zu Firebase Storage
      setSyncProgress({ step: "Bilder", current: 5, total: 5, status: "running" });
      try {
        const imageResponse = await fetch("/api/admin/sync-images", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log(`🖼️ Bilder synced: ${imageData.stats?.synced || 0} synced, ${imageData.stats?.failed || 0} failed`);
        }
      } catch (imgError) {
        console.warn("Image sync warning:", imgError);
        // Bilder-Sync-Fehler sind nicht kritisch
      }
      setSyncProgress({ step: "Bilder", current: 5, total: 5, status: "success" });

      const duration = Date.now() - startTime;

      // Update Sync Metadata
      await fetch("/api/admin/sync/status", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          syncStatus: "completed",
          lastSyncedAt: new Date().toISOString(),
          lastSyncDuration: duration,
          recordCounts: {
            themes: results.themen.added + results.themen.updated,
            schulen: results.schulen.added + results.schulen.updated,
            kompetenzen: results.kompetenzen.added + results.kompetenzen.updated,
            lektionen: results.lektionen.added + results.lektionen.updated,
          },
        }),
      });

      setSuccess(
        `✅ Sync erfolgreich abgeschlossen in ${(duration / 1000).toFixed(1)}s!\n` +
          `   Schulen: +${results.schulen.added} ~${results.schulen.updated} -${results.schulen.deleted}\n` +
          `   Themen: +${results.themen.added} ~${results.themen.updated} -${results.themen.deleted}\n` +
          `   Kompetenzen: +${results.kompetenzen.added} ~${results.kompetenzen.updated} -${results.kompetenzen.deleted}\n` +
          `   Lektionen: +${results.lektionen.added} ~${results.lektionen.updated} -${results.lektionen.deleted}`
      );

      setTimeout(() => {
        loadSyncStatus();
        setSyncProgress(null);
      }, 2000);
    } catch (error: any) {
      console.error("Sync error:", error);
      setError(`❌ Sync Fehler: ${error.message}`);

      // Update Status zu Error
      await fetch("/api/admin/sync/status", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          syncStatus: "error",
          errorMessage: error.message,
        }),
      });

      setSyncProgress(null);
    } finally {
      setSyncing(false);
    }
  };

  const invalidateCache = async () => {
    if (!user) return;
    if (!confirm("⚠️ Bist du sicher? Dies markiert alle gecachten Daten als inaktiv.")) {
      return;
    }

    setInvalidating(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sync/invalidate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess("✅ Cache wurde invalidiert! Führe jetzt einen Sync durch.");
        loadSyncStatus();
      } else {
        const data = await response.json();
        setError(`❌ Fehler: ${data.error || "Unbekannter Fehler"}`);
      }
    } catch (error: any) {
      setError(`❌ Fehler: ${error.message}`);
    } finally {
      setInvalidating(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return "-";
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "idle":
        return <Badge variant="secondary">Bereit</Badge>;
      case "syncing":
        return <Badge className="bg-blue-500">Synchronisiert...</Badge>;
      case "completed":
      case "success":
        return <Badge className="bg-green-500">Abgeschlossen</Badge>;
      case "error":
        return <Badge variant="destructive">Fehler</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Airtable → Firestore Sync</h1>
            <p className="text-muted-foreground mt-2">
              Synchronisiere System-Daten von Airtable nach Firestore für schnellere Performance.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded whitespace-pre-line">
              {success}
            </div>
          )}

          {/* Sync Progress */}
          {syncProgress && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {syncProgress.status === "running" && (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      )}
                      {syncProgress.status === "success" && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <span className="font-medium text-blue-900">
                        {syncProgress.step} synchronisieren...
                      </span>
                    </div>
                    <span className="text-sm text-blue-700">
                      Schritt {syncProgress.current} von {syncProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {metadata ? getSyncStatusBadge(metadata.syncStatus) : <Badge>-</Badge>}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Letzter Sync</p>
                  <p className="font-medium">{formatDate(metadata?.lastSyncedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dauer</p>
                  <p className="font-medium">{formatDuration(metadata?.lastSyncDuration)}</p>
                </div>
              </div>

              {metadata?.lastSyncError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                  <strong>Letzter Fehler:</strong> {metadata.lastSyncError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={triggerSync}
                  disabled={syncing || metadata?.syncStatus === "syncing"}
                  className="flex-1"
                >
                  {syncing || metadata?.syncStatus === "syncing" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Synchronisiert...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Jetzt Starten
                    </>
                  )}
                </Button>

                <Button
                  onClick={invalidateCache}
                  disabled={invalidating || metadata?.syncStatus === "syncing"}
                  variant="outline"
                >
                  {invalidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invalidiert...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cache Löschen
                    </>
                  )}
                </Button>

                <Button
                  onClick={loadSyncStatus}
                  disabled={metadata?.syncStatus === "syncing"}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Status Aktualisieren
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bilder-Sync Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Bilder-Synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Airtable-Bild-URLs laufen nach ~2 Stunden ab. Hier werden die Bilder permanent
                in Firebase Storage kopiert, damit sie immer verfügbar sind.
              </p>

              {imageStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{imageStatus.total}</p>
                    <p className="text-xs text-muted-foreground">Total Themen</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{imageStatus.inFirebaseStorage}</p>
                    <p className="text-xs text-green-600">In Firebase Storage</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${imageStatus.inAirtable > 0 ? "bg-orange-50" : "bg-muted"}`}>
                    <p className={`text-2xl font-bold ${imageStatus.inAirtable > 0 ? "text-orange-700" : ""}`}>
                      {imageStatus.inAirtable}
                    </p>
                    <p className={`text-xs ${imageStatus.inAirtable > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                      Noch in Airtable (temporär)
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{imageStatus.noImage}</p>
                    <p className="text-xs text-muted-foreground">Ohne Bild</p>
                  </div>
                </div>
              )}

              <Button
                onClick={triggerImageSync}
                disabled={syncingImages || imageStatus?.allSynced}
                variant={imageStatus?.inAirtable && imageStatus.inAirtable > 0 ? "default" : "outline"}
              >
                {syncingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Bilder synchronisieren...
                  </>
                ) : imageStatus?.allSynced ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Alle Bilder synchronisiert
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Bilder jetzt synchronisieren
                    {imageStatus?.inAirtable ? ` (${imageStatus.inAirtable})` : ""}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* LP21 API Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                LP21 Lehrplan-API Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kompetenzen direkt von der offiziellen LP21 Datenschnittstelle (api.lehrplan.ch) laden.
                Dies ersetzt die Airtable-Kompetenzen mit den aktuellen Daten des Lehrplans 21.
              </p>

              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Kanton</label>
                  <Select value={lp21Kanton} onValueChange={setLp21Kanton}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v-fe">Vorlage (Standard)</SelectItem>
                      <SelectItem value="zh">Zürich</SelectItem>
                      <SelectItem value="be">Bern</SelectItem>
                      <SelectItem value="lu">Luzern</SelectItem>
                      <SelectItem value="sg">St. Gallen</SelectItem>
                      <SelectItem value="ag">Aargau</SelectItem>
                      <SelectItem value="so">Solothurn</SelectItem>
                      <SelectItem value="tg">Thurgau</SelectItem>
                      <SelectItem value="sh">Schaffhausen</SelectItem>
                      <SelectItem value="sz">Schwyz</SelectItem>
                      <SelectItem value="gl">Glarus</SelectItem>
                      <SelectItem value="zg">Zug</SelectItem>
                      <SelectItem value="bs">Basel-Stadt</SelectItem>
                      <SelectItem value="bl">Basel-Landschaft</SelectItem>
                      <SelectItem value="nw">Nidwalden</SelectItem>
                      <SelectItem value="ow">Obwalden</SelectItem>
                      <SelectItem value="ur">Uri</SelectItem>
                      <SelectItem value="ai">Appenzell I.</SelectItem>
                      <SelectItem value="ar">Appenzell A.</SelectItem>
                      <SelectItem value="gr-d">Graubünden (DE)</SelectItem>
                      <SelectItem value="vs">Wallis</SelectItem>
                      <SelectItem value="fr">Freiburg</SelectItem>
                      <SelectItem value="fl">Liechtenstein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Fachbereich</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => loadLP21Fachbereiche(lp21Kanton)}
                      disabled={loadingFachbereiche}
                    >
                      {loadingFachbereiche ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Laden...</>
                      ) : (
                        <>Von API laden</>
                      )}
                    </Button>
                  </div>
                  <Select value={lp21Fachbereich} onValueChange={setLp21Fachbereich}>
                    <SelectTrigger className="w-[320px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatisch (MI/IB je nach Kanton)</SelectItem>
                      {lp21Fachbereiche.length > 0 ? (
                        <>
                          {lp21Fachbereiche.map((fb) => (
                            <SelectItem key={fb.code} value={fb.code}>
                              {fb.code} – {fb.bezeichnung}
                            </SelectItem>
                          ))}
                        </>
                      ) : (
                        <>
                          <SelectItem value="MI">MI - Medien und Informatik</SelectItem>
                          <SelectItem value="IB">IB - Informatische Bildung (SO)</SelectItem>
                          <SelectItem value="D">D - Deutsch</SelectItem>
                          <SelectItem value="MA">MA - Mathematik</SelectItem>
                          <SelectItem value="NMG">NMG - Natur, Mensch, Gesellschaft</SelectItem>
                          <SelectItem value="BG">BG - Bildnerisches Gestalten</SelectItem>
                          <SelectItem value="TTG">TTG - Textiles und Techn. Gestalten</SelectItem>
                          <SelectItem value="MU">MU - Musik</SelectItem>
                          <SelectItem value="BS">BS - Bewegung und Sport</SelectItem>
                          <SelectItem value="E">E - Englisch</SelectItem>
                          <SelectItem value="F">F - Französisch</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {lp21Fachbereiche.length > 0 && (
                    <p className="text-xs text-green-600">
                      {lp21Fachbereiche.length} Fachbereiche von LP21 API geladen
                    </p>
                  )}
                </div>

                <Button
                  onClick={triggerLP21Sync}
                  disabled={syncingLP21}
                >
                  {syncingLP21 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      LP21 Sync läuft...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      LP21 Kompetenzen laden
                    </>
                  )}
                </Button>
              </div>

              {lp21Kanton === "so" && lp21Fachbereich === "auto" && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                  Kanton Solothurn: Automatisch wird &quot;IB&quot; (Informatische Bildung) statt &quot;MI&quot; verwendet.
                </div>
              )}

              {syncingLP21 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  Der Crawler traversiert den LP21-Kompetenzbaum. Dies kann 10-30 Sekunden dauern...
                </div>
              )}

              {lp21Result && lp21Result.success && (
                <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">{lp21Result.totalKompetenzstufen}</p>
                      <p className="text-xs text-green-600">Kompetenzstufen</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">{lp21Result.kompetenzbereiche}</p>
                      <p className="text-xs text-green-600">Kompetenzbereiche</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{lp21Result.orientierungspunkte}</p>
                      <p className="text-xs text-orange-500">Orientierungspunkte</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-700">+{lp21Result.added}</p>
                      <p className="text-xs text-blue-600">Neu</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-700">~{lp21Result.updated}</p>
                      <p className="text-xs text-orange-600">Aktualisiert</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 text-center">
                    Crawl: {(lp21Result.crawlDuration / 1000).toFixed(1)}s | Total: {(lp21Result.totalDuration / 1000).toFixed(1)}s
                  </p>
                </div>
              )}

              {lp21Result && !lp21Result.success && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                  Fehler: {lp21Result.error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Sync-Vorgänge</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Sync-Vorgänge durchgeführt.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Zeitpunkt</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Themen</TableHead>
                      <TableHead>Schulen</TableHead>
                      <TableHead>Kompetenzen</TableHead>
                      <TableHead>Lektionen</TableHead>
                      <TableHead>Ausgelöst von</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.status === "success" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(log.triggeredAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDuration(log.duration)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached?.themes || 0}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached?.schulen || 0}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached?.kompetenzen || 0}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached?.lektionen || 0}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.triggeredBy || "System"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">ℹ️ Informationen</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Sync Jetzt Starten:</strong> Synchronisiert alle Airtable-Daten nach Firestore
                inkl. Bilder-Upload zu Firebase Storage. Kann bis zu 2 Minuten dauern.
              </p>
              <p>
                <strong>Cache Löschen:</strong> Markiert alle gecachten Daten als inaktiv.
                Führe danach einen Sync durch, um die Daten neu zu laden.
              </p>
              <p>
                <strong>LP21 API Sync:</strong> Lädt Kompetenzen direkt von der offiziellen
                LP21 Datenschnittstelle. Bestehende Unterrichtsideen-Verknüpfungen werden beibehalten.
              </p>
              <p>
                <strong>Automatischer Sync:</strong> Der Cron Job läuft täglich um 2:00 Uhr morgens
                und hält die Daten automatisch aktuell.
              </p>
              <p>
                <strong>Cache Status:</strong> ENABLE_FIRESTORE_CACHE ={" "}
                <code className="bg-white px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_ENABLE_FIRESTORE_CACHE || "false"}
                </code>
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

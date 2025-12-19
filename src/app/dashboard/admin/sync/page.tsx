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
import { Loader2, RefreshCw, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";

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

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadSyncStatus();
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
        setLogs(data.recentLogs || []);
      }
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const triggerSync = async () => {
    if (!user) return;

    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess("✅ Sync wurde gestartet! Der Prozess läuft im Hintergrund.");
        // Warte 2 Sekunden und lade dann Status neu
        setTimeout(() => {
          loadSyncStatus();
        }, 2000);
      } else {
        const data = await response.json();
        setError(`❌ Sync Fehler: ${data.error || "Unbekannter Fehler"}`);
      }
    } catch (error: any) {
      setError(`❌ Sync Fehler: ${error.message}`);
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
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
              {success}
            </div>
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
                          {log.recordsCached.themes}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached.schulen}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached.kompetenzen}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recordsCached.lektionen}
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
                <strong>Sync Jetzt Starten:</strong> Synchronisiert alle Airtable-Daten nach Firestore.
                Der Prozess läuft im Hintergrund und dauert ca. 10-30 Sekunden.
              </p>
              <p>
                <strong>Cache Löschen:</strong> Markiert alle gecachten Daten als inaktiv.
                Führe danach einen Sync durch, um die Daten neu zu laden.
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

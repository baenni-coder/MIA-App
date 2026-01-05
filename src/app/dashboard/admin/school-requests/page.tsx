"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchoolChangeRequest, SchoolChangeStatus } from "@/types";
import {
  Loader2,
  Building2,
  ArrowRight,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export default function SchoolChangeRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<SchoolChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<SchoolChangeStatus | "all">("pending");

  // Action Dialog
  const [selectedRequest, setSelectedRequest] = useState<SchoolChangeRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkSuperAdminAccess();
  }, [user]);

  const checkSuperAdminAccess = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/auth/check-admin", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await response.json();

      if (data.role !== "super_admin") {
        alert("Nur Super-Admins haben Zugriff auf diese Seite");
        router.push("/dashboard/admin");
        return;
      }

      setIsSuperAdmin(true);
      loadRequests();
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
    }
  };

  const loadRequests = async (status?: SchoolChangeStatus) => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const url = status
        ? `/api/admin/school-change-requests?status=${status}`
        : "/api/admin/school-change-requests";

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load requests");

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error loading requests:", error);
      alert("Fehler beim Laden der Anfragen");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as SchoolChangeStatus | "all");
    if (tab === "all") {
      loadRequests();
    } else {
      loadRequests(tab as SchoolChangeStatus);
    }
  };

  const handleApprove = (request: SchoolChangeRequest) => {
    setSelectedRequest(request);
    setActionType("approve");
  };

  const handleReject = (request: SchoolChangeRequest) => {
    setSelectedRequest(request);
    setActionType("reject");
    setRejectNotes("");
  };

  const handleConfirmAction = async () => {
    if (!user || !selectedRequest || !actionType) return;

    setIsProcessing(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch(
        `/api/admin/school-change-requests/${selectedRequest.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: actionType,
            reviewNotes: actionType === "reject" ? rejectNotes : undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Verarbeiten");
      }

      // Schliesse Dialog und lade neu
      setSelectedRequest(null);
      setActionType(null);
      setRejectNotes("");

      // Bleibe auf aktuellem Tab und lade neu
      if (activeTab === "all") {
        loadRequests();
      } else {
        loadRequests(activeTab as SchoolChangeStatus);
      }
    } catch (error) {
      console.error("Error processing request:", error);
      alert(error instanceof Error ? error.message : "Fehler beim Verarbeiten");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: SchoolChangeStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Ausstehend
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Genehmigt
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );
    }
  };

  // Filter requests based on active tab
  const filteredRequests =
    activeTab === "all"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (!isSuperAdmin) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Schulwechsel-Anfragen
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount}</Badge>
                )}
              </h1>
              <p className="text-muted-foreground">
                Genehmigen oder lehnen Sie Schulwechsel-Anfragen ab
              </p>
            </div>
            <Button variant="outline" onClick={() => loadRequests()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="relative">
                Ausstehend
                {pendingCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Genehmigt</TabsTrigger>
              <TabsTrigger value="rejected">Abgelehnt</TabsTrigger>
              <TabsTrigger value="all">Alle</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {/* Loading */}
              {loading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Lade Anfragen...</p>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!loading && filteredRequests.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {activeTab === "pending"
                        ? "Keine ausstehenden Anfragen"
                        : activeTab === "approved"
                        ? "Keine genehmigten Anfragen"
                        : activeTab === "rejected"
                        ? "Keine abgelehnten Anfragen"
                        : "Keine Anfragen vorhanden"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Requests List */}
              {!loading && filteredRequests.length > 0 && (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <Card key={request.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {request.teacherName}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {request.teacherEmail}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>

                          {/* School Change */}
                          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                Aktuelle Schule
                              </p>
                              <p className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {request.currentSchuleName}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                Neue Schule
                              </p>
                              <p className="font-medium flex items-center gap-2 text-primary">
                                <Building2 className="h-4 w-4" />
                                {request.newSchuleName}
                              </p>
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Angefragt: {formatDate(request.createdAt)}
                            </span>
                            {request.reviewedAt && (
                              <span>
                                • Bearbeitet: {formatDate(request.reviewedAt)}
                              </span>
                            )}
                          </div>

                          {/* Review Notes (if rejected) */}
                          {request.status === "rejected" && request.reviewNotes && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-medium text-red-800 mb-1">
                                Ablehnungsgrund:
                              </p>
                              <p className="text-sm text-red-700">
                                {request.reviewNotes}
                              </p>
                            </div>
                          )}

                          {/* Reviewer Info */}
                          {request.reviewedByName && (
                            <p className="text-sm text-muted-foreground">
                              Bearbeitet von: {request.reviewedByName}
                            </p>
                          )}

                          {/* Actions */}
                          {request.status === "pending" && (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="default"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(request)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Genehmigen
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleReject(request)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Ablehnen
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Approve Confirmation Dialog */}
        <Dialog
          open={actionType === "approve" && !!selectedRequest}
          onOpenChange={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Schulwechsel genehmigen?
              </DialogTitle>
              <DialogDescription>
                Möchten Sie den Schulwechsel für{" "}
                <strong>{selectedRequest?.teacherName}</strong> genehmigen?
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="py-4">
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Von</p>
                    <p className="font-medium">
                      {selectedRequest.currentSchuleName}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Zu</p>
                    <p className="font-medium text-primary">
                      {selectedRequest.newSchuleName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                }}
                disabled={isProcessing}
              >
                Abbrechen
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleConfirmAction}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Genehmigen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog
          open={actionType === "reject" && !!selectedRequest}
          onOpenChange={() => {
            setSelectedRequest(null);
            setActionType(null);
            setRejectNotes("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Schulwechsel ablehnen
              </DialogTitle>
              <DialogDescription>
                Bitte geben Sie einen Grund für die Ablehnung an.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Von</p>
                    <p className="font-medium">
                      {selectedRequest.currentSchuleName}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Zu</p>
                    <p className="font-medium">{selectedRequest.newSchuleName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Begründung <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Bitte erklären Sie, warum der Schulwechsel abgelehnt wird..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                  setRejectNotes("");
                }}
                disabled={isProcessing}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmAction}
                disabled={isProcessing || !rejectNotes.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Ablehnen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

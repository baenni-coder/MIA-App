"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CustomTheme } from "@/types";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface AdminThemeReviewProps {
  theme: CustomTheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete?: () => void;
}

export default function AdminThemeReview({
  theme,
  open,
  onOpenChange,
  onReviewComplete,
}: AdminThemeReviewProps) {
  const { user } = useAuth();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReview = async (reviewAction: "approve" | "reject") => {
    // Validation
    if (reviewAction === "reject" && !reviewNotes.trim()) {
      alert("Bitte geben Sie einen Grund für die Ablehnung an.");
      return;
    }

    if (
      !confirm(
        reviewAction === "approve"
          ? "Thema freigeben und systemweit verfügbar machen?"
          : "Thema ablehnen?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/custom-themes/${theme.id}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: reviewAction,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to review theme");
      }

      alert(
        reviewAction === "approve"
          ? "Thema wurde freigegeben!"
          : "Thema wurde abgelehnt."
      );

      // Reset und schließen
      setReviewNotes("");
      setAction(null);
      onOpenChange(false);

      if (onReviewComplete) {
        onReviewComplete();
      }
    } catch (error) {
      console.error("Error reviewing theme:", error);
      alert("Fehler beim Review: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thema prüfen: {theme.thema}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Details */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{theme.thema}</h3>
                <p className="text-sm text-gray-600">{theme.beschreibung}</p>
              </div>
              {theme.bildLehrmittel && (
                <img
                  src={theme.bildLehrmittel}
                  alt={theme.thema}
                  className="w-32 h-32 object-cover rounded-md ml-4"
                />
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold">Ersteller:</span>{" "}
                {theme.createdByName}
              </div>
              <div>
                <span className="font-semibold">Lehrmittel:</span>{" "}
                {theme.lehrmittel || "-"}
              </div>
              <div>
                <span className="font-semibold">Lektionen:</span>{" "}
                {theme.anzahlLektionen}
              </div>
              <div>
                <span className="font-semibold">Zeitraum:</span> {theme.zeitraum}
              </div>
            </div>

            <div>
              <span className="font-semibold text-sm">Klassenstufen: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {theme.schuljahr.map((stufe) => (
                  <Badge key={stufe} variant="secondary">
                    {stufe}
                  </Badge>
                ))}
              </div>
            </div>

            {theme.kompetenzen && theme.kompetenzen.length > 0 && (
              <div>
                <span className="font-semibold text-sm">Kompetenzen: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {theme.kompetenzen.map((komp) => (
                    <Badge key={komp.id} variant="outline">
                      {komp.lpCode || komp.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {theme.fileRouge && (
              <div className="text-sm">
                <span className="font-semibold">File rouge:</span> {theme.fileRouge}
              </div>
            )}

            {theme.unterlagen && (
              <div className="text-sm">
                <span className="font-semibold">Unterlagen:</span>{" "}
                <a
                  href={theme.unterlagen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {theme.unterlagen}
                </a>
              </div>
            )}
          </div>

          {/* Review Feedback Input */}
          <div className="border-t pt-4">
            <Label htmlFor="reviewNotes">
              Feedback für den Ersteller
              {action === "reject" && (
                <span className="text-red-500"> (Pflichtfeld bei Ablehnung)</span>
              )}
            </Label>
            <Textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                action === "approve"
                  ? "Optional: Feedback oder Kommentare..."
                  : "Bitte erklären Sie, warum das Thema abgelehnt wird..."
              }
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setReviewNotes("");
              setAction(null);
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setAction("reject");
              handleReview("reject");
            }}
            disabled={loading}
          >
            {loading && action === "reject" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Ablehnen
          </Button>
          <Button
            onClick={() => {
              setAction("approve");
              handleReview("approve");
            }}
            disabled={loading}
          >
            {loading && action === "approve" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Freigeben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import CustomThemeForm from "@/components/CustomThemeForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";
import { kwToZeitraum } from "@/lib/data/lp21-data";
import type { JahresplanEinheit, Stufe } from "@/types";

/**
 * Veröffentlicht eine bestehende Jahresplanungs-Einheit als MIA-Thema.
 * Wiederverwendung von CustomThemeForm mit aus der Einheit vorbefüllten Werten.
 */
export default function EinheitAlsMiaThemaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const einheitId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [einheit, setEinheit] = useState<JahresplanEinheit | null>(null);
  const [teacherStufe, setTeacherStufe] = useState<Stufe | undefined>(undefined);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setLoading(true);
        const token = await user.getIdToken();

        const [einheitRes, teacherRes] = await Promise.all([
          fetch(`/api/jahresplanung/${einheitId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/teachers?userId=${user.uid}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!einheitRes.ok) {
          setError("Einheit konnte nicht geladen werden.");
          return;
        }
        const einheitData = await einheitRes.json();
        setEinheit(einheitData.einheit as JahresplanEinheit);

        if (teacherRes.ok) {
          const t = await teacherRes.json();
          if (t.stufe) setTeacherStufe(t.stufe as Stufe);
        }
      } catch (err) {
        console.error("Error loading einheit for publish:", err);
        setError("Ein Fehler ist aufgetreten.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, einheitId]);

  // Bereits veröffentlicht? Dann zurück zur Einheit.
  useEffect(() => {
    if (einheit?.publishedThemeId) {
      router.replace(`/dashboard/jahresplanung/einheit/${einheitId}`);
    }
  }, [einheit, einheitId, router]);

  const initialData = useMemo(() => {
    if (!einheit) return undefined;
    return {
      thema: einheit.titel || "",
      beschreibung: einheit.lernziele || "",
      schuljahr: teacherStufe ? [teacherStufe] : [],
      zeitraum: kwToZeitraum(einheit.zeitraumStart, einheit.schuljahr),
      // Kompetenzen bewusst leer: Einheit nutzt LP21, MIA-Thema nutzt Airtable-
      // Kompetenzen. Die Lehrperson wählt sie im Formular.
      kompetenzenIds: [],
    };
  }, [einheit, teacherStufe]);

  // Nach erfolgreichem Speichern: Einheit mit dem Thema verknüpfen.
  const handleSuccess = async (themeId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();

      // Status + Name aus dem erstellten Thema lesen
      let publishedThemeName = einheit?.titel || "";
      let publishedThemeStatus = "pending_review";
      try {
        const themeRes = await fetch(`/api/custom-themes/${themeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (themeRes.ok) {
          const { theme } = await themeRes.json();
          publishedThemeName = theme?.thema || publishedThemeName;
          publishedThemeStatus = theme?.status || publishedThemeStatus;
        }
      } catch {
        // Nicht kritisch – Defaults verwenden
      }

      await fetch(`/api/jahresplanung/${einheitId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          publishedThemeId: themeId,
          publishedThemeName,
          publishedThemeStatus,
        }),
      });
    } catch (err) {
      console.error("Error linking published theme to einheit:", err);
    } finally {
      router.push(`/dashboard/jahresplanung/einheit/${einheitId}`);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(`/dashboard/jahresplanung/einheit/${einheitId}`)
            }
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Einheit
          </Button>

          <div>
            <h1 className="text-2xl font-bold">Als MIA-Thema einreichen</h1>
            <p className="text-gray-500 mt-1">
              Diese Einheit wird als MIA-Thema erstellt und – nach Freigabe durch
              die PICTS-Verantwortlichen – im Jahresplan MIA sichtbar.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Titel, Lernziele, Zeitraum und Stufe sind aus der Einheit
              vorbefüllt. Die <strong>Kompetenzen</strong> müssen hier neu gewählt
              werden, da der Jahresplan MIA die Lehrplan-Kompetenzen aus der
              MIA-Datenbank verwendet.
            </span>
          </div>

          {loading && <p className="text-gray-500">Wird geladen…</p>}
          {error && (
            <p className="text-red-600">
              {error}{" "}
              <Link
                href={`/dashboard/jahresplanung/einheit/${einheitId}`}
                className="underline"
              >
                Zurück
              </Link>
            </p>
          )}

          {!loading && !error && einheit && !einheit.publishedThemeId && (
            <CustomThemeForm
              mode="create"
              initialData={initialData}
              sourceEinheitId={einheitId}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

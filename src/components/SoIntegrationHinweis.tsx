"use client";

import Link from "next/link";
import { AlertTriangle, Target, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Teacher } from "@/types";
import { Button } from "@/components/ui/button";

interface SoIntegrationHinweisProps {
  teacher: Teacher | null;
  /**
   * Optional: aktuell gewähltes Schuljahr (Format "2027/2028"). Wenn nicht
   * gesetzt, vergleicht die Komponente gegen das laufende Schuljahr.
   */
  schuljahr?: string;
}

/**
 * Schuljahr-Vergleich: gibt true zurück, wenn `schuljahr` gleich oder neuer
 * als die `cutoff`-Schuljahr-Kennung ist (Format "YYYY/YYYY").
 */
function isSchuljahrAtOrAfter(schuljahr: string, cutoff: string): boolean {
  const start = (s: string) => parseInt(s.split("/")[0] || "0", 10);
  return start(schuljahr) >= start(cutoff);
}

function getCurrentSchuljahr(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month < 7) return `${year - 1}/${year}`;
  return `${year}/${year + 1}`;
}

const STORAGE_KEY = "so-integration-hinweis-dismissed";
const SO_IB_END_SCHULJAHR = "2027/2028"; // Ab diesem SJ kein Fach IB mehr in SO

export default function SoIntegrationHinweis({
  teacher,
  schuljahr,
}: SoIntegrationHinweisProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Lazy: localStorage erst clientseitig auslesen, sonst Hydration-Mismatch
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "true");
    }
  }, []);

  if (dismissed) return null;
  if (!teacher) return null;
  if (teacher.kanton !== "SO") return null;

  const sj = schuljahr || getCurrentSchuljahr();
  if (!isSchuljahrAtOrAfter(sj, SO_IB_END_SCHULJAHR)) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 relative">
      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-900">
          Ab Schuljahr 2027/28: integrative Umsetzung im Kanton Solothurn
        </p>
        <p className="text-sm text-amber-800 mt-1">
          Im Kanton Solothurn wird das Fach „Informatische Bildung&ldquo; (IB) ab
          Sommer 2027 nicht mehr als eigenständiges Fach unterrichtet. Die
          IB-Kompetenzen bleiben aber Pflicht und müssen integrativ in andere
          Fächer einfliessen. Mit der MIA-Abdeckung sehen Sie auf einen Blick,
          wo Lücken sind.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href="/dashboard/jahresplanung/mia-abdeckung">
            <Button
              size="sm"
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              <Target className="h-4 w-4 mr-1.5" />
              Zur MIA-Abdeckung
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={dismiss}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
          >
            Hinweis ausblenden
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis schliessen"
        className="text-amber-700 hover:text-amber-900 p-1 -m-1 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

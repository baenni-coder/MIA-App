"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { LehrmittelVorlage, SchulferienCustom } from "@/types";
import {
  getAktuellesSchuljahr,
  getSchuljahrListe,
  getSchulwochenFuerSchuljahr,
} from "@/lib/data/lp21-data";
import {
  defaultWochen,
  formatWochenRichtwert,
  miaCodes,
  planeVorlage,
  type VorlageAuswahl,
} from "@/lib/data/lehrmittel-vorlagen";

interface Props {
  vorlage: LehrmittelVorlage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bereits vorhandene Einheiten dieses Lehrmittels (pro Schuljahr) für Warnhinweis */
  bestehendeEinheitenProSchuljahr?: Record<string, number>;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export default function VorlageUebernehmenDialog({
  vorlage,
  open,
  onOpenChange,
  bestehendeEinheitenProSchuljahr = {},
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const schuljahre = useMemo(() => getSchuljahrListe(3, 0), []);
  const [schuljahr, setSchuljahr] = useState(getAktuellesSchuljahr());
  const [customFerien, setCustomFerien] = useState<SchulferienCustom[]>([]);
  const [startKW, setStartKW] = useState<number>(33);
  const [auswahl, setAuswahl] = useState<Record<string, { aktiv: boolean; wochen: number }>>(
    () =>
      Object.fromEntries(
        vorlage.bloecke.map((b) => [b.id, { aktiv: !b.optional, wochen: defaultWochen(b) }])
      )
  );
  const [saving, setSaving] = useState(false);

  // Custom-Ferien der Lehrperson für das Schuljahr laden
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/jahresplanung/ferien?schuljahr=${encodeURIComponent(schuljahr)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!cancelled && res.ok) {
          const d = await res.json();
          setCustomFerien(d.ferien || []);
        }
      } catch (err) {
        console.error("Error loading ferien:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, schuljahr]);

  const schulwochen = useMemo(
    () =>
      getSchulwochenFuerSchuljahr(
        "SO_BeLoSe",
        schuljahr,
        customFerien.length > 0 ? customFerien : undefined
      ),
    [schuljahr, customFerien]
  );

  // Start-KW auf erste Schulwoche setzen, wenn Schuljahr wechselt
  useEffect(() => {
    const first = schulwochen.find((w) => !w.istFerien);
    if (first) setStartKW(first.kw);
  }, [schulwochen]);

  const auswahlListe: VorlageAuswahl[] = vorlage.bloecke
    .filter((b) => auswahl[b.id]?.aktiv)
    .map((b) => ({ blockId: b.id, wochen: auswahl[b.id].wochen }));

  const plan = useMemo(
    () => planeVorlage(vorlage, auswahlListe, schulwochen, startKW),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vorlage, JSON.stringify(auswahlListe), schulwochen, startKW]
  );
  const anzahlNichtPlatziert = plan.filter((p) => !p.passt).length;
  const summeWochen = vorlage.bloecke
    .filter((b) => auswahl[b.id]?.aktiv && !b.begleitend)
    .reduce((s, b) => s + auswahl[b.id].wochen, 0);
  const verfuegbareWochen = schulwochen
    .slice(Math.max(0, schulwochen.findIndex((w) => w.kw === startKW)))
    .filter((w) => !w.istFerien).length;
  const bestehende = bestehendeEinheitenProSchuljahr[schuljahr] || 0;

  const zeitraumLabel = (blockId: string) => {
    const p = plan.find((x) => x.block.id === blockId);
    if (!p) return null;
    if (!p.passt) return <span className="text-red-600">passt nicht mehr ins Schuljahr</span>;
    return p.teile.map((t) => `KW ${t.zeitraumStart}–${t.zeitraumEnde}`).join(" + ");
  };

  const handleSubmit = async () => {
    if (!user || auswahlListe.length === 0) return;
    try {
      setSaving(true);
      const token = await user.getIdToken();
      const res = await fetch("/api/jahresplanung/vorlage-uebernehmen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vorlageId: vorlage.id,
          schuljahr,
          startKW,
          bloecke: auswahlListe,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Fehler beim Übernehmen");
      let msg = `${d.count} Einheiten wurden in die Jahresplanung ${schuljahr} übernommen.`;
      if (d.miaZugeordnet > 0) {
        msg += `\n\n${d.miaZugeordnet} MIA-Kompetenz(en) wurden zugeordnet – sie zählen in der MIA-Abdeckung.`;
      }
      if (d.unaufgeloesteCodes?.length) {
        msg += `\n\n${d.unaufgeloesteCodes.length} LP21-Code(s) sind in der App (noch) nicht als Kompetenz vorhanden und stehen nur im Lernziel-Text.`;
      }
      if (d.nichtPlatziert?.length) {
        msg += `\n\nNicht mehr ins Schuljahr gepasst: ${d.nichtPlatziert.join(", ")}`;
      }
      alert(msg);
      onOpenChange(false);
      router.push(`/dashboard/jahresplanung?schuljahr=${encodeURIComponent(schuljahr)}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  let letztePhase = "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{vorlage.titel} übernehmen</DialogTitle>
          <DialogDescription>
            Jeder ausgewählte Block wird als Einheit ({vorlage.fachbereichId}) in Ihre
            Jahresplanung eingetragen – nacheinander ab der Start-KW, Ferienwochen werden
            übersprungen. Lernzielkontrollen werden als summative Beurteilung in der
            letzten Woche gesetzt. Alles bleibt danach frei anpassbar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="vorlage-sj">Schuljahr</Label>
              <select
                id="vorlage-sj"
                className={selectClass}
                value={schuljahr}
                onChange={(e) => setSchuljahr(e.target.value)}
              >
                {schuljahre.map((sj) => (
                  <option key={sj} value={sj}>
                    {sj}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="vorlage-kw">Beginnen in</Label>
              <select
                id="vorlage-kw"
                className={selectClass}
                value={startKW}
                onChange={(e) => setStartKW(Number(e.target.value))}
              >
                {schulwochen
                  .filter((w) => !w.istFerien)
                  .map((w) => (
                    <option key={`${w.jahr}-${w.kw}`} value={w.kw}>
                      KW {w.kw} ({w.jahr})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {bestehende > 0 && (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Sie haben in {schuljahr} bereits {bestehende} Einheit(en) mit «
              {vorlage.lehrmittel}». Eine erneute Übernahme legt zusätzliche Einheiten an.
            </div>
          )}

          <div className="rounded-md border divide-y max-h-[45vh] overflow-y-auto">
            {vorlage.bloecke.map((b) => {
              const state = auswahl[b.id];
              const phaseHeader = b.phase !== letztePhase;
              letztePhase = b.phase;
              return (
                <div key={b.id}>
                  {phaseHeader && (
                    <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {b.phase}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={state.aktiv}
                      aria-label={`${b.titel} übernehmen`}
                      onChange={(e) =>
                        setAuswahl((prev) => ({
                          ...prev,
                          [b.id]: { ...prev[b.id], aktiv: e.target.checked },
                        }))
                      }
                    />
                    <div className="flex-1 min-w-[12rem]">
                      <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                        {b.titel}
                        {b.beurteilung && (
                          <Badge variant="outline" className="text-xs">
                            {b.beurteilung}
                          </Badge>
                        )}
                        {miaCodes(b).length > 0 && (
                          <Badge className="text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-200">
                            MIA: {miaCodes(b).join(", ")}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.begleitend ? "Läuft begleitend" : <>Richtwert {formatWochenRichtwert(b)}</>}
                        {b.zeitraumHinweis && <> ({b.zeitraumHinweis})</>}
                        {state.aktiv && <> · {zeitraumLabel(b.id)}</>}
                      </div>
                    </div>
                    {!b.begleitend && (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        className="w-16 h-8"
                        value={state.wochen}
                        disabled={!state.aktiv}
                        aria-label={`Wochen für ${b.titel}`}
                        onChange={(e) =>
                          setAuswahl((prev) => ({
                            ...prev,
                            [b.id]: {
                              ...prev[b.id],
                              wochen: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                            },
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">Wo.</span>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            {summeWochen} von {verfuegbareWochen} verbleibenden Schulwochen verplant.
            {anzahlNichtPlatziert > 0 && (
              <span className="text-red-600">
                {" "}
                {anzahlNichtPlatziert} Block/Blöcke passen nicht mehr ins Schuljahr und
                werden nicht übernommen.
              </span>
            )}
          </p>
          {vorlage.quelle && (
            <p className="text-xs text-muted-foreground">Quelle: {vorlage.quelle}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || auswahlListe.length === anzahlNichtPlatziert}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            In Jahresplanung übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

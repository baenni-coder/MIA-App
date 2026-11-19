"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LehrmittelVorlage, LehrmittelVorlageBlock } from "@/types";
import { getVorlagenReihe } from "@/lib/data/lehrmittel-vorlagen";

interface Props {
  reihe: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Spalte hervorheben (z.B. Band der aktuell geöffneten Vorlage) */
  aktivesLehrmittel?: string;
}

interface Zelle {
  vorlage: LehrmittelVorlage;
  block: LehrmittelVorlageBlock;
}

const codeSort = (a: string, b: string) => a.localeCompare(b, "de", { numeric: true });

/**
 * Spiralprinzip einer Lehrmittel-Reihe (z.B. NaTech 1|2 → 3|4 → 5|6):
 * Zeilen = Themenstränge, Spalten = Bände. Codes, die im selben Strang in
 * mehreren Bänden vorkommen, sind hervorgehoben; ein Klick auf einen Code
 * markiert alle Themen der Reihe mit dieser Kompetenz.
 */
export default function SpiralprinzipDialog({ reihe, open, onOpenChange, aktivesLehrmittel }: Props) {
  const [markiert, setMarkiert] = useState<string | null>(null);

  const { baende, straenge, zellen, texte, alleCodes } = useMemo(() => {
    const vorlagen = getVorlagenReihe(reihe);
    const baende: Array<{ lehrmittel: string; stufen: string[] }> = [];
    const zellen = new Map<string, Zelle[]>(); // `${strangNr}|${lehrmittel}`
    const strangNamen = new Map<number, string[]>();
    const texte: Record<string, string> = {};
    const alleCodes = new Set<string>();
    vorlagen.forEach((v) => {
      Object.assign(texte, v.lp21Texte || {});
      let band = baende.find((b) => b.lehrmittel === v.lehrmittel);
      if (!band) {
        band = { lehrmittel: v.lehrmittel, stufen: [] };
        baende.push(band);
      }
      band.stufen.push(...v.stufen);
      v.bloecke.forEach((b) => {
        const nr = b.strangNr ?? 0;
        const namen = strangNamen.get(nr) || [];
        if (b.strang && !namen.includes(b.strang)) namen.push(b.strang);
        strangNamen.set(nr, namen);
        const key = `${nr}|${v.lehrmittel}`;
        zellen.set(key, [...(zellen.get(key) || []), { vorlage: v, block: b }]);
        (b.lp21Codes || []).forEach((c) => alleCodes.add(c));
      });
    });
    const straenge = Array.from(strangNamen.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([nr, namen]) => ({ nr, label: namen.join(" / ") }));
    return { baende, straenge, zellen, texte, alleCodes: Array.from(alleCodes).sort(codeSort) };
  }, [reihe]);

  /** Kommt der Code im selben Strang in mehr als einem Band vor? */
  const wiederkehrend = (nr: number, code: string) =>
    baende.filter((band) =>
      (zellen.get(`${nr}|${band.lehrmittel}`) || []).some((z) => z.block.lp21Codes?.includes(code))
    ).length > 1;

  const treffer = markiert
    ? baende.flatMap((band) =>
        straenge.flatMap((s) =>
          (zellen.get(`${s.nr}|${band.lehrmittel}`) || []).filter((z) =>
            z.block.lp21Codes?.includes(markiert)
          )
        )
      )
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setMarkiert(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Spiralprinzip {reihe}</DialogTitle>
          <DialogDescription>
            Dieselben Themenstränge kehren in jedem Band auf höherem Niveau wieder. Fett
            umrandete Codes kommen im selben Strang in mehreren Bänden vor. Klicken Sie auf
            einen Code, um alle Themen mit dieser Kompetenz zu markieren.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="spirale-code" className="text-muted-foreground">
            Kompetenz verfolgen:
          </label>
          <select
            id="spirale-code"
            className="h-8 max-w-full rounded-md border bg-background px-2 text-sm"
            value={markiert || ""}
            onChange={(e) => setMarkiert(e.target.value || null)}
          >
            <option value="">– keine –</option>
            {alleCodes.map((c) => (
              <option key={c} value={c}>
                {c}
                {texte[c] ? ` – ${texte[c].length > 70 ? texte[c].slice(0, 69) + "…" : texte[c]}` : ""}
              </option>
            ))}
          </select>
          {markiert && (
            <Button variant="ghost" size="sm" onClick={() => setMarkiert(null)}>
              Zurücksetzen
            </Button>
          )}
        </div>
        {markiert && (
          <p className="text-sm rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2">
            <span className="font-mono font-semibold">{markiert}</span>
            {texte[markiert] && <> – {texte[markiert]}</>}
            <br />
            <span className="text-muted-foreground">
              {treffer.length} {treffer.length === 1 ? "Thema" : "Themen"}:{" "}
              {treffer.map((z) => `${z.block.titel} (${z.vorlage.stufen.join(", ")})`).join(" → ")}
            </span>
          </p>
        )}

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="w-40 text-left text-xs font-medium text-muted-foreground align-bottom">
                  Themenstrang
                </th>
                {baende.map((band) => (
                  <th
                    key={band.lehrmittel}
                    className={`rounded-md px-2 py-1.5 text-left font-semibold ${
                      band.lehrmittel === aktivesLehrmittel
                        ? "bg-emerald-100 dark:bg-emerald-950/50"
                        : "bg-muted"
                    }`}
                  >
                    {band.lehrmittel}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {band.stufen.join(", ")}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {straenge.map((s) => (
                <tr key={s.nr}>
                  <th className="text-left align-top px-1 py-1.5 font-medium">
                    <span className="text-muted-foreground mr-1">{s.nr}</span>
                    {s.label}
                  </th>
                  {baende.map((band) => {
                    const liste = zellen.get(`${s.nr}|${band.lehrmittel}`) || [];
                    const hit = !!markiert && liste.some((z) => z.block.lp21Codes?.includes(markiert));
                    return (
                      <td
                        key={band.lehrmittel}
                        className={`align-top rounded-md border px-2 py-1.5 transition-colors ${
                          hit
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                            : markiert
                              ? "opacity-50"
                              : ""
                        }`}
                      >
                        {liste.map((z) => (
                          <div key={z.vorlage.id + z.block.id}>
                            <div className="font-medium leading-snug">{z.block.titel}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {z.vorlage.stufen.join(", ")}
                              {z.block.strang && z.block.strang !== s.label && <> · {z.block.strang}</>}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(z.block.lp21Codes || []).map((c) => {
                                const wk = wiederkehrend(s.nr, c);
                                const aktiv = c === markiert;
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    title={texte[c] ? `${c}: ${texte[c]}` : c}
                                    onClick={() => setMarkiert(aktiv ? null : c)}
                                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] border ${
                                      aktiv
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : wk
                                          ? "border-emerald-600 font-semibold text-emerald-800 dark:text-emerald-300"
                                          : "border-border text-muted-foreground"
                                    }`}
                                  >
                                    {c}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

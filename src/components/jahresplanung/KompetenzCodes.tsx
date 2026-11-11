"use client";

import { useState } from "react";
import { gruppiereKompetenzen, gruppenTooltip } from "@/lib/kompetenz-codes";

interface Props {
  namen: string[] | undefined;
  /** Zeigt einen Umschalter, um die Kompetenzen ausgeschrieben anzuzeigen (für Touch-Geräte). */
  ausklappbar?: boolean;
  className?: string;
}

/**
 * LP21-Kompetenzen kompakt als Code-Chips (Stufen derselben Kompetenz
 * zusammengefasst, z.B. "MA.1.A.1.c–e"). Der volle Text erscheint als
 * Tooltip (Mouse-Over) bzw. über „Ausschreiben".
 */
export default function KompetenzCodes({ namen, ausklappbar = false, className = "" }: Props) {
  const [offen, setOffen] = useState(false);
  const gruppen = gruppiereKompetenzen(namen);
  if (gruppen.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1">
        {gruppen.map((g) => (
          <span
            key={g.label}
            title={gruppenTooltip(g)}
            className="cursor-help rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] leading-tight text-foreground"
          >
            {g.label}
          </span>
        ))}
        {ausklappbar && (
          <button
            type="button"
            onClick={() => setOffen((o) => !o)}
            className="ml-1 text-xs text-primary hover:underline"
            aria-expanded={offen}
          >
            {offen ? "Ausblenden" : "Ausschreiben"}
          </button>
        )}
      </div>
      {ausklappbar && offen && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {gruppen.flatMap((g) =>
            g.eintraege.map((e) => (
              <li key={e.code}>
                <span className="font-mono text-foreground">{e.code}</span>
                {e.text && <>: {e.text}</>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

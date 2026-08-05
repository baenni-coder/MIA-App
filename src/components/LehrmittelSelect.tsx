"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import type { Lehrmittel } from "@/types";

interface LehrmittelSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Eingabefeld für ein Lehrmittel mit Vorschlägen aus dem Register
 * (systemweit + eigene Schule). Nutzt ein natives <datalist>, sodass sowohl
 * die Auswahl bestehender als auch die Eingabe neuer (Freitext-)Lehrmittel
 * möglich ist. Gespeichert wird immer der Name-String.
 */
export default function LehrmittelSelect({
  value,
  onChange,
  placeholder = "Lehrmittel wählen oder eingeben",
  id,
}: LehrmittelSelectProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Lehrmittel[]>([]);
  const listId = id ? `${id}-list` : "lehrmittel-list";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/lehrmittel", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSuggestions(data.lehrmittel || []);
      } catch (err) {
        console.error("Error loading lehrmittel suggestions:", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((l) => (
          <option key={l.id} value={l.name} />
        ))}
      </datalist>
    </>
  );
}

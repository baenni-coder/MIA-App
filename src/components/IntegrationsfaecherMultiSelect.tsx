"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Fachbereich, FACHBEREICHE } from "@/types";
import { X } from "lucide-react";

interface IntegrationsfaecherMultiSelectProps {
  value: Fachbereich[];
  onChange: (value: Fachbereich[]) => void;
  disabled?: boolean;
  showSummary?: boolean;
}

export default function IntegrationsfaecherMultiSelect({
  value,
  onChange,
  disabled = false,
  showSummary = true,
}: IntegrationsfaecherMultiSelectProps) {
  const toggle = (fb: Fachbereich) => {
    if (disabled) return;
    if (value.includes(fb)) {
      onChange(value.filter((v) => v !== fb));
    } else {
      onChange([...value, fb]);
    }
  };

  const remove = (fb: Fachbereich) => {
    if (disabled) return;
    onChange(value.filter((v) => v !== fb));
  };

  return (
    <div className="space-y-3">
      {showSummary && value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((fb) => {
            const meta = FACHBEREICHE.find((f) => f.value === fb);
            return (
              <Badge
                key={fb}
                variant="secondary"
                className="flex items-center gap-1.5 pr-1"
                style={{
                  backgroundColor: `${meta?.farbe}15`,
                  color: meta?.farbe,
                  borderColor: `${meta?.farbe}40`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta?.farbe }}
                />
                {meta?.label || fb}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(fb)}
                    className="ml-1 rounded-full p-0.5 hover:bg-black/10"
                    aria-label={`${meta?.label || fb} entfernen`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FACHBEREICHE.map((fb) => {
          const checked = value.includes(fb.value);
          return (
            <label
              key={fb.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition-colors ${
                checked
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(fb.value)}
                disabled={disabled}
              />
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: fb.farbe }}
              />
              <span className="truncate">{fb.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

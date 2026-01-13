"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  AvatarConfig,
  AvatarStyle,
  AVATAR_STYLES,
  DEFAULT_AVATAR_CONFIG,
} from "@/types";
import { Button } from "./ui/button";
import { RefreshCw, Shuffle } from "lucide-react";

interface StudentAvatarProps {
  config?: AvatarConfig;
  studentId?: string; // Falls kein config, als Seed verwenden
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBorder?: boolean;
}

interface AvatarEditorProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  className?: string;
}

// Generiert die DiceBear URL basierend auf der Konfiguration
export function getDiceBearUrl(config: AvatarConfig, size: number = 128): string {
  const { style, seed, backgroundColor, options } = config;

  // Base URL für DiceBear API
  let url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

  // Hintergrundfarbe hinzufügen
  if (backgroundColor) {
    url += `&backgroundColor=${backgroundColor}`;
  }

  // Größe hinzufügen
  url += `&size=${size}`;

  // Zusätzliche Optionen hinzufügen
  if (options) {
    Object.entries(options).forEach(([key, value]) => {
      url += `&${key}=${encodeURIComponent(String(value))}`;
    });
  }

  return url;
}

// Generiert einen zufälligen Seed
export function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Avatar-Anzeige Komponente
export function StudentAvatar({
  config,
  studentId,
  size = "md",
  className,
  showBorder = true,
}: StudentAvatarProps) {
  // Fallback zu Default-Config mit studentId als Seed
  const avatarConfig = useMemo(() => {
    if (config) return config;
    return {
      ...DEFAULT_AVATAR_CONFIG,
      seed: studentId || generateRandomSeed(),
    };
  }, [config, studentId]);

  const sizeMap = {
    sm: { px: 32, className: "h-8 w-8" },
    md: { px: 48, className: "h-12 w-12" },
    lg: { px: 80, className: "h-20 w-20" },
    xl: { px: 128, className: "h-32 w-32" },
  };

  const { px, className: sizeClass } = sizeMap[size];
  const url = getDiceBearUrl(avatarConfig, px * 2); // 2x für Retina

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-blue-100 flex-shrink-0",
        sizeClass,
        showBorder && "ring-2 ring-blue-200 ring-offset-2",
        className
      )}
    >
      <Image
        src={url}
        alt="Avatar"
        fill
        className="object-cover"
        unoptimized // DiceBear liefert SVGs, die nicht optimiert werden müssen
      />
    </div>
  );
}

// Hintergrundfarben-Optionen
const BACKGROUND_COLORS = [
  { value: "b6e3f4", label: "Hellblau" },
  { value: "c0aede", label: "Lavendel" },
  { value: "d1f4c0", label: "Hellgrün" },
  { value: "ffd5dc", label: "Rosa" },
  { value: "ffdfbf", label: "Pfirsich" },
  { value: "fff4c0", label: "Hellgelb" },
  { value: "ffffff", label: "Weiß" },
  { value: "transparent", label: "Transparent" },
];

// Avatar-Editor Komponente
export function AvatarEditor({ config, onChange, className }: AvatarEditorProps) {
  const [previewSeed, setPreviewSeed] = useState(config.seed);
  const [previewStyle, setPreviewStyle] = useState(config.style);
  const [previewBgColor, setPreviewBgColor] = useState(config.backgroundColor || "b6e3f4");

  const previewConfig: AvatarConfig = {
    style: previewStyle,
    seed: previewSeed,
    backgroundColor: previewBgColor,
    options: config.options,
  };

  const handleStyleChange = (style: AvatarStyle) => {
    setPreviewStyle(style);
    onChange({
      ...config,
      style,
      seed: previewSeed,
      backgroundColor: previewBgColor,
    });
  };

  const handleRandomize = () => {
    const newSeed = generateRandomSeed();
    setPreviewSeed(newSeed);
    onChange({
      ...config,
      style: previewStyle,
      seed: newSeed,
      backgroundColor: previewBgColor,
    });
  };

  const handleBgColorChange = (color: string) => {
    setPreviewBgColor(color);
    onChange({
      ...config,
      style: previewStyle,
      seed: previewSeed,
      backgroundColor: color,
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Vorschau */}
      <div className="flex flex-col items-center gap-4">
        <StudentAvatar config={previewConfig} size="xl" showBorder />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRandomize}
          className="gap-2"
        >
          <Shuffle className="h-4 w-4" />
          Neues Gesicht
        </Button>
      </div>

      {/* Stil-Auswahl */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Avatar-Stil</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AVATAR_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => handleStyleChange(style.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:bg-blue-50",
                previewStyle === style.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              )}
              title={style.description}
            >
              <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src={getDiceBearUrl(
                    { style: style.value, seed: previewSeed, backgroundColor: previewBgColor },
                    48
                  )}
                  alt={style.label}
                  width={48}
                  height={48}
                  unoptimized
                />
              </div>
              <span className="text-xs font-medium text-center">
                {style.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hintergrundfarbe */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Hintergrundfarbe</label>
        <div className="flex flex-wrap gap-2">
          {BACKGROUND_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handleBgColorChange(color.value)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-all",
                previewBgColor === color.value
                  ? "ring-2 ring-blue-500 ring-offset-2"
                  : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
              )}
              style={{
                backgroundColor:
                  color.value === "transparent"
                    ? "transparent"
                    : `#${color.value}`,
                backgroundImage:
                  color.value === "transparent"
                    ? "linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)"
                    : undefined,
                backgroundSize: color.value === "transparent" ? "8px 8px" : undefined,
                backgroundPosition:
                  color.value === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0" : undefined,
              }}
              title={color.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudentAvatar;

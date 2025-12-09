# Bilder-Anleitung für MIA-App

## Logo

Um das MIA-App Logo anzuzeigen, speichern Sie Ihre Logo-Datei als:

```
public/logo.png
```

### Empfohlene Spezifikationen für Logo:
- **Format**: PNG mit transparentem Hintergrund
- **Größe**: Mindestens 400x200 Pixel (2:1 Verhältnis)
- **Optimierung**: Für Web optimiert

### Wo wird das Logo angezeigt?

Das Logo erscheint an folgenden Stellen:
1. **Login-Seite** (200x100px)
2. **Registrierungs-Seite** (200x100px)
3. **Dashboard-Header** (120x60px)

---

## Zeitraum-Bilder (Roboter)

Für die visuelle Gestaltung des Jahresplans benötigen Sie 4 Roboter-Bilder für die verschiedenen Zeiträume:

### Erforderliche Dateien:

```
public/roboter_herbst.png      - Für "Sommerferien - Herbstferien"
public/roboter_weihnachten.png - Für "Herbstferien - Weihnachtsferien"
public/roboter_winter.png      - Für "Weihnachtsferien - Winterferien"
public/roboter_sommer.png      - Für "Winterferien - Frühlingsferien" und "Frühlingsferien - Sommerferien"
```

### Empfohlene Spezifikationen für Roboter-Bilder:
- **Format**: PNG mit transparentem Hintergrund
- **Größe**: 96x96 Pixel (quadratisch)
- **Stil**: Passend zur jeweiligen Jahreszeit
- **Optimierung**: Für Web optimiert

### Anzeige im Jahresplan

Die Roboter-Bilder erscheinen:
- Oben in jeder Zeitraum-Spalte des Kanban-Boards
- 96x96px Größe
- Zentriert in einem 96px hohen Container
- Als visuelle Orientierungshilfe für Schüler und Lehrer

---

## Alternative Formate

Wenn Sie ein anderes Format verwenden möchten (z.B. SVG oder JPG):

1. Speichern Sie die Datei unter `/public/`
2. Passen Sie die Pfade in folgenden Dateien an:

   **Für Logo:**
   - `src/app/login/page.tsx`
   - `src/app/register/page.tsx`
   - `src/components/DashboardLayout.tsx`

   **Für Roboter-Bilder:**
   - `src/components/KanbanBoard.tsx` (ZEITRAUM_IMAGES Konstante)

### Beispiel Logo

Ersetzen Sie `src="/logo.png"` mit Ihrem Dateinamen, z.B.:
```tsx
<Image
  src="/mein-logo.svg"
  alt="MIA-App Logo"
  width={200}
  height={100}
/>
```

### Beispiel Roboter-Bild

In `KanbanBoard.tsx` können Sie das Mapping anpassen:
```tsx
const ZEITRAUM_IMAGES: Record<Zeitraum, string | null> = {
  "Sommerferien-Herbstferien": "/mein-herbst-roboter.svg",
  // ...
};
```


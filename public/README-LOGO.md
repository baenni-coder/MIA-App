# Logo-Anleitung

## Logo hinzufügen

Um das MIA-App Logo anzuzeigen, speichern Sie Ihre Logo-Datei als:

```
public/logo.png
```

### Empfohlene Spezifikationen:
- **Format**: PNG mit transparentem Hintergrund
- **Größe**: Mindestens 400x200 Pixel (2:1 Verhältnis)
- **Optimierung**: Für Web optimiert

### Wo wird das Logo angezeigt?

Das Logo erscheint an folgenden Stellen:
1. **Login-Seite** (200x100px)
2. **Registrierungs-Seite** (200x100px)
3. **Dashboard-Header** (120x60px)

### Alternative Formate

Wenn Sie ein anderes Format verwenden möchten (z.B. SVG oder JPG):
1. Speichern Sie die Datei unter `/public/`
2. Passen Sie die Pfade in folgenden Dateien an:
   - `src/app/login/page.tsx`
   - `src/app/register/page.tsx`
   - `src/components/DashboardLayout.tsx`

### Beispiel

Ersetzen Sie `src="/logo.png"` mit Ihrem Dateinamen, z.B.:
```tsx
<Image
  src="/mein-logo.svg"
  alt="MIA-App Logo"
  width={200}
  height={100}
/>
```

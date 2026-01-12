/**
 * Input Validation Utilities
 *
 * Zentrale Validierungsfunktionen für API-Eingaben.
 * Verhindert DoS-Angriffe durch zu große Payloads.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Maximale Längen für verschiedene Feldtypen
export const MAX_LENGTHS = {
  // Kurze Texte
  name: 100,
  title: 200,
  email: 254,
  lpCode: 50,

  // Mittlere Texte
  beschreibung: 5000,
  answer: 10000,
  question: 500,
  comment: 2000,

  // Lange Texte
  content: 50000,
  aufgaben: 10000,

  // URLs
  url: 2000,

  // Arrays
  maxArrayLength: 100,
  maxTagLength: 100,
};

/**
 * Validiert die Länge eines Strings
 */
export function validateStringLength(
  value: unknown,
  fieldName: string,
  maxLength: number,
  required: boolean = false
): ValidationResult {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return { valid: false, error: `${fieldName} ist erforderlich` };
    }
    return { valid: true };
  }

  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} muss ein Text sein` };
  }

  if (value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} ist zu lang (max. ${maxLength} Zeichen, aktuell: ${value.length})`,
    };
  }

  return { valid: true };
}

/**
 * Validiert ein Array von Strings
 */
export function validateStringArray(
  value: unknown,
  fieldName: string,
  maxArrayLength: number = MAX_LENGTHS.maxArrayLength,
  maxItemLength: number = MAX_LENGTHS.maxTagLength
): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: true };
  }

  if (!Array.isArray(value)) {
    return { valid: false, error: `${fieldName} muss ein Array sein` };
  }

  if (value.length > maxArrayLength) {
    return {
      valid: false,
      error: `${fieldName} hat zu viele Einträge (max. ${maxArrayLength})`,
    };
  }

  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") {
      return { valid: false, error: `${fieldName}[${i}] muss ein Text sein` };
    }
    if (value[i].length > maxItemLength) {
      return {
        valid: false,
        error: `${fieldName}[${i}] ist zu lang (max. ${maxItemLength} Zeichen)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validiert eine E-Mail-Adresse
 */
export function validateEmail(value: unknown, required: boolean = false): ValidationResult {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return { valid: false, error: "E-Mail ist erforderlich" };
    }
    return { valid: true };
  }

  if (typeof value !== "string") {
    return { valid: false, error: "E-Mail muss ein Text sein" };
  }

  if (value.length > MAX_LENGTHS.email) {
    return {
      valid: false,
      error: `E-Mail ist zu lang (max. ${MAX_LENGTHS.email} Zeichen)`,
    };
  }

  // Einfache E-Mail-Validierung
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { valid: false, error: "Ungültige E-Mail-Adresse" };
  }

  return { valid: true };
}

/**
 * Validiert eine URL
 */
export function validateUrl(
  value: unknown,
  fieldName: string = "URL",
  required: boolean = false
): ValidationResult {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return { valid: false, error: `${fieldName} ist erforderlich` };
    }
    return { valid: true };
  }

  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName} muss ein Text sein` };
  }

  if (value.length > MAX_LENGTHS.url) {
    return {
      valid: false,
      error: `${fieldName} ist zu lang (max. ${MAX_LENGTHS.url} Zeichen)`,
    };
  }

  try {
    new URL(value);
    return { valid: true };
  } catch {
    return { valid: false, error: `Ungültige ${fieldName}` };
  }
}

/**
 * Führt mehrere Validierungen durch und gibt den ersten Fehler zurück
 */
export function validateAll(...validations: ValidationResult[]): ValidationResult {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }
  return { valid: true };
}

/**
 * Validiert Custom Theme Input
 */
export function validateCustomThemeInput(body: Record<string, unknown>): ValidationResult {
  return validateAll(
    validateStringLength(body.thema, "Thema", MAX_LENGTHS.title, true),
    validateStringLength(body.beschreibung, "Beschreibung", MAX_LENGTHS.beschreibung, true),
    validateStringLength(body.lehrmittel, "Lehrmittel", MAX_LENGTHS.name),
    validateStringLength(body.fileRouge, "Roter Faden", MAX_LENGTHS.beschreibung),
    validateUrl(body.unterlagen, "Unterlagen-URL"),
    validateUrl(body.bildLehrmittel, "Bild-URL"),
    validateStringArray(body.schuljahr, "Schuljahr"),
    validateStringArray(body.kompetenzenIds, "Kompetenzen")
  );
}

/**
 * Validiert FAQ Input
 */
export function validateFAQInput(body: Record<string, unknown>): ValidationResult {
  return validateAll(
    validateStringLength(body.question, "Frage", MAX_LENGTHS.question, true),
    validateStringLength(body.answer, "Antwort", MAX_LENGTHS.answer, true)
  );
}

/**
 * Validiert Custom Lektion Input
 */
export function validateCustomLektionInput(body: Record<string, unknown>): ValidationResult {
  return validateAll(
    validateStringLength(body.lektionNummer, "Lektionsnummer", MAX_LENGTHS.name, true),
    validateStringLength(body.aufgaben, "Aufgaben", MAX_LENGTHS.aufgaben),
    validateStringLength(body.vorwissen, "Vorwissen", MAX_LENGTHS.beschreibung),
    validateStringLength(body.einstieg, "Einstieg", MAX_LENGTHS.beschreibung),
    validateStringLength(body.hauptteil, "Hauptteil", MAX_LENGTHS.aufgaben),
    validateStringLength(body.abschluss, "Abschluss", MAX_LENGTHS.beschreibung),
    validateStringLength(body.stolpersteine, "Stolpersteine", MAX_LENGTHS.beschreibung),
    validateStringArray(body.material, "Material")
  );
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security Middleware für MIA-App
 *
 * Features:
 * - Rate Limiting für Auth-Endpoints (In-Memory, pro Instance)
 * - Security Headers (HSTS, CSP, X-Content-Type-Options, etc.)
 *
 * HINWEIS: Für Produktion mit mehreren Serverless-Instances
 * sollte Rate-Limiting über Upstash Redis oder ähnliches erfolgen.
 */

// ============================================
// Rate Limiting Configuration
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-Memory Store für Rate Limiting (pro Instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate Limit Konfiguration pro Endpoint-Typ
const RATE_LIMITS = {
  // Auth Endpoints: strenger limitiert
  auth: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 10, // 10 Versuche pro 15 Minuten
  },
  // Password Reset: sehr streng
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 3, // 3 Versuche pro Stunde
  },
  // API Endpoints: moderate Limits
  api: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 100, // 100 Requests pro Minute
  },
};

// Cleanup alter Einträge (alle 5 Minuten)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Prüft und aktualisiert Rate Limit für eine IP/Endpoint Kombination
 */
function checkRateLimit(
  ip: string,
  endpoint: string,
  config: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupRateLimitStore();

  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Neuer Eintrag oder abgelaufen
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Existierender Eintrag
  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return { allowed, remaining, resetTime: entry.resetTime };
}

/**
 * Ermittelt die Client-IP aus dem Request
 */
function getClientIP(request: NextRequest): string {
  // Vercel/Cloudflare Headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback
  return "unknown";
}

// ============================================
// Security Headers
// ============================================

/**
 * Fügt Security Headers zur Response hinzu
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // HTTP Strict Transport Security
  // Erzwingt HTTPS für 1 Jahr, inkl. Subdomains
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Content Security Policy
  // Schützt vor XSS und anderen Injection-Angriffen
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Scripts: self + inline für Next.js + unsafe-eval für dev
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      // Styles: self + inline für Tailwind
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs + externe Quellen
      "img-src 'self' data: blob: https://*.airtableusercontent.com https://dl.airtable.com https://firebasestorage.googleapis.com https://storage.googleapis.com",
      // Connect: API calls
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com https://api.airtable.com",
      // Frame ancestors: keine Einbettung erlaubt
      "frame-ancestors 'none'",
      // Base URI
      "base-uri 'self'",
      // Form actions
      "form-action 'self'",
    ].join("; ")
  );

  // Verhindert MIME-Type Sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Verhindert Clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS Protection (Legacy, aber schadet nicht)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (früher Feature-Policy)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

// ============================================
// Middleware Function
// ============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  // Rate Limiting für spezifische Endpoints
  let rateLimitResult: { allowed: boolean; remaining: number; resetTime: number } | null = null;

  // Password Reset - sehr streng
  if (pathname === "/api/auth/reset-password" || pathname.includes("password-reset")) {
    rateLimitResult = checkRateLimit(ip, "password-reset", RATE_LIMITS.passwordReset);
  }
  // Auth Endpoints (Login, Register)
  else if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/schueler/login"
  ) {
    rateLimitResult = checkRateLimit(ip, "auth", RATE_LIMITS.auth);
  }
  // Andere API Endpoints
  else if (pathname.startsWith("/api/")) {
    rateLimitResult = checkRateLimit(ip, "api", RATE_LIMITS.api);
  }

  // Rate Limit überschritten?
  if (rateLimitResult && !rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);

    const response = NextResponse.json(
      {
        error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
        retryAfter,
      },
      { status: 429 }
    );

    response.headers.set("Retry-After", String(retryAfter));
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMITS.api.maxRequests));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(rateLimitResult.resetTime / 1000))
    );

    return addSecurityHeaders(response);
  }

  // Normale Response mit Security Headers
  const response = NextResponse.next();

  // Rate Limit Headers hinzufügen (wenn limitiert)
  if (rateLimitResult) {
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(rateLimitResult.resetTime / 1000))
    );
  }

  return addSecurityHeaders(response);
}

// ============================================
// Matcher Configuration
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

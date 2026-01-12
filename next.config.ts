import type { NextConfig } from "next";

// Unterdrücke url.parse() Deprecation-Warnung (kommt aus airtable SDK)
// Kann entfernt werden wenn airtable das SDK aktualisiert
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('url.parse()') || args[0]?.includes?.('DEP0169')) {
    return;
  }
  originalWarn.apply(console, args);
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v5.airtableusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'dl.airtable.com',
      },
    ],
  },
  // Erhöhe Body-Size-Limit für File-Uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;

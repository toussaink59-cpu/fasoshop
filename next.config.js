const { withSentryConfig } = require("@sentry/nextjs");

const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
    formats: ["image/webp"],
  },

  // Headers de securite appliques a TOUTES les reponses
  async headers() {
    // === CSP dynamique : unsafe-eval retire en production, Plausible autorise ===
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'", // necessaire pour Next.js inline scripts (hydration)
      // unsafe-eval RETIRE en production (securite) - garde en dev pour HMR
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://*.sentry-cdn.com",
      "https://*.ingest.sentry.io",
      "https://plausible.io", // Plausible analytics (debloque)
    ];

    const cspDirectives = [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`,
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // connect-src : Plausible debloque (etait bloque dans les logs)
      "connect-src 'self' https: https://*.ingest.sentry.io https://*.sentry.io https://plausible.io",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Production : force HTTPS partout
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
        ],
      },
    ];
  },
};

// Sentry options
const sentryOptions = {
  org: "kimoxa",
  project: "javascript-nextjs",
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  tunnelRoute: isDev ? undefined : "/monitoring",
  sourcemaps: { disable: isDev },
  webpack: { treeshake: { removeDebugLogging: true } },
};

module.exports = withSentryConfig(nextConfig, sentryOptions);

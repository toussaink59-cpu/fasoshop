const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  // 🖼️ Optimisation images Next.js : autorise Vercel Blob Storage
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

  // 🔒 Headers de sécurité appliqués à TOUTES les réponses
  async headers() {
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry-cdn.com https://*.ingest.sentry.io",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: https://*.ingest.sentry.io https://*.sentry.io",
              "media-src 'self'",
              "object-src 'none'",
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// ⚙️ Options Sentry (silencieux en dev, upload sourcemaps en build)
const sentryOptions = {
  org: "kimoxa",
  project: "javascript-nextjs",
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  // ✅ Nouvelle syntaxe (remplace disableLogger)
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

module.exports = withSentryConfig(nextConfig, sentryOptions);
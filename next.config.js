/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  // 🔒 Headers de sécurité appliqués à TOUTES les réponses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Empêche le navigateur de deviner un type MIME faux
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Interdit d'afficher Kimoxa dans une iframe (anti-clickjacking)
          { key: "X-Frame-Options", value: "DENY" },

          // Limite les infos de provenance envoyées aux autres sites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Désactive caméra/micro dans les iframes, géoloc autorisée sur Kimoxa
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },

          // Force HTTPS pendant 1 an (anti-interception)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },

          // Isole l'onglet : empêche les autres sites d'ouvrir Kimoxa dans une popup et d'y accéder
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },

          // Empêche les autres sites d'embedder vos ressources (images, CSS)
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

          // 🔒 CSP : restreint les sources de contenu autorisées
          // - 'unsafe-inline' requis pour les styles Next.js (App Router en génère)
          // - 'unsafe-eval' requis en dev uniquement (retiré en prod si pas nécessaire)
          // - https: pour les images (CDN produits, photos vendeurs)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
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

module.exports = nextConfig;
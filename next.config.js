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
          // Active le filtre XSS natif du navigateur
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Limite les infos de provenance envoyées aux autres sites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Désactive caméra/micro dans les iframes, géoloc autorisée sur Kimoxa
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          // Force HTTPS pendant 1 an (anti-interception)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

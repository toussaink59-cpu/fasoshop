// Limiteur de débit à fenêtre glissante (mémoire, par instance).
// Sur Vercel (serverless) : protection best-effort, suffisante
// contre le brute-force manuel et les scripts simples.
const windows = new Map();

export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = windows.get(key) || { hits: [] };
  entry.hits = entry.hits.filter((t) => now - t < windowMs);
  entry.hits.push(now);
  windows.set(key, entry);

  // Nettoyage périodique pour ne pas grossir
  if (windows.size > 10_000) {
    for (const [k, v] of windows) {
      if (!v.hits.length || now - v.hits[v.hits.length - 1] > windowMs) {
        windows.delete(k);
      }
    }
  }
  return entry.hits.length <= limit;
}

// Identifie le client derrière Vercel (IP réelle)
export function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

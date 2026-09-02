// lib/logger.js
// P2-12 (enhancement) : logs JSON structures pour observabilite prod

const isDev = process.env.NODE_ENV === "development";

/**
 * Genere un request_id unique pour tracer une requete de bout en bout.
 * @returns {string} ID unique (ex: req_a1b2c3d4)
 */
export function generateRequestId() {
  return "req_" + Math.random().toString(36).slice(2, 10);
}

/**
 * Logger JSON structure (Datadog/ELK-ready).
 * En dev : format lisible. En prod : JSON compact.
 * 
 * @param {"info"|"warn"|"error"|"debug"} level - Niveau de log
 * @param {string} message - Message principal
 * @param {object} context - Contexte additionnel (user_id, route, error, etc.)
 */
export function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (isDev) {
    // Dev : format lisible
    const prefix = {
      info: "ℹ️ ",
      warn: "⚠️ ",
      error: "❌",
      debug: "🔍",
    }[level] || "";
    console.log(prefix + " [" + entry.route + "] " + message, context);
  } else {
    // Prod : JSON compact pour parsing automatique
    console.log(JSON.stringify(entry));
  }
}

// Helpers pour chaque niveau
export const logger = {
  info: (message, context) => log("info", message, context),
  warn: (message, context) => log("warn", message, context),
  error: (message, context) => log("error", message, context),
  debug: (message, context) => log("debug", message, context),
};

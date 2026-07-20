// Connexion partagée à Postgres (Neon) via postgres.js
// Utilisable dans les API routes (Node runtime uniquement)

import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL manquant — vérifie ton fichier .env.local");
}

// En dev, on réutilise la même connexion entre les rechargements à chaud
const globalForDb = globalThis;

const sql =
  globalForDb.__fasoshop_sql ||
  postgres(process.env.DATABASE_URL, { ssl: "require" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fasoshop_sql = sql;
}

export default sql;

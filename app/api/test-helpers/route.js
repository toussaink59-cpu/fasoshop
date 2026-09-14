// app/api/test-helpers/route.js — VERSION NETTOYÉE (audit 2026-09-12)
//
// Ce fichier ne gère QUE le chemin exact /api/test-helpers.
// Les branches "pay-order", "suspend-user", "ledger", "history", etc.
// étaient du code mort : Next.js ne les routait jamais ici (aucun fichier
// route correspondant), ce qui créait un faux sentiment de couverture.
// Les endpoints réellement utilisés par l'e2e sont les sous-dossiers
// dédiés (create-user/, create-shop-product/) — inchangés, déjà gardés.
//
// Règles de sécurité conservées :
// - Jamais accessible en production (404)
// - ALLOW_TEST_HELPERS=1 requis en dehors de la production

function guard() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  if (process.env.ALLOW_TEST_HELPERS !== "1") {
    return Response.json({ error: "Test helpers desactives (ALLOW_TEST_HELPERS)." }, { status: 403 });
  }
  return null;
}

export async function POST(request) {
  const g = guard();
  if (g) return g;
  return Response.json({ error: "Not found." }, { status: 404 });
}

export async function GET(request) {
  const g = guard();
  if (g) return g;
  return Response.json({ error: "Not found." }, { status: 404 });
}
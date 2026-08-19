import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/products/suggestions?q=texte
 * Autocomplete ultra léger : top 5 produits (id + name seulement), <100ms.
 * Rate limit : 120 req/min/IP (autocomplete = beaucoup de requêtes).
 */
export async function GET(request) {
  try {
    const key = `suggestions:${clientKey(request)}`;
    if (!rateLimit(key, { limit: 120, windowMs: 60_000 })) {
      return Response.json({ error: "Trop de requêtes." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return Response.json({ suggestions: [] });
    }

    if (q.length > 100) {
      return Response.json({ error: "Recherche trop longue." }, { status: 400 });
    }

    const suggestions = await sql`
      SELECT p.id, p.name, p.price, p.images
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      WHERE p.status = 'active'
        AND s.status = 'active'
        AND p.stock_quantity > 0
        AND p.search_vector @@ plainto_tsquery('french', ${q})
      ORDER BY ts_rank(p.search_vector, plainto_tsquery('french', ${q})) DESC
      LIMIT 5
    `;

    return Response.json({ suggestions }, {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (err) {
    console.error("[suggestions]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

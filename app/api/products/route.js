// app/api/products/route.js
import { getProducts } from "@/lib/queries/products";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * GET /api/products
 * Catalogue public avec pagination cursor-based.
 * 
 * Query params :
 * - limit : nombre de produits par page (1-100, défaut 24)
 * - cursor : cursor pour pagination (ISO date)
 * - category : slug de catégorie
 * - q : texte de recherche (max 100 caractères)
 * - minPrice : prix minimum (nombre >= 0)
 * - maxPrice : prix maximum (nombre >= minPrice)
 * - shopId : ID de boutique (entier positif)
 * - condition : neuf|quasi_neuf|occasion
 * - brand : marque
 * - city : ville de la boutique
 * - minRating : note minimum (1-5)
 * - sort : newest|price_asc|price_desc|rating (défaut newest)
 * 
 * Réponse :
 * {
 *   products: [...],
 *   nextCursor: "2026-08-12T10:30:00Z",
 *   hasMore: true,
 *   total: 1234
 * }
 * 
 * Rate limit : 60 requêtes/min/IP
 */
export async function GET(request) {
  try {
    // Rate limit : 60 requêtes/min/IP
    const key = `catalogue:${clientKey(request)}`;
    if (!rateLimit(key, { limit: 60, windowMs: 60_000 })) {
      return Response.json(
        { error: "Trop de requêtes. Réessayez dans une minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = request.headers.get("x-user-id");

    // Extraction des paramètres
    const limit = searchParams.get("limit");
    const cursor = searchParams.get("cursor");
    const filters = {
      categorySlug: searchParams.get("category"),
      q: searchParams.get("q"),
      minPrice: searchParams.get("minPrice"),
      maxPrice: searchParams.get("maxPrice"),
      shopId: searchParams.get("shopId"),
      condition: searchParams.get("condition"),
      brand: searchParams.get("brand"),
      city: searchParams.get("city"),
      minRating: searchParams.get("minRating"),
      sort: searchParams.get("sort"),
    };

    // Validation du cursor (si fourni)
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (isNaN(cursorDate.getTime())) {
        return Response.json(
          { error: "Le paramètre 'cursor' doit être une date ISO valide." },
          { status: 400 }
        );
      }
    }

    // Appel à getProducts (validation interne des filtres)
    const result = await getProducts(filters, limit, cursor, userId);

    // Réponse avec cache-control pour performance
    return Response.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    // Erreurs de validation → 400
    if (error.message.includes("paramètre")) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Autres erreurs → 500
    console.error("Erreur /api/products:", error);
    return Response.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

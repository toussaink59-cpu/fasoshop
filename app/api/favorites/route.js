import sql from "@/lib/db";
import { getFavoriteProducts } from "@/lib/queries/favorites";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const MAX_FAVORITES_PER_USER = 500;

// GET /api/favorites — liste les favoris de l'utilisateur connecté
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 30 consultations par minute
  const key = `favorites:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 30, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const products = await getFavoriteProducts(userId);

    // 🔒 3) Audit log
    sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, ip_address)
      VALUES (${userId}, 'view_favorites', 'favorite', ${clientKey(request)})
    `.catch(() => {});

    return Response.json({ products });
  } catch (err) {
    console.error("[favorites GET]", err.message);
    return Response.json({ error: "Impossible de charger les favoris." }, { status: 500 });
  }
}

// POST /api/favorites — ajoute un produit aux favoris
export async function POST(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 20 ajouts par minute
  const key = `favorite:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 20, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop d'ajouts. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // 🔒 3) Validation stricte productId
    const productId = Number(body.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return Response.json({ error: "Produit invalide." }, { status: 400 });
    }

    // 🔒 4) Vérification existence produit + statut actif
    const [product] = await sql`
      SELECT id, status FROM products WHERE id = ${productId}
    `;
    if (!product || product.status !== "active") {
      return Response.json({ error: "Produit non disponible." }, { status: 404 });
    }

    // 🔒 5) Limite nombre de favoris par utilisateur
    const [existingCount] = await sql`
      SELECT COUNT(*)::int AS count FROM favorites WHERE user_id = ${userId}
    `;
    if (existingCount.count >= MAX_FAVORITES_PER_USER) {
      return Response.json(
        { error: `Limite atteinte (max ${MAX_FAVORITES_PER_USER} favoris).` },
        { status: 400 }
      );
    }

    // 🔒 6) Ajout avec ON CONFLICT (évite doublons)
    await sql`
      INSERT INTO favorites (user_id, product_id)
      VALUES (${userId}, ${productId})
      ON CONFLICT (user_id, product_id) DO NOTHING
    `;

    // 🔒 7) Audit log
    sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${userId}, 'add_favorite', 'favorite', ${productId}, ${clientKey(request)})
    `.catch(() => {});

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[favorites POST]", err.message);
    return Response.json({ error: "Impossible d'ajouter le favori." }, { status: 500 });
  }
}

import { sameOrigin } from "@/lib/csrf";
// app/api/addresses/route.js
import sql from "@/lib/db";
import { getUserAddresses } from "@/lib/queries/addresses";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { validateCreateAddress } from "@/lib/validation/address";

const MAX_ADDRESSES_PER_USER = 20;

// GET /api/addresses — acheteur voit SEULEMENT ses adresses
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

 // 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

 // 2) Rate limit : max 20 consultations par minute
  const key = `addresses:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 20, windowMs: 60_000 }))) {
    return Response.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const addresses = await getUserAddresses(userId);

 // 3) Audit log
    sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, ip_address)
      VALUES (${userId}, 'view_addresses', 'address', ${clientKey(request)})
    `.catch(() => {});

    return Response.json({ addresses });
  } catch (err) {
    console.error("[addresses GET]", err.message);
    return Response.json({ error: "Impossible de charger les adresses." }, { status: 500 });
  }
}

// POST /api/addresses — création adresse avec validation militaire
export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

 // 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

 // 2) Rate limit : max 5 créations par minute
  const key = `address:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 5, windowMs: 60_000 }))) {
    return Response.json(
      { error: "Trop de créations. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

 // 3) Validation + sanitization via helper commun
    const validation = validateCreateAddress(body);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { libelle, adresseTexte, phone, latitude, longitude, parDefaut } = validation.data;

 // 4) Limite nombre d'adresses par utilisateur
    const [existingCount] = await sql`
      SELECT COUNT(*)::int AS count FROM addresses WHERE user_id = ${userId}
    `;
    if (existingCount.count >= MAX_ADDRESSES_PER_USER) {
      return Response.json(
        { error: `Limite atteinte (max ${MAX_ADDRESSES_PER_USER} adresses).` },
        { status: 400 }
      );
    }

    const shouldBeDefault = parDefaut || existingCount.count === 0;

 // 5) Transaction pour cohérence
 //  IMPORTANT : sql.begin() retourne l'objet directement (PAS un tableau)
    const address = await sql.begin(async (tx) => {
      if (shouldBeDefault) {
        await tx`UPDATE addresses SET par_defaut = false WHERE user_id = ${userId}`;
      }

      const [newAddress] = await tx`
        INSERT INTO addresses (user_id, libelle, adresse_texte, phone, par_defaut, latitude, longitude)
        VALUES (${userId}, ${libelle}, ${adresseTexte}, ${phone}, ${shouldBeDefault}, ${latitude}, ${longitude})
        RETURNING id, libelle, adresse_texte, phone, par_defaut, latitude, longitude
      `;

 // 6) Audit log
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'create_address', 'address', ${newAddress.id}, ${clientKey(request)})
      `.catch(() => {});

      return newAddress;
    });

    return Response.json({ address }, { status: 201 });
  } catch (err) {
    console.error("[addresses POST]", err.message);
    return Response.json({ error: "Impossible d'enregistrer l'adresse." }, { status: 500 });
  }
}

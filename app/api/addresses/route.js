import sql from "@/lib/db";
import { getUserAddresses } from "@/lib/queries/addresses";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const MAX_ADDRESSES_PER_USER = 20;
const MAX_LABEL_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 300;

// 🔒 Sanitization : supprime caractères dangereux
function sanitize(str, maxLength = 200) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>"'`$\\]/g, "")
    .replace(/--/g, "")
    .replace(/\b(drop|select|insert|update|delete|union|exec|script)\b/gi, "")
    .trim()
    .slice(0, maxLength);
}

// 🔒 Validation téléphone
function isValidPhone(phone) {
  if (!phone) return true; // optionnel
  return /^\+?[0-9\s\-()]{8,20}$/.test(phone);
}

// 🔒 Validation coordonnées GPS
function isValidCoordinate(value, min, max) {
  if (value === null || value === undefined) return true; // optionnel
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
}

// GET /api/addresses — acheteur voit SEULEMENT ses adresses
export async function GET(request) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 20 consultations par minute
  const key = `addresses:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 20, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const addresses = await getUserAddresses(userId);

    // 🔒 3) Audit log
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
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  // 🔒 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

  // 🔒 2) Rate limit : max 5 créations par minute
  const key = `address:${clientKey(request)}`;
  if (!rateLimit(key, { limit: 5, windowMs: 60_000 })) {
    return Response.json(
      { error: "Trop de créations. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // 🔒 3) Sanitization + validation stricte
    const libelle = sanitize(body.libelle, MAX_LABEL_LENGTH);
    const adresseTexte = sanitize(body.adresseTexte, MAX_ADDRESS_LENGTH);
    const phone = body.phone ? sanitize(body.phone, 20) : null;
    const latitude = body.latitude || null;
    const longitude = body.longitude || null;
    const parDefaut = Boolean(body.parDefaut);

    if (!libelle || libelle.length < 3) {
      return Response.json({ error: "Libellé invalide." }, { status: 400 });
    }
    if (!adresseTexte || adresseTexte.length < 10) {
      return Response.json({ error: "Adresse trop courte." }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return Response.json({ error: "Téléphone invalide." }, { status: 400 });
    }
    if (!isValidCoordinate(latitude, -90, 90)) {
      return Response.json({ error: "Latitude invalide." }, { status: 400 });
    }
    if (!isValidCoordinate(longitude, -180, 180)) {
      return Response.json({ error: "Longitude invalide." }, { status: 400 });
    }

    // 🔒 4) Limite nombre d'adresses par utilisateur
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

    // 🔒 5) Transaction pour cohérence
    const [address] = await sql.begin(async (tx) => {
      if (shouldBeDefault) {
        await tx`UPDATE addresses SET par_defaut = false WHERE user_id = ${userId}`;
      }

      const [newAddress] = await tx`
        INSERT INTO addresses (user_id, libelle, adresse_texte, phone, par_defaut, latitude, longitude)
        VALUES (${userId}, ${libelle}, ${adresseTexte}, ${phone}, ${shouldBeDefault}, ${latitude}, ${longitude})
        RETURNING id, libelle, adresse_texte, phone, par_defaut, latitude, longitude
      `;

      // 🔒 6) Audit log
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

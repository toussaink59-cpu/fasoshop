// app/api/addresses/[id]/route.js
import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { validateUpdateAddress } from "@/lib/validation/address";

// PATCH /api/addresses/[id] — mise à jour partielle avec validation militaire
// body: { libelle?, adresseTexte?, phone?, parDefaut? }
export async function PATCH(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  const { id } = await params;

 // 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

 // 2) Rate limit : max 10 modifications par minute
  const key = `address-update:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 10, windowMs: 60_000 }))) {
    return Response.json(
      { error: "Trop de modifications. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

 // 3) Validation + sanitization via helper commun
    const validation = validateUpdateAddress(body);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const updates = validation.data;

 // 4) Vérifie que l'adresse appartient bien à l'utilisateur connecté (anti-IDOR)
    const [existing] = await sql`
      SELECT id FROM addresses WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!existing) {
      return Response.json({ error: "Adresse introuvable." }, { status: 404 });
    }

 // 5) Transaction pour cohérence (surtout pour parDefaut)
 // ️ IMPORTANT : sql.begin() retourne l'objet directement (PAS un tableau)
    const address = await sql.begin(async (tx) => {
      // Si parDefaut = true, désactiver tous les autres
      if (updates.parDefaut === true) {
        await tx`UPDATE addresses SET par_defaut = false WHERE user_id = ${userId}`;
      }

      // Mise à jour uniquement des champs fournis (COALESCE)
      const [updatedAddress] = await tx`
        UPDATE addresses
        SET
          libelle = COALESCE(${updates.libelle ?? null}, libelle),
          adresse_texte = COALESCE(${updates.adresseTexte ?? null}, adresse_texte),
          phone = COALESCE(${updates.phone ?? null}, phone),
          par_defaut = COALESCE(${updates.parDefaut ?? null}, par_defaut)
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id, libelle, adresse_texte, phone, par_defaut, latitude, longitude
      `;

 // 6) Audit log
      await tx`
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (${userId}, 'update_address', 'address', ${id}, ${clientKey(request)})
      `.catch(() => {});

      return updatedAddress;
    });

    return Response.json({ address });
  } catch (err) {
    console.error("[addresses PATCH]", err.message);
    return Response.json(
      { error: "Erreur serveur lors de la mise à jour de l'adresse." },
      { status: 500 }
    );
  }
}

// DELETE /api/addresses/[id] — suppression avec audit log
export async function DELETE(request, { params }) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  const { id } = await params;

 // 1) Vérification rôle explicite
  if (!userId || (userRole !== "buyer" && userRole !== "admin")) {
    return Response.json({ error: "Accès refusé." }, { status: 403 });
  }

 // 2) Rate limit : max 5 suppressions par minute
  const key = `address-delete:${clientKey(request)}`;
  if (!(await rateLimit(key, { limit: 5, windowMs: 60_000 }))) {
    return Response.json(
      { error: "Trop de suppressions. Réessayez dans une minute." },
      { status: 429 }
    );
  }

  try {
 // 3) Vérification ownership + suppression dans une transaction
 // ️ IMPORTANT : sql.begin() retourne l'objet directement (PAS un tableau)
    const deleted = await sql.begin(async (tx) => {
      const [addr] = await tx`
        DELETE FROM addresses WHERE id = ${id} AND user_id = ${userId} RETURNING id
      `;

      if (addr) {
 // 4) Audit log
        await tx`
          INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
          VALUES (${userId}, 'delete_address', 'address', ${id}, ${clientKey(request)})
        `.catch(() => {});
      }

      return addr;
    });

    if (!deleted) {
      return Response.json({ error: "Adresse introuvable." }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[addresses DELETE]", err.message);
    return Response.json(
      { error: "Erreur serveur lors de la suppression de l'adresse." },
      { status: 500 }
    );
  }
}

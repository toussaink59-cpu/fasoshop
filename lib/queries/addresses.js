import sql from "@/lib/db";

// Carnet d'adresses de l'utilisateur, adresse par défaut en tête.
export async function getUserAddresses(userId) {
  return sql`
    SELECT id, libelle, adresse_texte, phone, par_defaut, latitude, longitude
    FROM addresses
    WHERE user_id = ${userId}
    ORDER BY par_defaut DESC, created_at DESC
  `;
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import sql from "@/lib/db";

const ALLOWED_FIELDS = ["first_name", "last_name", "full_name", "phone", "date_of_birth", "nationality", "country_of_residence"];

function sanitize(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val.trim().slice(0, 200) || null;
  return String(val);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const [dbUser] = await sql`
    SELECT id, email, first_name, last_name, full_name, phone, date_of_birth,
           nationality, country_of_residence, role, provider, google_id, google_picture,
           status, created_at
    FROM users WHERE id = ${user.id}
  `;
  if (!dbUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  return NextResponse.json({ user: dbUser });
}

export async function PATCH(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  // Filtrer uniquement les champs autorisés
  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = sanitize(body[key]);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });
  }

  // Email NON modifiable (clé d'identité)
  if (body.email && body.email !== user.email) {
    return NextResponse.json({ error: "L'email ne peut pas être modifié. Contactez le support." }, { status: 400 });
  }

  // Construire le full_name si first_name ou last_name est modifié
  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    const [current] = await sql`SELECT first_name, last_name FROM users WHERE id = ${user.id}`;
    const fn = updates.first_name !== undefined ? updates.first_name : current.first_name;
    const ln = updates.last_name !== undefined ? updates.last_name : current.last_name;
    updates.full_name = `${fn || ""} ${ln || ""}`.trim();
  }

  // SET dynamique
  const keys = Object.keys(updates);
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = [user.id, ...keys.map(k => updates[k])];

  await sql.unsafe(`UPDATE users SET ${setClause} WHERE id = $1`, values);

  const [updated] = await sql`SELECT * FROM users WHERE id = ${user.id}`;
  return NextResponse.json({ user: updated, success: true });
}

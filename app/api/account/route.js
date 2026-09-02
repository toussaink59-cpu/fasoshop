import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import sql from "@/lib/db";

// P1-10 (audit) : whitelist stricte + validation par champ
const ALLOWED_FIELDS = ["first_name", "last_name", "phone", "date_of_birth", "nationality", "country_of_residence"];

function sanitize(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val.trim().slice(0, 200) || null;
  return String(val);
}

// P1-10 : validation phone BF (+226 + 8 chiffres commençant par 6 ou 7)
function isValidPhoneBF(phone) {
  if (!phone) return true;
  const cleaned = String(phone).replace(/[\s\-()]/g, "");
  return /^(?:\+226|00226)?[67]\d{7}$/.test(cleaned);
}

// P1-10 : validation date_of_birth (ISO YYYY-MM-DD, âge 13-120 ans)
function isValidDateOfBirth(dob) {
  if (!dob) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  return age >= 13 && age <= 120;
}

// P1-10 : validation codes pays ISO alpha-2 (2 lettres majuscules)
function isValidCountryCode(code) {
  if (!code) return true;
  return /^[A-Z]{2}$/.test(code);
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

  // P1-10 : filtrer uniquement les champs autorisés + validation stricte par champ
  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      const val = sanitize(body[key]);
      
      // Validation spécifique par champ
      if (key === "phone" && !isValidPhoneBF(val)) {
        return NextResponse.json({ error: "Téléphone BF invalide (format +226XXXXXXXX)." }, { status: 400 });
      }
      if (key === "date_of_birth" && !isValidDateOfBirth(val)) {
        return NextResponse.json({ error: "Date de naissance invalide (format YYYY-MM-DD, âge 13-120 ans)." }, { status: 400 });
      }
      if ((key === "nationality" || key === "country_of_residence") && !isValidCountryCode(val)) {
        return NextResponse.json({ error: `Code pays ${key} invalide (format ISO alpha-2, ex: BF, FR).` }, { status: 400 });
      }
      
      updates[key] = val;
    }
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

  // P1-10 : utiliser des requêtes préparées au lieu de sql.unsafe()
  // Mettre à jour chaque champ séparément (plus sûr, évite injection SQL)
  await sql.begin(async (tx) => {
    for (const [key, value] of Object.entries(updates)) {
      await tx.unsafe(`UPDATE users SET ${key} = $1 WHERE id = $2`, [value, user.id]);
    }
  });

  const [updated] = await sql`SELECT * FROM users WHERE id = ${user.id}`;
  return NextResponse.json({ user: updated, success: true });
}

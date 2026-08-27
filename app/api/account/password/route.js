import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import sql from "@/lib/db";
import { compare, hash } from "bcryptjs";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { currentPassword, newPassword } = body || {};
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  const [dbUser] = await sql`SELECT provider, password_hash FROM users WHERE id = ${user.id}`;

  // Si compte Google-only, pas de current password à vérifier
  if (dbUser.provider === "google" && !dbUser.password_hash) {
    // Définir un password pour la première fois = activer le login double
    const hashed = await hash(newPassword, 10);
    await sql`UPDATE users SET password_hash = ${hashed}, provider = 'both' WHERE id = ${user.id}`;
    return NextResponse.json({ success: true, message: "Mot de passe créé. Vous pouvez désormais vous connecter avec Google OU email/mot de passe." });
  }

  // Compte local ou both : vérification du current password
  if (!currentPassword) {
    return NextResponse.json({ error: "Mot de passe actuel requis." }, { status: 400 });
  }
  if (!dbUser.password_hash) {
    return NextResponse.json({ error: "Impossible de vérifier l'ancien mot de passe." }, { status: 400 });
  }
  const valid = await compare(currentPassword, dbUser.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  }

  const hashed = await hash(newPassword, 10);
  await sql`UPDATE users SET password_hash = ${hashed}, token_version = COALESCE(token_version, 0) + 1 WHERE id = ${user.id}`;

  return NextResponse.json({ success: true, message: "Mot de passe modifié avec succès." });
}

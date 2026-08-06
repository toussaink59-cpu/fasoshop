import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// POST /api/auth/register
// body: { email, password, fullName, phone?, role? ('buyer' | 'vendor'), shopName? }
// Pour un vendeur, la boutique est créée avec status='pending' et SANS
// document d'identité — celui-ci est demandé après connexion, sur une
// page de vérification dédiée (parcours en deux étapes, pour ne pas
// décourager l'inscription). Validation du type de pièce faite dans
// PATCH /api/vendor/shop au moment de la soumission réelle.
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone, role, shopName } = body;

    if (!email || !password || !fullName) {
      return Response.json(
        { error: "Email, mot de passe et nom complet sont requis." },
        { status: 400 }
      );
    }

    // Seuls 'buyer' et 'vendor' sont autorisés à l'inscription publique
    const finalRole = role === "vendor" ? "vendor" : "buyer";

    if (finalRole === "vendor" && (!shopName || !shopName.trim())) {
      return Response.json(
        { error: "Le nom de la boutique est requis." },
        { status: 400 }
      );
    }

    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existing.length > 0) {
      return Response.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES (${email}, ${passwordHash}, ${fullName}, ${phone || null}, ${finalRole})
      RETURNING id, email, full_name, role
    `;

    // Si c'est un vendeur, on crée automatiquement sa boutique en attente,
    // sans document d'identité — celui-ci est demandé juste après, sur
    // /vendor/dashboard ou /vendor/account (parcours en deux étapes).
    if (finalRole === "vendor") {
      await sql`
        INSERT INTO shops (vendor_id, name, status)
        VALUES (${user.id}, ${shopName.trim()}, 'pending')
      `;
    }

    const token = await signToken({ userId: user.id, role: user.role });
    const response = Response.json({ user }, { status: 201 });
    response.headers.set(
      "Set-Cookie",
      `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
    return response;
  } catch (err) {
    console.error("Erreur register:", err);
    return Response.json(
      { error: "Erreur serveur lors de l'inscription." },
      { status: 500 }
    );
  }
}

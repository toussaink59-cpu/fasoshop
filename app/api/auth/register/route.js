import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// POST /api/auth/register
// body: { email, password, fullName, phone?, role? ('buyer' | 'vendor') }
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, fullName, phone, role } = body;

    if (!email || !password || !fullName) {
      return Response.json(
        { error: "Email, mot de passe et nom complet sont requis." },
        { status: 400 }
      );
    }

    // Seuls 'buyer' et 'vendor' sont autorisés à l'inscription publique
    const finalRole = role === "vendor" ? "vendor" : "buyer";

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

    // Si c'est un vendeur, on crée automatiquement sa boutique (à renommer plus tard)
    if (finalRole === "vendor") {
      await sql`
        INSERT INTO shops (vendor_id, name, status)
        VALUES (${user.id}, ${fullName + " Shop"}, 'pending')
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

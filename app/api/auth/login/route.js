import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// POST /api/auth/login
// body: { email, password }
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const [user] = await sql`
      SELECT id, email, password_hash, full_name, role
      FROM users
      WHERE email = ${email}
    `;

    if (!user) {
      return Response.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return Response.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    const token = await signToken({ userId: user.id, role: user.role });

    const response = Response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
    response.headers.set(
      "Set-Cookie",
      `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
    return response;
  } catch (err) {
    console.error("Erreur login:", err);
    return Response.json(
      { error: "Erreur serveur lors de la connexion." },
      { status: 500 }
    );
  }
}

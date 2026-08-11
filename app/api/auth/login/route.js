import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";

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

    // Limite par IP ET par email visé
    const ipKey = `login:${clientKey(request)}`;
    const emailKey = `login-email:${email}`;
    if (
      !rateLimit(ipKey, { limit: 10, windowMs: 60_000 }) ||
      !rateLimit(emailKey, { limit: 8, windowMs: 60_000 })
    ) {
      return Response.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    // 🔒 Récupère user + shop (si vendor) en une seule requête
    const [user] = await sql`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.status AS user_status,
             s.id AS shop_id, s.status AS shop_status
      FROM users u
      LEFT JOIN shops s ON s.vendor_id = u.id
      WHERE u.email = ${email}
    `;

    if (!user) {
      return Response.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // 🔒 Vérification mot de passe
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return Response.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    // 🔒 BLOCAGE des comptes suspendus (tous rôles)
    if (user.user_status === "suspended") {
      return Response.json(
        { error: "Votre compte est suspendu. Contactez le support." },
        { status: 403 }
      );
    }

    // 🔒 BLOCAGE des vendors rejected (boutique non validée, définitivement)
    if (user.role === "vendor" && user.shop_status === "rejected") {
      return Response.json(
        { error: "Votre boutique n'a pas été validée. Contactez le support." },
        { status: 403 }
      );
    }

    // 🔒 Vendors sans boutique (anomalie) : bloquer
    if (user.role === "vendor" && !user.shop_id) {
      return Response.json(
        { error: "Erreur de compte vendeur. Contactez le support." },
        { status: 403 }
      );
    }

    // 🔒 Émission du JWT enrichi (status user + shopStatus si vendor)
    const token = await signToken({
      userId: user.id,
      role: user.role,
      status: user.user_status,
      ...(user.role === "vendor" && {
        shopId: user.shop_id,
        shopStatus: user.shop_status,
      }),
    });

    const response = Response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.user_status,
        shopStatus: user.shop_status, // utile pour le front (pending = bandeau KYC)
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

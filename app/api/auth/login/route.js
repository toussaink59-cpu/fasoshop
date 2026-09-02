// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { compare } from "bcryptjs";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation des inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
    }

    // Vérification longueur mot de passe
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

 // Rate-limit : 8 tentatives/min par email + 10 tentatives/min par IP
    const emailKey = `login:email:${cleanEmail}`;
    const ipKey = `login:ip:${clientKey(request)}`;

    if (!(await rateLimit(emailKey, { limit: 8, windowMs: 60_000 }))) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }
    if (!(await rateLimit(ipKey, { limit: 10, windowMs: 60_000 }))) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    // Récupérer l'utilisateur depuis la base de données
    const [user] = await sql`
      SELECT id, email, full_name, password_hash, role, status, token_version
      FROM users
      WHERE email = ${cleanEmail}
    `;

    if (!user) {
      // Délai constant pour éviter le timing attack
      await new Promise((resolve) => setTimeout(resolve, 100));
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Vérifier si le compte est suspendu
    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Votre compte a été suspendu. Contactez le support." },
        { status: 403 }
      );
    }

    // Pour les vendors : vérifier le statut de la boutique
    let shop = null;
    if (user.role === "vendor") {
      [shop] = await sql`
        SELECT id, status FROM shops WHERE vendor_id = ${user.id}
      `;
      if (!shop) {
        return NextResponse.json(
          { error: "Aucune boutique associée à ce compte." },
          { status: 403 }
        );
      }
      if (shop.status === "rejected") {
        return NextResponse.json(
          { error: "Votre demande de boutique a été refusée." },
          { status: 403 }
        );
      }
      if (shop.status === "suspended") {
        return NextResponse.json(
          { error: "Votre boutique a été suspendue." },
          { status: 403 }
        );
      }
    }

    // Générer le token JWT (jose, enrichi avec infos boutique pour vendors)
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      status: user.status,
      tokenVersion: user.token_version,
    };
    if (user.role === "vendor" && shop) {
      tokenPayload.shopId = shop.id;
      tokenPayload.shopStatus = shop.status;
    }
    const token = await signToken(tokenPayload);

    // Créer la réponse avec cookie sécurisé (NextResponse = seul à avoir .cookies)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
    });

    // Définir le cookie HTTP-only (nom officiel : fasoshop_token)
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

 // Audit log de connexion réussie
    await sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${user.id}, 'login_success', 'user', ${user.id}, ${clientKey(request)})
    `.catch(() => {});

    logger.info("User logged in", {
      route: "/api/auth/login",
      method: "POST",
      request_id: requestId,
      user_id: user.id,
      role: user.role,
      duration_ms: Date.now() - startTime,
    });
    return response;
  } catch (error) {
    logger.error("Login failed", {
      route: "/api/auth/login",
      method: "POST",
      request_id: requestId,
      error: error.message,
      duration_ms: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// POST /api/auth/register
// Inscription simple. La pièce d'identité du vendeur est soumise
// APRÈS connexion, depuis le dashboard (alerte 🪪), puis validée par l'admin.
export async function POST(request) {
  try {
    // Limite par IP : empêche la création massive automatisée de comptes.
    const key = `register:${clientKey(request)}`;
    if (!rateLimit(key, { limit: 5, windowMs: 60_000 })) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans une minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      firstName, lastName, email, password, confirmPassword, phone, role,
      dateOfBirth, nationalityCode, countryOfResidenceCode, agreeTerms,
      shopName, mainCategoryId, city,
    } = body;

    if (!firstName?.trim() || !lastName?.trim() || !email || !phone?.trim()) {
      return NextResponse.json({ error: "Prénom, nom, email et téléphone sont requis." }, { status: 400 });
    }
    if (!password || !confirmPassword) {
      return NextResponse.json({ error: "Mot de passe et confirmation requis." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Les deux mots de passe ne correspondent pas." }, { status: 400 });
    }
    if (!agreeTerms) {
      return NextResponse.json({ error: "Vous devez accepter les conditions d'utilisation." }, { status: 400 });
    }
    if (!nationalityCode || !COUNTRIES.find((c) => c.code === nationalityCode)) {
      return NextResponse.json({ error: "Nationalité invalide." }, { status: 400 });
    }
    if (!countryOfResidenceCode || !COUNTRIES.find((c) => c.code === countryOfResidenceCode)) {
      return NextResponse.json({ error: "Pays de résidence invalide." }, { status: 400 });
    }
    if (!dateOfBirth) {
      return NextResponse.json({ error: "Date de naissance requise." }, { status: 400 });
    }

    // 🔧 CORRECTION : normaliser l'email (trim + lowercase)
    // Évite les comptes dupliqués : "Jean@Example.com" === "jean@example.com"
    const cleanEmail = email.trim().toLowerCase();

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 15) return NextResponse.json({ error: "Vous devez avoir au moins 15 ans pour vous inscrire." }, { status: 400 });
    if (age > 120) return NextResponse.json({ error: "Date de naissance invalide." }, { status: 400 });

    const finalRole = role === "vendor" ? "vendor" : "buyer";

    if (finalRole === "vendor" && !shopName?.trim()) {
      return NextResponse.json({ error: "Le nom de la boutique est requis." }, { status: 400 });
    }

    // 🔧 CORRECTION : utiliser cleanEmail pour la vérification de doublon
    const existing = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const passwordHash = await bcrypt.hash(password, 10);

    // 🔧 CORRECTION : utiliser cleanEmail dans l'INSERT
    const [user] = await sql`
      INSERT INTO users (
        email, password_hash, full_name, first_name, last_name, phone, role,
        date_of_birth, nationality, country_of_residence
      )
      VALUES (
        ${cleanEmail}, ${passwordHash}, ${fullName}, ${firstName.trim()}, ${lastName.trim()}, ${phone.trim()}, ${finalRole},
        ${dateOfBirth}, ${nationalityCode}, ${countryOfResidenceCode}
      )
      RETURNING id, email, full_name, role
    `;

    if (finalRole === "vendor") {
      await sql`
        INSERT INTO shops (vendor_id, name, status, city, main_category_id)
        VALUES (${user.id}, ${shopName.trim()}, 'pending', ${city?.trim() || null}, ${mainCategoryId || null})
      `;
    }

    const token = await signToken({ userId: user.id, role: user.role });
    const response = NextResponse.json({ user }, { status: 201 });

    // Définir le cookie HTTP-only (NextResponse pour cohérence avec login)
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    // 🔒 Audit log d'inscription réussie
    await sql`
      INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${user.id}, 'register_success', 'user', ${user.id}, ${clientKey(request)})
    `.catch(() => {});

    return response;
  } catch (err) {
    console.error("Erreur register:", err);
    return NextResponse.json({ error: "Erreur serveur lors de l'inscription." }, { status: 500 });
  }
}

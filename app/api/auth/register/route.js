import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

// POST /api/auth/register
// Inscription simple. La pièce d'identité du vendeur est soumise
// APRÈS connexion, depuis le dashboard (alerte 🪪), puis validée par l'admin.
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      firstName, lastName, email, password, confirmPassword, phone, role,
      dateOfBirth, nationalityCode, countryOfResidenceCode, agreeTerms,
      shopName, mainCategoryId, city,
    } = body;

    if (!firstName?.trim() || !lastName?.trim() || !email || !phone?.trim()) {
      return Response.json({ error: "Prénom, nom, email et téléphone sont requis." }, { status: 400 });
    }
    if (!password || !confirmPassword) {
      return Response.json({ error: "Mot de passe et confirmation requis." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return Response.json({ error: "Les deux mots de passe ne correspondent pas." }, { status: 400 });
    }
    if (!agreeTerms) {
      return Response.json({ error: "Vous devez accepter les conditions d'utilisation." }, { status: 400 });
    }
    if (!nationalityCode || !COUNTRIES.find((c) => c.code === nationalityCode)) {
      return Response.json({ error: "Nationalité invalide." }, { status: 400 });
    }
    if (!countryOfResidenceCode || !COUNTRIES.find((c) => c.code === countryOfResidenceCode)) {
      return Response.json({ error: "Pays de résidence invalide." }, { status: 400 });
    }
    if (!dateOfBirth) {
      return Response.json({ error: "Date de naissance requise." }, { status: 400 });
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 15) return Response.json({ error: "Vous devez avoir au moins 15 ans pour vous inscrire." }, { status: 400 });
    if (age > 120) return Response.json({ error: "Date de naissance invalide." }, { status: 400 });

    const finalRole = role === "vendor" ? "vendor" : "buyer";

    if (finalRole === "vendor" && !shopName?.trim()) {
      return Response.json({ error: "Le nom de la boutique est requis." }, { status: 400 });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return Response.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await sql`
      INSERT INTO users (
        email, password_hash, full_name, first_name, last_name, phone, role,
        date_of_birth, nationality, country_of_residence
      )
      VALUES (
        ${email}, ${passwordHash}, ${fullName}, ${firstName.trim()}, ${lastName.trim()}, ${phone.trim()}, ${finalRole},
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
    return Response.json({ error: "Erreur serveur lors de l'inscription." }, { status: 500 });
  }
}

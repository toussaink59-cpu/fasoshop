import bcrypt from "bcryptjs";
import sql from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// POST /api/auth/register
// body: {
//   firstName, lastName, email, password, phone, role? ('buyer' | 'vendor'),
//   // Vendeur uniquement :
//   shopName?, mainCategoryId?, city?, dateOfBirth?, nationality?,
//   countryOfResidence?, verificationAcknowledged?
// }
// Nom et prénom sont stockés séparément (users.first_name/last_name) ET
// combinés dans full_name (colonne conservée, tenue à jour automatiquement,
// pour ne rien casser des 24 endroits existants qui affichent full_name).
// Pour un vendeur, la boutique est créée avec status='pending' et SANS
// document d'identité — celui-ci est demandé après connexion, sur une
// page de vérification dédiée (parcours en deux étapes). Validation du
// type de pièce faite dans PATCH /api/vendor/shop au moment de la
// soumission réelle.
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      shopName,
      mainCategoryId,
      city,
      dateOfBirth,
      nationality,
      countryOfResidence,
      verificationAcknowledged,
    } = body;

    if (!firstName?.trim() || !lastName?.trim() || !email || !password || !phone?.trim()) {
      return Response.json(
        { error: "Prénom, nom, email, téléphone et mot de passe sont requis." },
        { status: 400 }
      );
    }

    // Seuls 'buyer' et 'vendor' sont autorisés à l'inscription publique
    const finalRole = role === "vendor" ? "vendor" : "buyer";

    if (finalRole === "vendor") {
      if (!shopName || !shopName.trim()) {
        return Response.json(
          { error: "Le nom de la boutique est requis." },
          { status: 400 }
        );
      }
      if (!dateOfBirth || !nationality?.trim() || !countryOfResidence?.trim()) {
        return Response.json(
          { error: "Date de naissance, nationalité et pays de résidence sont requis pour un compte vendeur." },
          { status: 400 }
        );
      }
      if (!verificationAcknowledged) {
        return Response.json(
          { error: "Vous devez confirmer avoir compris que votre compte sera vérifié avant l'ouverture de votre boutique." },
          { status: 400 }
        );
      }
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

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (
        email, password_hash, full_name, first_name, last_name, phone, role,
        date_of_birth, nationality, country_of_residence
      )
      VALUES (
        ${email}, ${passwordHash}, ${fullName}, ${firstName.trim()}, ${lastName.trim()}, ${phone.trim()}, ${finalRole},
        ${finalRole === "vendor" ? dateOfBirth : null},
        ${finalRole === "vendor" ? nationality.trim() : null},
        ${finalRole === "vendor" ? countryOfResidence.trim() : null}
      )
      RETURNING id, email, full_name, role
    `;

    // Si c'est un vendeur, on crée automatiquement sa boutique en attente,
    // sans document d'identité — celui-ci est demandé juste après, sur
    // /vendor/dashboard ou /vendor/account (parcours en deux étapes).
    if (finalRole === "vendor") {
      await sql`
        INSERT INTO shops (vendor_id, name, status, city, main_category_id)
        VALUES (
          ${user.id}, ${shopName.trim()}, 'pending',
          ${city?.trim() || null},
          ${mainCategoryId || null}
        )
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

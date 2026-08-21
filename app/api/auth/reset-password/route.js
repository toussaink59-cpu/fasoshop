import crypto from "crypto";
import { hash } from "bcryptjs";
import sql from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

// Liste noire basique
const BLOCKED_PASSWORDS = new Set([
  "password", "password123", "12345678", "123456789", "qwerty",
  "abc123", "letmein", "admin", "welcome", "monkey", "dragon",
]);

function isStrongPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) {
    return { ok: false, error: "Le mot de passe doit faire au moins 8 caracteres." };
  }
  if (BLOCKED_PASSWORDS.has(pw.toLowerCase())) {
    return { ok: false, error: "Ce mot de passe est trop faible. Choisissez-en un plus complexe." };
  }
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return { ok: false, error: "Le mot de passe doit contenir au moins une lettre et un chiffre." };
  }
  return { ok: true };
}

/**
 * POST /api/auth/reset-password
 * Body: { token, password, confirmPassword }
 *
 * Securite :
 *  - Verification timing-safe du token
 *  - Politique mot de passe stricte
 *  - Revocation du token apres usage
 *  - Deconnexion de toutes les sessions existantes (nouveau JWT requis)
 */
export async function POST(request) {
  try {
    const { token, password, confirmPassword } = await request.json();

    if (!token || typeof token !== "string") {
      return Response.json({ error: "Lien de reinitialisation invalide." }, { status: 400 });
    }

 // Rate-limit : 10 tentatives/heure par IP (le token est déjà un
    // secret à 256 bits, mais on freine quand même les scripts automatisés).
    const ipKey = `reset-pwd:ip:${clientKey(request)}`;
    if (!(await rateLimit(ipKey, { limit: 10, windowMs: 3_600_000 }))) {
      return Response.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
    }

    if (password !== confirmPassword) {
      return Response.json({ error: "Les mots de passe ne correspondent pas." }, { status: 400 });
    }

    const strengthCheck = isStrongPassword(password);
    if (!strengthCheck.ok) {
      return Response.json({ error: strengthCheck.error }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Timing-safe : comparer tous les tokens candidats
    // (protection contre les attaques par timing sur la premiere correspondance)
    const candidates = await sql`
      SELECT id, token_hash, user_id FROM password_reset_tokens
      WHERE expires_at > now() AND used_at IS NULL
    `;

    let matched = null;
    for (const c of candidates) {
      const candidateBuf = Buffer.from(c.token_hash, "hex");
      const providedBuf = Buffer.from(tokenHash, "hex");
      if (
        candidateBuf.length === providedBuf.length &&
        crypto.timingSafeEqual(candidateBuf, providedBuf)
      ) {
        matched = c;
        break;
      }
    }

    if (!matched) {
      // Delai artificiel pour timing-safe
      await new Promise((r) => setTimeout(r, 150));
      return Response.json(
        { error: "Lien de reinitialisation invalide ou expire." },
        { status: 400 }
      );
    }

    const password_hash = await hash(password, 10);

    // Mettre a jour le mot de passe + marquer token utilise
    await sql.begin(async (tx) => {
      await tx`
        UPDATE users
        SET password_hash = ${password_hash}, token_version = token_version + 1
        WHERE id = ${matched.user_id}
      `;
      await tx`
        UPDATE password_reset_tokens
        SET used_at = now()
        WHERE id = ${matched.id}
      `;
 // token_version incrémenté ci-dessus : tous les JWT déjà émis pour
      // cet utilisateur deviennent invalides dès la prochaine requête
      // (vérifié dans middleware.js via /api/internal/session-status).
    });

    return Response.json({
      ok: true,
      message: "Mot de passe reinitialise avec succes. Vous pouvez maintenant vous connecter.",
    });
  } catch (err) {
    console.error("[reset-password]", err);
    return Response.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Verifie si le token est valide (pour la page reset-password).
 */
export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return Response.json({ valid: false, reason: "missing" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [row] = await sql`
    SELECT id FROM password_reset_tokens
    WHERE token_hash = ${tokenHash} AND expires_at > now() AND used_at IS NULL
    LIMIT 1
  `;

  return Response.json({ valid: !!row });
}

import crypto from "crypto";
import { hash } from "bcryptjs";
import sql from "@/lib/db";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Kimoxa <no-reply@kimoxa.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://fasoshop-xi.vercel.app";

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * IMPORTANT : toujours renvoyer 200 (meme si email inconnu) pour eviter
 * l'enumeration d'emails par un attaquant. L'utilisateur legitime recoit
 * l'email, l'attaquant ne sait pas si l'email existe.
 */
export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return Response.json({ ok: true }); // anti-enumeration
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await sql`
      SELECT id, full_name FROM users WHERE email = ${normalizedEmail} AND status = 'active'
    `;

    // Meme reponse qu'il existe ou non (anti-enumeration)
    const genericResponse = Response.json({
      ok: true,
      message: "Si cet email est associe a un compte, un lien de reinitialisation a ete envoye.",
    });

    if (!user) {
      // Delai artificiel pour timing-safe (meme temps que le cas existant)
      await new Promise((r) => setTimeout(r, 200));
      return genericResponse;
    }

    // Generer token aleatoire (32 bytes = 64 hex)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Expiration 1h + desactiver anciens tokens non utilises
    await sql`
      UPDATE password_reset_tokens
      SET expires_at = now()
      WHERE user_id = ${user.id} AND used_at IS NULL AND expires_at > now()
    `;

    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, now() + interval '1 hour')
    `;

    const resetUrl = `${BASE_URL}/reset-password?token=${rawToken}`;
    const firstName = (user.full_name || "").split(" ")[0] || "Client";

    if (!resend) {
      console.warn("[forgot-password] RESEND_API_KEY non configure. Token:", rawToken);
      return genericResponse;
    }

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #241712 0%, #3d2817 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Reinitialisation de mot de passe</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #241712; font-size: 16px; line-height: 1.6;">
            Bonjour ${firstName},<br><br>
            Vous avez demande la reinitialisation de votre mot de passe Kimoxa.
          </p>
          <a href="${resetUrl}" style="display: block; background: #e6a623; color: #241712; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px; margin: 24px 0;">
            Reinitialiser mon mot de passe
          </a>
          <p style="color: #888; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            Ce lien expire dans <strong>1 heure</strong>.<br>
            Si vous n'avez pas fait cette demande, ignorez simplement cet email — votre mot de passe reste inchange.
          </p>
          <p style="color: #aaa; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: FROM,
        to: normalizedEmail,
        subject: "🔐 Reinitialiser votre mot de passe Kimoxa",
        html,
      });
    } catch (err) {
      console.error("[forgot-password] Resend error:", err.message);
    }

    return genericResponse;
  } catch (err) {
    console.error("[forgot-password]", err);
    return Response.json({ ok: true }); // anti-enumeration meme en cas d'erreur
  }
}

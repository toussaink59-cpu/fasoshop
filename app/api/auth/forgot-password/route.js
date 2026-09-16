import crypto from "crypto";
import { hash } from "bcryptjs";
import sql from "@/lib/db";
import { Resend } from "resend";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.EMAIL_FROM ||
  "Kimoxa <no-reply@kimoxa.com>";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://kimoxa.com";

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * IMPORTANT :
 * Toujours renvoyer 200, même si l'email est inconnu,
 * afin d'empêcher l'énumération des comptes.
 */
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (
      !email ||
      typeof email !== "string"
    ) {
      return Response.json({
        ok: true,
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // -------------------------------------------------------
    // Rate limit
    // -------------------------------------------------------

    const rlEmailKey =
      `forgot-pwd:email:${normalizedEmail}`;

    const rlIpKey =
      `forgot-pwd:ip:${clientKey(request)}`;

    if (
      !(await rateLimit(
        rlEmailKey,
        {
          limit: 5,
          windowMs: 3_600_000,
        }
      ))
    ) {
      return Response.json({
        ok: true,
      });
    }

    if (
      !(await rateLimit(
        rlIpKey,
        {
          limit: 10,
          windowMs: 3_600_000,
        }
      ))
    ) {
      return Response.json({
        ok: true,
      });
    }

    // -------------------------------------------------------
    // Recherche utilisateur
    // -------------------------------------------------------

    const [user] = await sql`
      SELECT
        id,
        full_name
      FROM users
      WHERE email = ${normalizedEmail}
        AND status = 'active'
    `;

    // Réponse générique dans tous les cas.
    const genericResponse =
      Response.json({
        ok: true,
        message:
          "Si cet email est associe a un compte, un lien de reinitialisation a ete envoye.",
      });

    // -------------------------------------------------------
    // Email inexistant
    // -------------------------------------------------------

    if (!user) {
      // Délai artificiel pour éviter les différences
      // de timing entre email existant / inexistant.
      await new Promise((resolve) =>
        setTimeout(resolve, 200)
      );

      return genericResponse;
    }

    // -------------------------------------------------------
    // Génération du token
    // -------------------------------------------------------

    const rawToken =
      crypto.randomBytes(32).toString("hex");

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    // -------------------------------------------------------
    // Désactivation anciens tokens
    // -------------------------------------------------------

    await sql`
      UPDATE password_reset_tokens
      SET expires_at = now()
      WHERE user_id = ${user.id}
        AND used_at IS NULL
        AND expires_at > now()
    `;

    // -------------------------------------------------------
    // Création nouveau token
    // -------------------------------------------------------

    await sql`
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES (
        ${user.id},
        ${tokenHash},
        now() + interval '1 hour'
      )
    `;

    const resetUrl =
      `${BASE_URL}/reset-password?token=${rawToken}`;

    const firstName =
      (user.full_name || "")
        .split(" ")[0] ||
      "Client";

    // -------------------------------------------------------
    // MODE E2E
    // -------------------------------------------------------
    //
    // Le token existe réellement en DB.
    // Seul l'envoi réseau Resend est simulé.
    //
    // On retourne devResetUrl uniquement parce que les E2E
    // ont besoin de récupérer le token sans dépendre d'un email.
    if (process.env.E2E_TEST_MODE === "1") {
      console.log(
        "[forgot-password] E2E_TEST_MODE=1 — envoi Resend simulé"
      );

      return Response.json({
        ok: true,
        message:
          "Si cet email est associe a un compte, un lien de reinitialisation a ete envoye.",
        devResetUrl: resetUrl,
      });
    }

    // -------------------------------------------------------
    // Pas de clé Resend
    // -------------------------------------------------------

    if (!resend) {
      console.warn(
        "[forgot-password] RESEND_API_KEY non configure - email non envoye"
      );

      // En développement non-production, garder le mécanisme
      // existant permettant de récupérer le lien localement.
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        return Response.json({
          ok: true,
          message:
            "Si cet email est associe a un compte, un lien de reinitialisation a ete envoye.",
          devResetUrl: resetUrl,
        });
      }

      return genericResponse;
    }

    // -------------------------------------------------------
    // Contenu email
    // -------------------------------------------------------

    const html = `
      <div style="
        font-family: system-ui, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #fff;
      ">
        <div style="
          background: linear-gradient(
            135deg,
            #241712 0%,
            #3d2817 100%
          );
          padding: 32px 24px;
          text-align: center;
        ">
          <h1 style="
            color: #fff;
            margin: 0;
            font-size: 24px;
          ">
            Réinitialisation de mot de passe
          </h1>
        </div>

        <div style="padding: 32px 24px;">
          <p style="
            color: #241712;
            font-size: 16px;
            line-height: 1.6;
          ">
            Bonjour ${firstName},<br><br>

            Vous avez demandé la réinitialisation
            de votre mot de passe Kimoxa.
          </p>

          <a
            href="${resetUrl}"
            style="
              display: block;
              background: #e6a623;
              color: #241712;
              text-decoration: none;
              padding: 16px;
              border-radius: 8px;
              text-align: center;
              font-weight: 600;
              font-size: 16px;
              margin: 24px 0;
            "
          >
            Réinitialiser mon mot de passe
          </a>

          <p style="
            color: #888;
            font-size: 13px;
            line-height: 1.5;
            margin-top: 24px;
          ">
            Ce lien expire dans
            <strong>1 heure</strong>.<br>

            Si vous n'avez pas fait cette demande,
            ignorez simplement cet email —
            votre mot de passe reste inchangé.
          </p>

          <p style="
            color: #aaa;
            font-size: 12px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #eee;
          ">
            Si le bouton ne fonctionne pas,
            copiez ce lien dans votre navigateur :<br>

            <span style="
              word-break: break-all;
            ">
              ${resetUrl}
            </span>
          </p>
        </div>
      </div>
    `;

    // -------------------------------------------------------
    // Envoi réel
    // -------------------------------------------------------

    try {
      await resend.emails.send({
        from: FROM,
        to: normalizedEmail,
        subject:
          "Réinitialiser votre mot de passe Kimoxa",
        html,
      });
    } catch (err) {
      // Ne jamais divulguer l'échec Resend à l'utilisateur.
      // On conserve l'anti-énumération.
      console.error(
        "[forgot-password] Resend error:",
        err instanceof Error
          ? err.message
          : err
      );
    }

    return genericResponse;
  } catch (err) {
    // Même en cas d'erreur interne :
    // réponse générique pour éviter l'énumération.
    console.error(
      "[forgot-password]",
      err
    );

    return Response.json({
      ok: true,
    });
  }
}
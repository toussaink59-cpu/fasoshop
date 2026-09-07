export const runtime = "nodejs";

// app/api/sandbox/simulate/route.js
//
// Pont serveur pour le mode sandbox.
//
// Le navigateur ne connaît jamais PAYMENT_SANDBOX_SECRET.
// Il transmet uniquement un capability temporaire signé.

import sql from "@/lib/db";
import { sameOrigin } from "@/lib/csrf";
import { getCurrentUser } from "@/lib/session";
import {
  rateLimit,
  clientKey,
} from "@/lib/rate-limit";
import { getProvider } from "@/lib/payment/provider";
import {
  signSandboxPayload,
} from "@/lib/payment/adapters/sandbox";
import {
  verifySandboxCapability,
} from "@/lib/sandboxAuth";

export async function POST(
  request
) {
  // =====================================================
  // 1. Sandbox explicitement activée
  // =====================================================

  if (
    process.env.ALLOW_SANDBOX_SIMULATION !==
    "1"
  ) {
    return Response.json(
      { error: "Not found." },
      { status: 404 }
    );
  }

  // JAMAIS de simulation sandbox en production réelle.
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return Response.json(
      { error: "Not found." },
      { status: 404 }
    );
  }

  // =====================================================
  // 2. Protection CSRF / same-origin
  // =====================================================

  if (!sameOrigin(request)) {
    return Response.json(
      {
        error:
          "Origine non autorisée.",
      },
      { status: 403 }
    );
  }

  // =====================================================
  // 3. Utilisateur authentifié
  // =====================================================

  const user =
    await getCurrentUser();

  if (!user) {
    return Response.json(
      {
        error:
          "Connexion requise.",
      },
      { status: 401 }
    );
  }

  // =====================================================
  // 4. Rate limit
  // =====================================================

  const rlKey =
    `sandbox-simulate:${user.id}:${clientKey(
      request
    )}`;

  if (
    !(await rateLimit(
      rlKey,
      {
        limit: 5,
        windowMs: 60_000,
      }
    ))
  ) {
    return Response.json(
      {
        error:
          "Trop de requêtes.",
      },
      { status: 429 }
    );
  }

  // =====================================================
  // 5. Vérifier le provider
  // =====================================================

  const provider =
    getProvider();

  if (
    provider.name !==
    "sandbox"
  ) {
    return Response.json(
      {
        error:
          "Mode sandbox inactif.",
      },
      { status: 404 }
    );
  }

  // =====================================================
  // 6. Lire le body
  // =====================================================

  let body;

  try {
    body =
      await request.json();
  } catch {
    return Response.json(
      {
        error:
          "Payload invalide.",
      },
      { status: 400 }
    );
  }

  const transactionId =
    String(
      body?.transaction_id || ""
    ).trim();

  const amount =
    Number(body?.amount);

  const status =
    body?.status === "success"
      ? "success"
      : body?.status === "failed"
      ? "failed"
      : null;

  if (
    !transactionId ||
    transactionId.length > 200
  ) {
    return Response.json(
      {
        error:
          "Transaction invalide.",
      },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return Response.json(
      {
        error:
          "Montant invalide.",
      },
      { status: 400 }
    );
  }

  if (!status) {
    return Response.json(
      {
        error:
          "Statut invalide.",
      },
      { status: 400 }
    );
  }

  // =====================================================
  // 7. Vérifier le capability
  // =====================================================

  const capability =
    request.headers.get(
      "x-sandbox-capability"
    ) || "";

  const capabilityValid =
    verifySandboxCapability({
      token:
        capability,
      transactionId,
      amount,
    });

  if (!capabilityValid) {
    return Response.json(
      {
        error:
          "Not found.",
      },
      { status: 404 }
    );
  }

  // =====================================================
  // 8. Vérification DB
  // =====================================================

  let payment;

  try {
    [payment] = await sql`
      SELECT
        p.id,
        p.order_id,
        p.provider,
        p.status,
        p.amount,
        o.buyer_id
      FROM payments p
      JOIN orders o
        ON o.id = p.order_id
      WHERE p.transaction_id =
        ${transactionId}
      LIMIT 1
    `;
  } catch (err) {
    console.error(
      "[sandbox/simulate] DB lookup error:",
      err
    );

    return Response.json(
      {
        error:
          "Erreur serveur.",
      },
      { status: 500 }
    );
  }

  if (!payment) {
    return Response.json(
      {
        error:
          "Transaction introuvable.",
      },
      { status: 404 }
    );
  }

  // La transaction doit appartenir
  // à l'utilisateur connecté.
  if (
    String(payment.buyer_id) !==
    String(user.id)
  ) {
    return Response.json(
      {
        error:
          "Not found.",
      },
      { status: 404 }
    );
  }

  // La transaction doit être réellement sandbox.
  if (
    payment.provider !==
    "sandbox"
  ) {
    return Response.json(
      {
        error:
          "Not found.",
      },
      { status: 404 }
    );
  }

  // Impossible de rejouer une transaction.
  if (
    payment.status !==
    "initiated"
  ) {
    return Response.json(
      {
        error:
          "Ce paiement a déjà été traité.",
      },
      { status: 409 }
    );
  }

  // Le montant fourni par le navigateur
  // doit correspondre au montant DB.
  if (
    !Number.isFinite(
      Number(payment.amount)
    ) ||
    Math.abs(
      Number(payment.amount) -
        amount
    ) > 1
  ) {
    return Response.json(
      {
        error:
          "Montant incohérent.",
      },
      { status: 400 }
    );
  }

  // =====================================================
  // 9. Payload webhook
  // =====================================================

  const payload = {
    transaction_id:
      transactionId,

    status,

    amount:
      Number(payment.amount),
  };

  // =====================================================
  // 10. Signature HMAC côté serveur
  // =====================================================

  let signature;

  try {
    signature =
      signSandboxPayload(
        payload
      );
  } catch (err) {
    console.error(
      "[sandbox/simulate] signature error:",
      err
    );

    return Response.json(
      {
        error:
          "Configuration sandbox invalide.",
      },
      { status: 500 }
    );
  }

  // =====================================================
  // 11. Appel interne du webhook
  // =====================================================

  try {
    const baseUrl =
      process.env.APP_BASE_URL ||
      new URL(
        request.url
      ).origin;

    const webhookUrl =
      `${baseUrl}/api/payments/sandbox/webhook`;

    const webhookResponse =
      await fetch(
        webhookUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-signature":
              signature,

            "x-sandbox-internal":
              "1",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      await webhookResponse
        .json()
        .catch(() => ({
          error:
            "Réponse webhook invalide.",
        }));

    return Response.json(
      data,
      {
        status:
          webhookResponse.status,
      }
    );
  } catch (err) {
    console.error(
      "[sandbox/simulate] webhook error:",
      err
    );

    return Response.json(
      {
        error:
          "Erreur lors de la simulation du paiement.",
      },
      { status: 500 }
    );
  }
}

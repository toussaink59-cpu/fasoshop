export const runtime = "nodejs";

// app/api/payments/[provider]/webhook/route.js
import sql from "@/lib/db";
import { getProvider } from "@/lib/payment/provider";
import { sendMail, emailTemplates } from "@/lib/email";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(request, { params }) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const { provider: providerName } = await params;

  try {
    const provider = getProvider();

    if (provider.name !== providerName) {
      return Response.json(
        { error: "Fournisseur inconnu." },
        { status: 404 }
      );
    }

    const { adapter } = provider;

    // =========================================================
    // 1. Lire le payload brut
    // =========================================================

    const rawBody = await request.text();

    // =========================================================
    // 2. Vérification signature AVANT JSON.parse
    // =========================================================

    const signatureHeader =
      request.headers.get("x-signature") ||
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-ligdicash-signature") ||
      request.headers.get("x-cinetpay-signature") ||
      "";

    const signatureValid =
      await adapter.verifyWebhookSignature(
        rawBody,
        signatureHeader
      );

    if (!signatureValid) {
      logger.warn("Webhook signature invalid", {
        route: "/api/payments/" + providerName + "/webhook",
        method: "POST",
        request_id: requestId,
        provider: providerName,
        duration_ms: Date.now() - startTime,
      });

      return Response.json(
        { error: "Signature invalide." },
        { status: 403 }
      );
    }

    // =========================================================
    // 3. Parser le JSON
    // =========================================================

    let body;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json(
        { error: "Payload JSON invalide." },
        { status: 400 }
      );
    }

    // =========================================================
    // 4. Parser l'événement provider
    // =========================================================

    const event = await adapter.parseWebhookEvent(body);

    if (!event?.transactionId) {
      logger.warn("Webhook missing transaction_id", {
        route: "/api/payments/" + providerName + "/webhook",
        method: "POST",
        request_id: requestId,
        provider: providerName,
        body_preview: JSON.stringify(body).slice(0, 200),
        duration_ms: Date.now() - startTime,
      });

      return Response.json(
        { error: "transaction_id manquant." },
        { status: 400 }
      );
    }

    const transactionId = String(
      event.transactionId
    ).trim();

    if (!transactionId || transactionId.length > 200) {
      return Response.json(
        { error: "transaction_id invalide." },
        { status: 400 }
      );
    }

    // =========================================================
    // 5. Validation stricte du montant
    //
    // IMPORTANT :
    // - montant obligatoire
    // - montant numérique
    // - montant fini
    // - plafond de sécurité
    // - tolérance métier de 1 FCFA ensuite
    // =========================================================

    const eventAmount = Number(event.amount);

    const amountValid =
      event.amount !== undefined &&
      event.amount !== null &&
      Number.isFinite(eventAmount) &&
      eventAmount > 0 &&
      Math.abs(eventAmount) <= 100_000_000;

    // =========================================================
    // 6. BRANCHE SPONSORING
    // =========================================================

    if (transactionId.startsWith("KMX-SPONSOR-")) {
      const match = transactionId.match(
        /^KMX-SPONSOR-(\d+)-/
      );

      const sponsorId = match ? Number(match[1]) : null;

      if (
        !Number.isInteger(sponsorId) ||
        sponsorId <= 0
      ) {
        console.warn(
          `[webhook] ID sponsoring illisible: ${transactionId}`
        );

        return Response.json({
          received: true,
        });
      }

      const sponsorResult = await sql.begin(
        async (tx) => {
          // ---------------------------------------------------
          // IMPORTANT :
          // SELECT + FOR UPDATE DANS LA MÊME TRANSACTION
          // ---------------------------------------------------

          const [sr] = await tx`
            SELECT
              id,
              product_id,
              duration_days,
              price_fcfa,
              status
            FROM sponsorship_requests
            WHERE id = ${sponsorId}
            FOR UPDATE
          `;

          if (!sr) {
            return {
              type: "not_found",
            };
          }

          // Déjà traité
          if (
            sr.status === "approved" ||
            sr.status === "rejected"
          ) {
            return {
              type: "already_processed",
            };
          }

          // ---------------------------------------------------
          // Montant obligatoire
          // ---------------------------------------------------

          if (!amountValid) {
            console.error(
              `[webhook] Montant sponsoring absent/illisible`,
              {
                sponsorId,
                raw: event.amount,
              }
            );

            await tx`
              UPDATE sponsorship_requests
              SET
                status = 'rejected',
                admin_notes = 'Montant webhook illisible',
                reviewed_at = NOW()
              WHERE id = ${sr.id}
                AND status = 'pending'
            `;

            return {
              type: "invalid_amount",
            };
          }

          // ---------------------------------------------------
          // Vérification stricte du montant
          // ---------------------------------------------------

          const expectedAmount =
            Number(sr.price_fcfa);

          if (
            !Number.isFinite(expectedAmount) ||
            Math.abs(
              eventAmount - expectedAmount
            ) > 1
          ) {
            console.error(
              `[webhook] Montant sponsoring incohérent`,
              {
                expected: expectedAmount,
                received: eventAmount,
                sponsorId,
              }
            );

            await tx`
              UPDATE sponsorship_requests
              SET
                status = 'rejected',
                admin_notes = 'Montant incohérent',
                reviewed_at = NOW()
              WHERE id = ${sr.id}
                AND status = 'pending'
            `;

            return {
              type: "amount_mismatch",
            };
          }

          // ---------------------------------------------------
          // Validation du statut attendu
          //
          // Si ta logique métier autorise seulement pending,
          // on verrouille également ce cas.
          // ---------------------------------------------------

          if (sr.status !== "pending") {
            return {
              type: "invalid_status",
            };
          }

          // ---------------------------------------------------
          // Durée sûre
          // ---------------------------------------------------

          const durationDays = Number(
            sr.duration_days || 30
          );

          if (
            !Number.isInteger(durationDays) ||
            durationDays <= 0 ||
            durationDays > 3650
          ) {
            console.error(
              `[webhook] Durée sponsoring invalide`,
              {
                sponsorId: sr.id,
                duration_days: sr.duration_days,
              }
            );

            await tx`
              UPDATE sponsorship_requests
              SET
                status = 'rejected',
                admin_notes = 'Durée sponsoring invalide',
                reviewed_at = NOW()
              WHERE id = ${sr.id}
                AND status = 'pending'
            `;

            return {
              type: "invalid_duration",
            };
          }

          // ---------------------------------------------------
          // Activation atomique
          // ---------------------------------------------------

          const [updatedSponsor] = await tx`
            UPDATE sponsorship_requests
            SET
              status = 'approved',
              reviewed_at = NOW()
            WHERE id = ${sr.id}
              AND status = 'pending'
            RETURNING id
          `;

          // Si aucun row n'a été modifié, un traitement
          // concurrent a déjà changé le statut.
          if (!updatedSponsor) {
            return {
              type: "already_processed",
            };
          }

          await tx`
            UPDATE products
            SET
              is_sponsored = true,
              sponsored_until =
                NOW() +
                (${durationDays} * INTERVAL '1 day')
            WHERE id = ${sr.product_id}
          `;

          return {
            type: "success",
            sponsorId: sr.id,
          };
        }
      );

      // -------------------------------------------------------
      // Réponses sponsoring APRÈS COMMIT
      // -------------------------------------------------------

      if (sponsorResult.type === "not_found") {
        console.warn(
          `[webhook] Sponsoring #${sponsorId} introuvable`
        );

        return Response.json({
          received: true,
        });
      }

      if (
        sponsorResult.type === "already_processed"
      ) {
        return Response.json({
          received: true,
          alreadyProcessed: true,
        });
      }

      if (
        sponsorResult.type === "invalid_amount"
      ) {
        return Response.json(
          { error: "Montant illisible." },
          { status: 400 }
        );
      }

      if (
        sponsorResult.type === "amount_mismatch"
      ) {
        return Response.json(
          { error: "Montant incohérent." },
          { status: 400 }
        );
      }

      if (
        sponsorResult.type === "invalid_status"
      ) {
        return Response.json(
          { error: "Statut sponsoring invalide." },
          { status: 400 }
        );
      }

      if (
        sponsorResult.type === "invalid_duration"
      ) {
        return Response.json(
          { error: "Durée sponsoring invalide." },
          { status: 400 }
        );
      }

      logger.info("Sponsorship webhook processed", {
        route:
          "/api/payments/" +
          providerName +
          "/webhook",
        method: "POST",
        request_id: requestId,
        provider: providerName,
        transaction_id: transactionId,
        sponsor_id: sponsorResult.sponsorId,
        status: "approved",
        duration_ms:
          Date.now() - startTime,
      });

      return Response.json({
        received: true,
        status: "approved",
      });
    }

    // =========================================================
    // 7. BRANCHE COMMANDES
    // =========================================================

    const paymentResult = await sql.begin(
      async (tx) => {
        // ---------------------------------------------------
        // CRITIQUE :
        // SELECT + FOR UPDATE + UPDATE = MÊME TRANSACTION
        // ---------------------------------------------------

        const [payment] = await tx`
          SELECT
            id,
            order_id,
            status,
            amount,
            provider
          FROM payments
          WHERE transaction_id = ${transactionId}
          FOR UPDATE
        `;

        // Transaction inconnue
        if (!payment) {
          return {
            type: "not_found",
          };
        }

        // ---------------------------------------------------
        // Idempotence
        // ---------------------------------------------------

        if (
          payment.status === "success" ||
          payment.status === "failed"
        ) {
          return {
            type: "already_processed",
          };
        }

        // ---------------------------------------------------
        // Vérification provider
        // ---------------------------------------------------

        if (
          payment.provider &&
          payment.provider !== providerName
        ) {
          console.error(
            `[webhook] Fournisseur incohérent pour ${transactionId}`,
            {
              expected: payment.provider,
              got: providerName,
            }
          );

          return {
            type: "provider_mismatch",
          };
        }

        // ---------------------------------------------------
        // Montant obligatoire
        // ---------------------------------------------------

        if (!amountValid) {
          console.error(
            `[webhook/${providerName}] Montant absent ou illisible pour transaction ${transactionId}`,
            {
              raw: event.amount,
            }
          );

          await tx`
            UPDATE payments
            SET
              status = 'failed',
              raw_response = ${JSON.stringify({
                ...body,
                error:
                  "amount_missing_or_unreadable",
              })}::jsonb,
              updated_at = NOW()
            WHERE id = ${payment.id}
          `;

          return {
            type: "invalid_amount",
          };
        }

        // ---------------------------------------------------
        // Vérification montant serveur
        // ---------------------------------------------------

        const expectedPaymentAmount =
          Number(payment.amount);

        if (
          !Number.isFinite(expectedPaymentAmount)
        ) {
          console.error(
            `[webhook/${providerName}] Montant DB invalide pour transaction ${transactionId}`,
            {
              db_amount: payment.amount,
            }
          );

          await tx`
            UPDATE payments
            SET
              status = 'failed',
              raw_response = ${JSON.stringify({
                ...body,
                error:
                  "invalid_database_amount",
              })}::jsonb,
              updated_at = NOW()
            WHERE id = ${payment.id}
          `;

          return {
            type: "invalid_database_amount",
          };
        }

        if (
          Math.abs(
            eventAmount -
              expectedPaymentAmount
          ) > 1
        ) {
          console.error(
            `[webhook/${providerName}] Montant incohérent pour transaction ${transactionId}`,
            {
              expected: expectedPaymentAmount,
              received: eventAmount,
            }
          );

          await tx`
            UPDATE payments
            SET
              status = 'failed',
              raw_response = ${JSON.stringify({
                ...body,
                error: "amount_mismatch",
              })}::jsonb,
              updated_at = NOW()
            WHERE id = ${payment.id}
          `;

          return {
            type: "amount_mismatch",
          };
        }

        // ---------------------------------------------------
        // Statut webhook valide
        // ---------------------------------------------------

        if (
          !["success", "failed"].includes(
            String(event.status)
          )
        ) {
          console.warn(
            `[webhook/${providerName}] Statut non reconnu: ${event.status}`
          );

          return {
            type: "invalid_status",
          };
        }

        const newStatus =
          event.status === "success"
            ? "success"
            : "failed";

        // ---------------------------------------------------
        // Mise à jour atomique du paiement
        // ---------------------------------------------------

        const [updatedPayment] = await tx`
          UPDATE payments
          SET
            status = ${newStatus},
            raw_response =
              ${JSON.stringify(body)}::jsonb,
            updated_at = NOW()
          WHERE id = ${payment.id}
            AND status = 'initiated'
          RETURNING id, order_id, amount
        `;

        // Sécurité supplémentaire :
        // si une autre transaction a déjà traité le paiement,
        // aucun UPDATE ne sera effectué.
        if (!updatedPayment) {
          return {
            type: "already_processed",
          };
        }

        // ---------------------------------------------------
        // SUCCÈS : commande -> paid
        // ---------------------------------------------------

        if (newStatus === "success") {
          await tx`
            UPDATE orders
            SET status = 'paid'
            WHERE id = ${payment.order_id}
              AND status = 'pending'
          `;

          // Audit dans la même transaction
          await tx`
            INSERT INTO security_audit_log
              (
                action,
                resource_type,
                resource_id,
                ip_address
              )
            VALUES
              (
                'payment_success',
                'payment',
                ${payment.id},
                ${providerName}
              )
          `.catch(() => {});

          return {
            type: "success",
            paymentId: payment.id,
            orderId: payment.order_id,
          };
        }

        // ---------------------------------------------------
        // ÉCHEC
        // ---------------------------------------------------

        await tx`
          INSERT INTO security_audit_log
            (
              action,
              resource_type,
              resource_id,
              ip_address
            )
          VALUES
            (
              'payment_failed',
              'payment',
              ${payment.id},
              ${providerName}
            )
        `.catch(() => {});

        return {
          type: "failed",
          paymentId: payment.id,
          orderId: payment.order_id,
        };
      }
    );

    // =========================================================
    // 8. Réponses transactionnelles
    // =========================================================

    if (paymentResult.type === "not_found") {
      console.warn(
        `[webhook/${providerName}] transaction_id inconnu: ${transactionId}`
      );

      return Response.json({
        received: true,
      });
    }

    if (
      paymentResult.type ===
      "already_processed"
    ) {
      return Response.json({
        received: true,
        alreadyProcessed: true,
      });
    }

    if (
      paymentResult.type ===
      "provider_mismatch"
    ) {
      return Response.json(
        {
          error:
            "Fournisseur incohérent.",
        },
        { status: 400 }
      );
    }

    if (
      paymentResult.type ===
      "invalid_amount"
    ) {
      return Response.json(
        {
          error:
            "Montant illisible.",
        },
        { status: 400 }
      );
    }

    if (
      paymentResult.type ===
      "invalid_database_amount"
    ) {
      return Response.json(
        {
          error:
            "Montant de paiement invalide.",
        },
        { status: 400 }
      );
    }

    if (
      paymentResult.type ===
      "amount_mismatch"
    ) {
      return Response.json(
        {
          error:
            "Montant incohérent.",
        },
        { status: 400 }
      );
    }

    if (
      paymentResult.type ===
      "invalid_status"
    ) {
      return Response.json(
        {
          error:
            "Statut non reconnu.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 9. Email UNIQUEMENT APRÈS COMMIT
    // =========================================================

    if (
      paymentResult.type === "success"
    ) {
      try {
        const [orderInfo] =
          await sql`
            SELECT
              o.id,
              o.total,
              u.email
            FROM orders o
            JOIN users u
              ON u.id = o.buyer_id
            WHERE o.id =
              ${paymentResult.orderId}
          `;

        if (orderInfo?.email) {
          const tpl =
            emailTemplates.paymentSuccess({
              orderId: orderInfo.id,
              amount:
                Number(
                  orderInfo.total
                ).toLocaleString(
                  "fr-FR"
                ),
            });

          await sendMail({
            to: orderInfo.email,
            subject: tpl.subject,
            html: tpl.html,
          });
        }
      } catch (emailErr) {
        console.error(
          "[webhook] Email non envoyé:",
          emailErr.message
        );
      }

      logger.info(
        "Webhook processed",
        {
          route:
            "/api/payments/" +
            providerName +
            "/webhook",
          method: "POST",
          request_id:
            requestId,
          provider:
            providerName,
          transaction_id:
            transactionId,
          status: "success",
          duration_ms:
            Date.now() -
            startTime,
        }
      );

      return Response.json({
        received: true,
        status: "success",
      });
    }

    if (
      paymentResult.type === "failed"
    ) {
      logger.info(
        "Webhook processed",
        {
          route:
            "/api/payments/" +
            providerName +
            "/webhook",
          method: "POST",
          request_id:
            requestId,
          provider:
            providerName,
          transaction_id:
            transactionId,
          status: "failed",
          duration_ms:
            Date.now() -
            startTime,
        }
      );

      return Response.json({
        received: true,
        status: "failed",
      });
    }

    // Fallback de sécurité
    return Response.json(
      {
        error:
          "État de traitement inattendu.",
      },
      { status: 500 }
    );
  } catch (err) {
    logger.error(
      "Webhook processing failed",
      {
        route:
          "/api/payments/" +
          providerName +
          "/webhook",
        method: "POST",
        request_id:
          requestId,
        provider:
          providerName,
        error:
          err?.message ||
          "Unknown error",
        duration_ms:
          Date.now() -
          startTime,
      }
    );

    return Response.json(
      {
        error:
          "Internal error",
      },
      { status: 500 }
    );
  }
}
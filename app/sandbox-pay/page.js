"use client";

// app/sandbox-pay/page.js

import {
  useSearchParams,
  useRouter,
} from "next/navigation";

import {
  useToast,
} from "@/lib/toast";

import {
  Suspense,
} from "react";

function getSafeReturnUrl(
  returnUrl
) {
  if (!returnUrl) {
    return "/orders";
  }

  try {
    const currentOrigin =
      window.location.origin;

    const parsed =
      new URL(
        returnUrl,
        currentOrigin
      );

    // Protection contre les open redirects.
    if (
      parsed.origin !==
      currentOrigin
    ) {
      return "/orders";
    }

    return (
      parsed.pathname +
      parsed.search +
      parsed.hash
    );
  } catch {
    return "/orders";
  }
}

function SandboxPayContent() {
  const searchParams =
    useSearchParams();

  const router =
    useRouter();

  const toast =
    useToast();

  const transactionId =
    searchParams.get(
      "transaction_id"
    );

  const amount =
    searchParams.get(
      "amount"
    );

  const returnUrl =
    searchParams.get(
      "return_url"
    );

  // Capability temporaire.
  // Ce n'est PAS le secret serveur.
  const sandboxToken =
    searchParams.get(
      "sandbox_token"
    );

  async function simulatePayment(
    status
  ) {
    try {
      if (!transactionId) {
        toast.error(
          "Transaction sandbox invalide."
        );
        return;
      }

      if (!sandboxToken) {
        toast.error(
          "Session sandbox invalide."
        );
        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        toast.error(
          "Montant sandbox invalide."
        );
        return;
      }

      if (
        status !== "success" &&
        status !== "failed"
      ) {
        toast.error(
          "Statut sandbox invalide."
        );
        return;
      }

      const res =
        await fetch(
          "/api/sandbox/simulate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              // Capability temporaire uniquement.
              // Aucun secret serveur.
              "x-sandbox-capability":
                sandboxToken,
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                transaction_id:
                  transactionId,

                status,

                amount:
                  numericAmount,
              }),
          }
        );

      const data =
        await res
          .json()
          .catch(() => ({}));

      if (!res.ok) {
        toast.error(
          "Erreur simulation : " +
            (
              data?.error ||
              `HTTP ${res.status}`
            )
        );
        return;
      }

      toast.success(
        "Paiement simulé : " +
          (
            status === "success"
              ? "RÉUSSI"
              : "ÉCHOUÉ"
          )
      );

      router.push(
        getSafeReturnUrl(
          returnUrl
        )
      );
    } catch (err) {
      console.error(
        "[sandbox-pay]",
        err
      );

      toast.error(
        "Erreur lors de la simulation du paiement."
      );
    }
  }

  return (
    <div
      className="shell"
      style={{
        maxWidth: 500,
        margin:
          "50px auto",
        padding: 20,
      }}
    >
      <h1>
        [TEST] Sandbox Mobile Money
      </h1>

      <p
        style={{
          color: "#888",
        }}
      >
        Mode test — aucun vrai
        paiement n'est effectué.
      </p>

      <div
        style={{
          background:
            "#f5f5f5",
          padding: 16,
          borderRadius: 8,
          margin: "20px 0",
        }}
      >
        <p>
          <strong>
            Transaction ID :
          </strong>{" "}
          {transactionId ||
            "Inconnue"}
        </p>

        <p>
          <strong>
            Montant :
          </strong>{" "}
          {amount ||
            "Inconnu"}{" "}
          FCFA
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexDirection:
            "column",
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            simulatePayment(
              "success"
            )
          }
          style={{
            padding: 14,
          }}
        >
          [OK] Simuler paiement
          RÉUSSI
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            simulatePayment(
              "failed"
            )
          }
          style={{
            padding: 14,
          }}
        >
          [FAIL] Simuler paiement
          ÉCHOUÉ
        </button>
      </div>
    </div>
  );
}

export default function SandboxPayPage() {
  return (
    <Suspense
      fallback={
        <div className="shell">
          <p>
            Chargement...
          </p>
        </div>
      }
    >
      <SandboxPayContent />
    </Suspense>
  );
}

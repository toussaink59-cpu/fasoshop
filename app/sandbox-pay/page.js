// app/sandbox-pay/page.js
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SandboxPayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const transactionId = searchParams.get("transaction_id");
  const amount = searchParams.get("amount");
  const returnUrl = searchParams.get("return_url");
  const notifyUrl = searchParams.get("notify_url");

  async function simulatePayment(status) {
    try {
      // Simule l'envoi du webhook au serveur
      const payload = {
        transaction_id: transactionId,
        status,
        amount: Number(amount),
      };

      // Import dynamique pour signSandboxPayload
      const { signSandboxPayload } = await import("@/lib/payment/adapters/sandbox");
      const signature = signSandboxPayload(payload);

      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      // Redirige vers la page de confirmation
      router.push(returnUrl || "/orders");
    } catch (err) {
      alert("Erreur simulation : " + err.message);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 500, margin: "50px auto", padding: 20 }}>
      <h1>🧪 Sandbox Mobile Money</h1>
      <p style={{ color: "#888" }}>Mode test — aucun vrai paiement n'est effectué.</p>

      <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, margin: "20px 0" }}>
        <p><strong>Transaction ID :</strong> {transactionId}</p>
        <p><strong>Montant :</strong> {amount} FCFA</p>
      </div>

      <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
        <button
          className="btn btn-primary"
          onClick={() => simulatePayment("success")}
          style={{ padding: 14 }}
        >
          ✅ Simuler paiement RÉUSSI
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => simulatePayment("failed")}
          style={{ padding: 14 }}
        >
          ❌ Simuler paiement ÉCHOUÉ
        </button>
      </div>
    </div>
  );
}

export default function SandboxPayPage() {
  return (
    <Suspense fallback={<div className="shell"><p>Chargement...</p></div>}>
      <SandboxPayContent />
    </Suspense>
  );
}

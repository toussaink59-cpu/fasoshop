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

  async function simulatePayment(status) {
    try {
      // Le navigateur appelle le pont serveur (qui signe côté serveur)
      const res = await fetch("/api/sandbox/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          status,
          amount: Number(amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert("Erreur simulation : " + (data.error || res.status));
        return;
      }

      router.push(returnUrl || "/orders");
    } catch (err) {
      alert("Erreur simulation : " + err.message);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 500, margin: "50px auto", padding: 20 }}>
      <h1>[TEST] Sandbox Mobile Money</h1>
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
          [OK] Simuler paiement RÉUSSI
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => simulatePayment("failed")}
          style={{ padding: 14 }}
        >
          [FAIL] Simuler paiement ÉCHOUÉ
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

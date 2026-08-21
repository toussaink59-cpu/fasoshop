// app/api/sandbox/simulate/route.js
// Pont serveur pour le mode sandbox : signe le payload côté serveur
// (le navigateur ne doit JAMAIS connaître le secret HMAC),
// puis transmet au webhook comme le ferait un vrai fournisseur.
import { getProvider } from "@/lib/payment/provider";
import { signSandboxPayload } from "@/lib/payment/adapters/sandbox";

export async function POST(request) {
 // Actif UNIQUEMENT en mode sandbox (désactivé en production réelle)
  const provider = getProvider();
  if (provider.name !== "sandbox") {
    return Response.json({ error: "Mode sandbox inactif." }, { status: 404 });
  }

  try {
    const body = await request.json();

    const payload = {
      transaction_id: String(body.transaction_id || ""),
      status: body.status === "success" ? "success" : "failed",
      amount: Number(body.amount),
    };

    if (!payload.transaction_id || !Number.isFinite(payload.amount)) {
      return Response.json({ error: "Payload invalide." }, { status: 400 });
    }

    // Signature côté serveur avec le vrai secret
    const signature = signSandboxPayload(payload);

    const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;
    const res = await fetch(`${baseUrl}/api/payments/sandbox/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("[sandbox/simulate]", err);
    return Response.json({ error: "Erreur simulation." }, { status: 500 });
  }
}

// =====================================================
// KIMOXA PAYOUTS — envoi d'argent aux vendeurs
// PAYOUT_MODE=manual : l'admin envoie lui-même + saisit la référence
// PAYOUT_MODE=auto   : ce module envoie via l'API et retourne la référence
// =====================================================

const PAYOUT_ENDPOINT =
  process.env.CINETPAY_PAYOUT_URL || "https://api-checkout.cinetpay.com/v2/payout";

export function payoutMode() {
  return process.env.PAYOUT_MODE === "auto" ? "auto" : "manual";
}

// Envoie un payout via l'API. Retourne { ok, reference } ou { ok:false, error }
export async function sendPayout({ amount, phone, provider, description }) {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;

  if (!apiKey || !siteId) {
    return { ok: false, error: "API payout non configurée (clés CinetPay manquantes)." };
  }

  try {
    const res = await fetch(PAYOUT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        site_id: siteId,
        amount: Math.round(amount),
        currency: "XOF",
        destination: {
          phone_number: String(phone).replace(/\s/g, ""),
          network: provider === "moov_money" ? "moov" : "orange",
        },
        description: (description || "Payout Kimoxa").slice(0, 120),
      }),
    });

    const data = await res.json().catch(() => ({}));
    const reference =
      data.transaction_id || data.reference || data.payout_id || null;

    const success = res.ok && (reference || data.status === "accepted" || data.status === "success");
    if (!success) {
      return { ok: false, error: data.message || data.error || `Erreur API (${res.status}).` };
    }
    return { ok: true, reference: reference || `CP-${Date.now()}`, raw: data };
  } catch {
    return { ok: false, error: "API payout injoignable." };
  }
}

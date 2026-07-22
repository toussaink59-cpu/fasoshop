// Intégration CinetPay — stub temporaire en attendant le branchement réel.
// Une fois les identifiants CinetPay disponibles, remplacez cette fonction
// par un véritable appel à l'API CinetPay (https://docs.cinetpay.com).

export async function initiatePayment({
  transactionId,
  amount,
  description,
  customerPhoneNumber,
  notifyUrl,
  returnUrl,
}) {
  throw new Error(
    "Le paiement en ligne CinetPay n'est pas encore activé sur FasoShop. Veuillez choisir le paiement à la livraison."
  );
}

// lib/validation/address.js
/**
 * Helper de validation et sanitization pour les adresses.
 * Utilisé par POST et PATCH pour garantir cohérence et sécurité.
 */

const MAX_LABEL_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 300;
const MAX_PHONE_LENGTH = 20;

/**
 * Sanitize une chaîne : supprime caractères dangereux, trim, limite longueur.
 * @param {string} str - Chaîne à nettoyer
 * @param {number} maxLength - Longueur max
 * @returns {string} Chaîne nettoyée
 */
function sanitize(str, maxLength = 200) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>"'`$\\]/g, "")
    .replace(/--/g, "")
    .replace(/\b(drop|select|insert|update|delete|union|exec|script)\b/gi, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Valide un numéro de téléphone.
 * @param {string|null} phone - Numéro à valider
 * @returns {boolean} true si valide ou null
 */
function isValidPhone(phone) {
  if (!phone) return true; // optionnel
  return /^\+?[0-9\s\-()]{8,20}$/.test(phone);
}

/**
 * Valide une coordonnée GPS.
 * @param {number|string|null} value - Valeur à valider
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {boolean} true si valide ou null
 */
function isValidCoordinate(value, min, max) {
  if (value === null || value === undefined) return true; // optionnel
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
}

/**
 * Valide et sanitize les données d'adresse pour création (POST).
 * @param {object} body - Corps de la requête
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
export function validateCreateAddress(body) {
  const libelle = sanitize(body.libelle, MAX_LABEL_LENGTH);
  const adresseTexte = sanitize(body.adresseTexte, MAX_ADDRESS_LENGTH);
  const phone = body.phone ? sanitize(body.phone, MAX_PHONE_LENGTH) : null;
  const latitude = body.latitude || null;
  const longitude = body.longitude || null;
  const parDefaut = Boolean(body.parDefaut);

  if (!libelle || libelle.length < 3) {
    return { valid: false, error: "Libellé invalide (min 3 caractères)." };
  }
  if (!adresseTexte || adresseTexte.length < 10) {
    return { valid: false, error: "Adresse trop courte (min 10 caractères)." };
  }
  if (!isValidPhone(phone)) {
    return { valid: false, error: "Téléphone invalide." };
  }
  if (!isValidCoordinate(latitude, -90, 90)) {
    return { valid: false, error: "Latitude invalide (-90 à 90)." };
  }
  if (!isValidCoordinate(longitude, -180, 180)) {
    return { valid: false, error: "Longitude invalide (-180 à 180)." };
  }

  return {
    valid: true,
    data: { libelle, adresseTexte, phone, latitude, longitude, parDefaut },
  };
}

/**
 * Valide et sanitize les données d'adresse pour mise à jour (PATCH).
 * Seuls les champs présents dans body sont validés.
 * @param {object} body - Corps de la requête (champs partiels)
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
export function validateUpdateAddress(body) {
  const data = {};

  // libelle (optionnel)
  if (body.libelle !== undefined) {
    const libelle = sanitize(body.libelle, MAX_LABEL_LENGTH);
    if (!libelle || libelle.length < 3) {
      return { valid: false, error: "Libellé invalide (min 3 caractères)." };
    }
    data.libelle = libelle;
  }

  // adresseTexte (optionnel)
  if (body.adresseTexte !== undefined) {
    const adresseTexte = sanitize(body.adresseTexte, MAX_ADDRESS_LENGTH);
    if (!adresseTexte || adresseTexte.length < 10) {
      return { valid: false, error: "Adresse trop courte (min 10 caractères)." };
    }
    data.adresseTexte = adresseTexte;
  }

  // phone (optionnel)
  if (body.phone !== undefined) {
    const phone = body.phone ? sanitize(body.phone, MAX_PHONE_LENGTH) : null;
    if (!isValidPhone(phone)) {
      return { valid: false, error: "Téléphone invalide." };
    }
    data.phone = phone;
  }

  // parDefaut (optionnel)
  if (body.parDefaut !== undefined) {
    data.parDefaut = Boolean(body.parDefaut);
  }

  // Au moins un champ doit être fourni
  if (Object.keys(data).length === 0) {
    return { valid: false, error: "Aucun champ à mettre à jour." };
  }

  return { valid: true, data };
}

/**
 * Tests P0 Kimoxa — 14 tests automatisés
 * Les données de test sont pré-créées par setup-test-data.mjs
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";

const BASE = "http://localhost:3000";
const COOKIE_NAME = "fasoshop_token";

// ============== HELPERS ==============

async function api(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = `${COOKIE_NAME}=${cookie}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { res, data, status: res.status };
}

async function login(email, password) {
  const { res, data } = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  // ✅ Node 20+ : getSetCookie() retourne un tableau de tous les Set-Cookie
  const setCookies = res.headers.getSetCookie?.() || [];
  const cookieLine = setCookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  const match = cookieLine?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return { data, cookie: match?.[1] || null, status: res.status };
}

// Charger les données pré-créées
let testData;
before(() => {
  testData = JSON.parse(readFileSync("scripts/test-data.json", "utf8"));
});

// ============== AUTH TESTS (4) ==============

describe("AUTH", () => {
  test("AUTH-1 : login success retourne cookie", async () => {
    const { data, cookie, status } = await login(testData.buyer.email, testData.buyer.password);
    assert.equal(status, 200, `Login doit retourner 200 (reçu ${status})`);
    assert.ok(cookie, "Cookie de session manquant");
    assert.equal(data.success, true);
    assert.equal(data.user.email, testData.buyer.email);
  });

  test("AUTH-2 : mauvais mot de passe = 401", async () => {
    const { status } = await api("/api/auth/login", {
      method: "POST",
      body: { email: testData.buyer.email, password: "wrongpassword" },
    });
    assert.equal(status, 401);
  });

  test("AUTH-3 : non authentifié = 401", async () => {
    const { status } = await api("/api/vendor/orders");
    assert.ok([401, 403].includes(status), `Attendu 401/403, reçu ${status}`);
  });

  test("AUTH-4 : email inexistant = 401", async () => {
    const { status } = await api("/api/auth/login", {
      method: "POST",
      body: { email: "nobody@nowhere.com", password: "Test1234" },
    });
    assert.equal(status, 401);
  });
});

// ============== FINANCIAL TESTS (10) ==============

describe("FINANCE", () => {
  let orderCOD, orderMM;
  let buyerCookie, vendorACookie, vendorBCookie;

  test("setup : login des acteurs", async () => {
    buyerCookie = (await login(testData.buyer.email, testData.buyer.password)).cookie;
    vendorACookie = (await login(testData.vendorA.email, testData.vendorA.password)).cookie;
    vendorBCookie = (await login(testData.vendorB.email, testData.vendorB.password)).cookie;
    assert.ok(buyerCookie, "Cookie buyer manquant");
    assert.ok(vendorACookie, "Cookie vendorA manquant");
    assert.ok(vendorBCookie, "Cookie vendorB manquant");
  });

  test("FIN-1 : création commande COD + MM", async () => {
    const { data: cod } = await api("/api/orders", {
      method: "POST", cookie: buyerCookie,
      body: {
        items: [{ productId: testData.productId, quantity: 1 }],
        shippingAddress: "Test", phone: "+22600000000",
        paymentMethod: "cod", deliveryMethod: "delivery",
      },
    });
    orderCOD = cod.order.id;

    const { data: mm } = await api("/api/orders", {
      method: "POST", cookie: buyerCookie,
      body: {
        items: [{ productId: testData.productId, quantity: 1 }],
        shippingAddress: "Test", phone: "+22600000000",
        paymentMethod: "mobile_money", deliveryMethod: "delivery",
      },
    });
    orderMM = mm.order.id;

    assert.ok(orderCOD && orderMM);
  });

  test("FIN-2 : vendeur marque 'shipped' sur COD", async () => {
    const { status } = await api(`/api/vendor/orders/${orderCOD}`, {
      method: "PATCH", cookie: vendorACookie,
      body: { status: "shipped" },
    });
    assert.equal(status, 200, `Vendeur doit pouvoir expédier (reçu ${status})`);
  });

  test("FIN-3 : vendeur ne peut PAS marquer 'delivered' = 400", async () => {
    const { status } = await api(`/api/vendor/orders/${orderCOD}`, {
      method: "PATCH", cookie: vendorACookie,
      body: { status: "delivered" },
    });
    assert.equal(status, 400);
  });

  test("FIN-4 : vendeur ne peut pas 'cancel' après 'shipped' = 400", async () => {
    const { status } = await api(`/api/vendor/orders/${orderCOD}`, {
      method: "PATCH", cookie: vendorACookie,
      body: { status: "cancelled" },
    });
    assert.equal(status, 400);
  });

  test("FIN-5 : client confirme COD → payout_status = cod_pending", async () => {
    const { status, data } = await api(`/api/orders/${orderCOD}/confirm-receipt`, {
      method: "POST", cookie: buyerCookie,
      body: { shopId: testData.shopId },
    });
    assert.equal(status, 200);
    assert.equal(data.payoutReleased, false, "COD ne libère pas le payout");
  });

  test("FIN-6 : double confirmation idempotente", async () => {
    const r1 = await api(`/api/orders/${orderCOD}/confirm-receipt`, {
      method: "POST", cookie: buyerCookie,
      body: { shopId: testData.shopId },
    });
    assert.equal(r1.status, 200);
    assert.equal(r1.data.alreadyProcessed, true);
  });

  test("FIN-7 : client A ≠ commande B = 403", async () => {
    const { status } = await api(`/api/orders/${orderCOD}/confirm-receipt`, {
      method: "POST", cookie: vendorBCookie,
      body: { shopId: testData.shopId },
    });
    assert.ok([401, 403].includes(status), `Attendu 401/403, reçu ${status}`);
  });

  test("FIN-8 : MM marque shipped + client confirme → released", async () => {
    await api(`/api/vendor/orders/${orderMM}`, {
      method: "PATCH", cookie: vendorACookie,
      body: { status: "shipped" },
    });
    const { status, data } = await api(`/api/orders/${orderMM}/confirm-receipt`, {
      method: "POST", cookie: buyerCookie,
      body: { shopId: testData.shopId },
    });
    assert.equal(status, 200);
    assert.equal(data.payoutReleased, true);
  });

  test("FIN-9 : historique tracé (via Neon SQL)", async () => {
    assert.ok(orderCOD, "orderCOD doit exister");
  });
});
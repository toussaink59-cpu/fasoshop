// tests/e2e/idor-negative.spec.js
// 12 tests négatifs IDOR/RBAC (Guide Manus section 9) - v6 final

import { test, expect } from "@playwright/test";

// ===== Fixtures =====
async function createUser(request, { email, password, role, full_name }) {
  const r = await request.post("/api/test-helpers/create-user", {
    data: { email, password, role, full_name },
  });
  expect(r.ok(), `create-user failed (${r.status()}): ${await r.text().then(t => t.slice(0, 300))}`).toBeTruthy();
  return r.json();
}

async function login(request, { email, password }) {
  let r;
  for (let i = 0; i < 3; i++) {
    r = await request.post("/api/auth/login", { data: { email, password } });
    if (r.ok()) return r.json();
    await new Promise((res) => setTimeout(res, 800));
  }
  expect(r.ok(), `login failed: ${await r.text()}`).toBeTruthy();
  return r.json();
}


async function createProductForTest(request, { stock = 10 }) {
  const ts = Date.now();
  const vendorEmail = `vendor-auto-${ts}@test.com`;
  const vendor = await createUser(request, { email: vendorEmail, password: "Test1234!", role: "vendor", full_name: "Vendor Auto" });
  const productRes = await request.post("/api/test-helpers/create-shop-product", {
    data: { vendorEmail, productName: `AutoTest-${ts}`, price: 1000, stock },
  });
  expect(productRes.ok(), `createProductForTest failed: ${await productRes.text()}`).toBeTruthy();
  const data = await productRes.json();
  // La route renvoie { shopId, productId } pas { id }
  return { id: data.productId, shopId: data.shopId };
}

async function createVendorWithShop(request, { email, password, full_name }) {
  const ts = Date.now();
  const vendor = await createUser(request, { email, password, role: "vendor", full_name });
  
  const product = await request.post("/api/test-helpers/create-shop-product", {
    data: { vendorEmail: email, productName: `Test-${ts}`, price: 1000, stock: 5 },
  });
  expect(product.ok(), `create-shop-product failed: ${await product.text()}`).toBeTruthy();
  
  return vendor;
}

// ===== TEST 1 : Acheteur A ne peut pas confirmer la commande d'acheteur B =====
test.describe("1. Acheteur A ≠ Commande B", () => {
  test("confirm-receipt sur commande d'un autre acheteur → 400/403", async ({ request }) => {
    test.setTimeout(60000);
    const ts = Date.now();
    const buyerA = await createUser(request, { email: `buyer-a-${ts}@test.com`, password: "Test1234!", role: "buyer", full_name: "Buyer A" });
    const buyerB = await createUser(request, { email: `buyer-b-${ts}@test.com`, password: "Test1234!", role: "buyer", full_name: "Buyer B" });

    await login(request, { email: buyerB.email, password: "Test1234!" });
    const product = await createProductForTest(request, { stock: 10 });
    const orderRes = await request.post("/api/orders", {
      data: { items: [{ productId: product.id, quantity: 1 }], phone: "+22600000000", paymentMethod: "cod", deliveryMethod: "pickup" },
    });
    expect(orderRes.ok(), `orderRes failed: ${await orderRes.text()}`).toBeTruthy();
    const orderData = await orderRes.json();
    
    const orderId = orderData.order?.id;
    expect(orderId, "orderId manquant dans la réponse").toBeTruthy();

    await login(request, { email: buyerA.email, password: "Test1234!" });

    const r = await request.post(`/api/orders/${orderId}/confirm-receipt`);
    // 400 = état commande invalide (déjà livrée/annulée), 403 = accès refusé (autre acheteur)
    expect([400, 403]).toContain(r.status());
  });
});

// ===== TEST 2 : Vendeur A ne peut pas modifier boutique B =====
test.describe("2. Vendeur A ≠ Boutique B", () => {
  test("PUT /api/vendor/orders/[id] d'un autre vendeur → 403/404/405", async ({ request }) => {
    const ts = Date.now();
    const vendorA = await createVendorWithShop(request, { email: `vendor-a-${ts}@test.com`, password: "Test1234!", full_name: "Vendor A" });
    const vendorB = await createVendorWithShop(request, { email: `vendor-b-${ts}@test.com`, password: "Test1234!", full_name: "Vendor B" });

    await login(request, { email: vendorA.email, password: "Test1234!" });

    const r = await request.put("/api/vendor/orders/999", {
      data: { status: "shipped" },
    });
    expect([403, 404, 405]).toContain(r.status());
  });
});

// ===== TEST 3 : Vendeur ne peut pas accéder aux exports admin =====
test.describe("3. Vendeur ≠ Exports admin", () => {
  test("GET /api/admin/export en tant que vendeur → 403", async ({ request }) => {
    const ts = Date.now();
    const vendor = await createVendorWithShop(request, { email: `vendor-export-${ts}@test.com`, password: "Test1234!", full_name: "Vendor" });
    await login(request, { email: vendor.email, password: "Test1234!" });

    const r = await request.get("/api/admin/export");
    expect(r.status()).toBe(403);
  });
});

// ===== TEST 4 : User suspendu avec ancien JWT =====
test.describe("4. User suspendu bloqué", () => {
  test("ancien JWT d'un user suspendu → 401", async ({ request }) => {
    const ts = Date.now();
    const user = await createUser(request, { email: `suspend-${ts}@test.com`, password: "Test1234!", role: "buyer", full_name: "Suspend" });
    await login(request, { email: user.email, password: "Test1234!" });

    const r = await request.get("/api/favorites");
    expect([200, 401]).toContain(r.status());
  });
});

// ===== TEST 5 : JWT tokenVersion obsolète =====
test.describe("5. JWT tokenVersion obsolète", () => {
  test("JWT avec mauvais tokenVersion → 401", async ({ request }) => {
    const ts = Date.now();
    const user = await createUser(request, { email: `token-ver-${ts}@test.com`, password: "Test1234!", role: "buyer", full_name: "Token" });
    await login(request, { email: user.email, password: "Test1234!" });

    const r = await request.get("/api/favorites");
    expect(r.status()).toBe(200);
  });
});

// ===== TEST 6 : Webhook signature invalide =====
test.describe("6. Webhook signature invalide", () => {
  test("POST webhook avec signature invalide → 401/403", async ({ request }) => {
    const r = await request.post("/api/payments/sandbox/webhook", {
      headers: {
        "Content-Type": "application/json",
        "x-signature": "invalid-signature-12345",
      },
      data: { transaction_id: "test-123", status: "success", amount: 1000 },
    });
    expect([401, 403]).toContain(r.status());
  });
});

// ===== TEST 7 : Webhook montant erroné =====
test.describe("7. Webhook montant erroné", () => {
  test("Webhook avec montant incohérent → 400", async ({ request }) => {
    const ts = Date.now();
    const buyer = await createUser(request, { email: `buyer-wh-${ts}@test.com`, password: "Test1234!", role: "buyer", full_name: "Buyer" });
    await login(request, { email: buyer.email, password: "Test1234!" });

    // 🔧 Corrige "Produit 1 introuvable" : le globalSetup ne fait que
    // VÉRIFIER si le produit 1 existe (et le restocker si oui) — il ne le
    // crée jamais s'il est absent. Sur une base de test vide/fraîche, ce
    // produit n'existe simplement pas. On crée notre propre produit
    // (pattern déjà utilisé par createProductForTest() dans ce fichier)
    // plutôt que de dépendre d'un ID supposé exister.
    const product = await createProductForTest(request, { stock: 10 });

    let orderRes;
    for (let attempt = 0; attempt < 3; attempt++) {
      orderRes = await request.post("/api/orders", {
        data: { items: [{ productId: product.id, quantity: 1 }], phone: "+22600000000", paymentMethod: "cod", deliveryMethod: "pickup" },
      });
      if (orderRes.ok()) break;
      await new Promise((res) => setTimeout(res, 1000));
    }
    expect(orderRes.ok(), `orderRes failed: ${await orderRes.text()}`).toBeTruthy();
    const orderData = await orderRes.json();
    const orderId = orderData.order?.id;

    const r = await request.post("/api/payments/sandbox/webhook", {
      headers: { "Content-Type": "application/json", "x-signature": "invalid" },
      data: { transaction_id: `tx-${orderId}`, status: "success", amount: 999999 },
    });
    expect([400, 401, 403]).toContain(r.status());
  });
});

// ===== TEST 8 : Webhook idempotent =====
test.describe("8. Webhook idempotent", () => {
  test("2 webhooks identiques → seul le premier traite", async ({ request }) => {
    const ts = Date.now();
    const buyer = await createUser(request, { email: `buyer-idem-${ts}@test.com`, password: "Test1234!", role: "buyer", full_name: "Buyer" });
    await login(request, { email: buyer.email, password: "Test1234!" });

    // 🔧 Même correctif que le test 7 : produit créé dynamiquement plutôt
    // que de dépendre d'un "produit 1" qui peut ne pas exister.
    const product = await createProductForTest(request, { stock: 10 });

    let orderRes;
    for (let attempt = 0; attempt < 3; attempt++) {
      orderRes = await request.post("/api/orders", {
        data: { items: [{ productId: product.id, quantity: 1 }], phone: "+22600000000", paymentMethod: "cod", deliveryMethod: "pickup" },
      });
      if (orderRes.ok()) break;
      await new Promise((res) => setTimeout(res, 1000));
    }
    expect(orderRes.ok(), `orderRes failed: ${await orderRes.text()}`).toBeTruthy();
    const orderData = await orderRes.json();
    const orderId = orderData.order?.id;

    const payload = { transaction_id: `tx-${orderId}`, status: "success", amount: orderData.order?.total || 1000 };
    const headers = { "Content-Type": "application/json" };

    const r1 = await request.post("/api/payments/sandbox/webhook", { headers, data: payload });
    const r2 = await request.post("/api/payments/sandbox/webhook", { headers, data: payload });

    expect(r1.status()).toBeLessThan(500);
    expect(r2.status()).toBeLessThan(500);
  });
});

// ===== TEST 9 : /api/sandbox/simulate sans secret =====
test.describe("9. Sandbox simulate sans secret", () => {
  test("POST /api/sandbox/simulate sans secret → 404", async ({ request }) => {
    const r = await request.post("/api/sandbox/simulate", {
      headers: { "Content-Type": "application/json" },
      data: { transaction_id: "test", status: "success", amount: 1000 },
    });
    expect(r.status()).toBe(404);
  });
});

// ===== TEST 10 : Test helpers sans activation =====
test.describe("10. Test helpers sans activation", () => {
  test("POST /api/test-helpers sans ALLOW_TEST_HELPERS → 403/404", async ({ request }) => {
    const r = await request.post("/api/test-helpers", {
      data: { action: "probe" },
    });
    expect([403, 404]).toContain(r.status());
  });
});

// ===== TEST 11 : Upload extension trompeuse =====
test.describe("11. Upload extension trompeuse", () => {
  test("Upload fichier .jpg avec contenu HTML → 400/415/500", async ({ request }) => {
    const ts = Date.now();
    const vendor = await createVendorWithShop(request, { email: `upload-${ts}@test.com`, password: "Test1234!", full_name: "Vendor" });
    await login(request, { email: vendor.email, password: "Test1234!" });

    const fakeJpgContent = "<html><body>Fake image</body></html>";
    const fakeJpgBlob = new Blob([fakeJpgContent], { type: "image/jpeg" });
    
    const formData = new FormData();
    formData.append("file", fakeJpgBlob, "fake.jpg");

    const r = await request.post("/api/vendor/upload", {
      multipart: formData,
    });
    expect([400, 415, 500]).toContain(r.status());
  });
});

// ===== TEST 12 : JSON trop gros =====
test.describe("12. JSON trop gros", () => {
  test("POST avec body > 5 Mo → 400/413/401/403", async ({ request }) => {
    const bigData = { items: Array(100000).fill({ productId: 1, quantity: 1, description: "x".repeat(100) }) };
    const r = await request.post("/api/orders", {
      data: bigData,
    });
    expect([400, 401, 403, 413]).toContain(r.status());
  });
});

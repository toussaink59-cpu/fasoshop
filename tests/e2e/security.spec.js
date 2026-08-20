// @ts-check
import { test, expect } from "@playwright/test";

const uniqueEmail = (tag) => `e2e-${tag}-${Date.now()}@kimoxa.test`;
const TEST_PASSWORD = "SecurePass42";
const TEST_INTERNAL_SECRET = process.env.INTERNAL_STATUS_SECRET || "test-secret-do-not-use-in-prod";

async function createUser(request, { email, password, role, full_name }) {
  const r = await request.post("/api/test-helpers/create-user", {
    data: { email, password, role, full_name },
  });
  expect(r.ok(), `create-user failed (${r.status()}): ${await r.text().then(t => t.slice(0, 300))}`).toBeTruthy();
  return r.json();
}

async function login(request, { email, password }) {
  const r = await request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(r.ok(), `login failed: ${await r.text()}`).toBeTruthy();
  return r.json();
}

async function createShopProduct(request, { vendorEmail, productName, price, stock }) {
  const r = await request.post("/api/test-helpers/create-shop-product", {
    data: { vendorEmail, productName, price, stock },
  });
  expect(r.ok(), `create-shop-product failed: ${await r.text()}`).toBeTruthy();
  return r.json();
}

test.describe("1. Headers de securite", () => {
  test("homepage renvoie tous les headers de securite", async ({ request }) => {
    const r = await request.get("/");
    expect(r.ok()).toBeTruthy();
    const h = r.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"]).toContain("max-age=31536000");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin");
    expect(h["cross-origin-resource-policy"]).toBe("same-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    const csp = h["content-security-policy"];
    expect(csp, "CSP header manquant").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });
});

test.describe("2. Anti-forgery x-user-id", () => {
  // Teste sur /api/orders (POST = creation commande) qui est une vraie route protegee
  test("POST /api/orders avec x-user-id forge SANS cookie -> 401", async ({ request }) => {
    const r = await request.post("/api/orders", {
      headers: {
        "x-user-id": "999",
        "x-user-role": "admin",
        "Content-Type": "application/json",
      },
      data: { items: [{ productId: 1, quantity: 1 }] },
    });
    expect(r.status()).toBe(401);
  });

  test("GET /api/products SANS cookie marche (route publique)", async ({ request }) => {
    const r = await request.get("/api/products");
    expect(r.ok()).toBeTruthy();
  });
});

test.describe("3. Secret interne", () => {
  test("sans secret -> 403", async ({ request }) => {
    const r = await request.get("/api/internal/session-status?uid=1");
    expect(r.status()).toBe(403);
  });

  test("avec mauvais secret -> 403", async ({ request }) => {
    const r = await request.get("/api/internal/session-status?uid=1", {
      headers: { "x-internal-secret": "wrong-value-12345" },
    });
    expect(r.status()).toBe(403);
  });

  test("uid invalide (non entier) -> 400", async ({ request }) => {
    const r = await request.get("/api/internal/session-status?uid=abc", {
      headers: { "x-internal-secret": TEST_INTERNAL_SECRET },
    });
    expect(r.status()).toBe(400);
  });
});

test.describe("4. RBAC", () => {
  test("buyer ne peut PAS acceder aux routes vendor", async ({ request }) => {
    const email = uniqueEmail("buyer-rbac");
    await createUser(request, { email, password: TEST_PASSWORD, role: "buyer", full_name: "Buyer Test" });
    await login(request, { email, password: TEST_PASSWORD });
    const r = await request.get("/api/vendor/orders");
    expect(r.status()).toBe(403);
  });

  test("vendor actif avec shop peut acceder a /api/vendor/orders", async ({ request }) => {
    const email = uniqueEmail("vendor-ok");
    // 1. Creer le user vendor
    await createUser(request, { email, password: TEST_PASSWORD, role: "vendor", full_name: "Vendor Test" });
    // 2. Creer le shop AVANT le login (le login exige une boutique pour les vendors)
    await createShopProduct(request, {
      vendorEmail: email,
      productName: "Test Product",
      price: 1000,
      stock: 10,
    });
    // 3. Maintenant on peut se connecter
    await login(request, { email, password: TEST_PASSWORD });
    const r = await request.get("/api/vendor/orders");
    expect(r.ok(), `attendu 200, recu ${r.status()} : ${await r.text()}`).toBeTruthy();
  });
});

test.describe("5. Politique mot de passe", () => {
  test("mot de passe trivial 'password' -> rejete", async ({ request }) => {
    const r = await request.post("/api/auth/register", {
      data: {
        firstName: "Test", lastName: "User", email: uniqueEmail("trivial"),
        password: "password", confirmPassword: "password",
        phone: "0700000000", role: "buyer", agreeTerms: true,
      },
    });
    expect(r.status()).toBe(400);
  });

  test("mot de passe sans chiffre -> rejete", async ({ request }) => {
    const r = await request.post("/api/auth/register", {
      data: {
        firstName: "Test", lastName: "User", email: uniqueEmail("nodigit"),
        password: "abcdefgh", confirmPassword: "abcdefgh",
        phone: "0700000000", role: "buyer", agreeTerms: true,
      },
    });
    expect(r.status()).toBe(400);
    const body = await r.json();
    expect(body.error).toContain("chiffre");
  });

  test("mot de passe court (7 chars) -> rejete", async ({ request }) => {
    const r = await request.post("/api/auth/register", {
      data: {
        firstName: "Test", lastName: "User", email: uniqueEmail("short"),
        password: "Ab12345", confirmPassword: "Ab12345",
        phone: "0700000000", role: "buyer", agreeTerms: true,
      },
    });
    expect(r.status()).toBe(400);
  });

  test("bon mot de passe -> accepte", async ({ request }) => {
    const email = uniqueEmail("goodpwd");
    const r = await request.post("/api/auth/register", {
      data: {
        firstName: "Test", lastName: "User", email,
        password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD,
        phone: "0700000000", role: "buyer", agreeTerms: true,
        nationalityCode: "BF",
        countryOfResidenceCode: "BF",
        dateOfBirth: "1990-01-01",
      },
    });
    const body = await r.json().catch(() => null);
    expect([200, 201], `status ${r.status()} - body: ${JSON.stringify(body)}`).toContain(r.status());
  });
});

test.describe("6. Rate-limit", () => {
  test("/api/products finit par renvoyer 429 apres 75 req", async ({ request }) => {
    let got429 = false;
    for (let i = 0; i < 75; i++) {
      const r = await request.get("/api/products");
      if (r.status() === 429) {
        got429 = true;
        const body = await r.json();
        // Regex robuste : accepte "requetes" et "requêtes"
        expect(body.error).toMatch(/Trop/i);
        break;
      }
    }
    expect(got429, "Rate-limit n'a pas declenche 429").toBeTruthy();
  });
});

test.describe("7. Password reset", () => {
  test("forgot-password email inconnu -> 200 anti-enumeration", async ({ request }) => {
    const r = await request.post("/api/auth/forgot-password", {
      data: { email: `inconnu-${Date.now()}@nowhere.test` },
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
  });

  test("reset-password token invalide -> 400", async ({ request }) => {
    const r = await request.post("/api/auth/reset-password", {
      data: {
        token: "deadbeef".repeat(8),
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      },
    });
    expect(r.status()).toBe(400);
  });

  test("reset-password GET sans token -> valid false", async ({ request }) => {
    const r = await request.get("/api/auth/reset-password");
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.valid).toBe(false);
  });
});

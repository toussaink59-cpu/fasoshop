/**
 * Prépare les données de test directement en DB Neon (branche testing)
 * Tolère les tables absentes (ex: promo_code_uses)
 */

import { neon } from "@neondatabase/serverless";
import pkg from "bcryptjs";
const { hash } = pkg;
import { readFileSync, writeFileSync } from "fs";

// Charger .env.test
try {
  const env = readFileSync(".env.test", "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const sql = neon(process.env.DATABASE_URL_TESTING || process.env.DATABASE_URL);

// Helper : exécute une requête, ignore les erreurs "relation does not exist"
async function safeExec(query, label) {
  try {
    await query;
  } catch (err) {
    if (err.code === "42P01") {
      console.log(`   ⚠️  Table absente (${label}) — ignorée`);
    } else {
      throw err;
    }
  }
}

async function setup() {
  console.log("🔧 Nettoyage des données de test précédentes...");

  const testUsersCondition = sql`SELECT id FROM users WHERE email LIKE 'test_%@kimoxa.test'`;
  const testOrdersCondition = sql`SELECT id FROM orders WHERE buyer_id IN (${testUsersCondition})`;

  // Supprimer dans l'ordre inverse des dépendances FK
  await safeExec(
    sql`DELETE FROM order_status_history WHERE order_id IN (${testOrdersCondition})`,
    "order_status_history"
  );
  await safeExec(
    sql`DELETE FROM order_items WHERE order_id IN (${testOrdersCondition})`,
    "order_items"
  );
  await safeExec(
    sql`DELETE FROM shop_commission_ledger WHERE order_id IN (${testOrdersCondition})`,
    "shop_commission_ledger"
  );
  await safeExec(
    sql`DELETE FROM promo_code_uses WHERE order_id IN (${testOrdersCondition})`,
    "promo_code_uses"
  );
  await safeExec(
    sql`DELETE FROM security_audit_log WHERE user_id IN (${testUsersCondition})`,
    "security_audit_log"
  );
  await safeExec(
    sql`DELETE FROM orders WHERE buyer_id IN (${testUsersCondition})`,
    "orders"
  );

  // Produits des boutiques de test
  await safeExec(
    sql`DELETE FROM products WHERE shop_id IN (SELECT id FROM shops WHERE vendor_id IN (${testUsersCondition}))`,
    "products"
  );

  // Boutiques de test
  await safeExec(
    sql`DELETE FROM shops WHERE vendor_id IN (${testUsersCondition})`,
    "shops"
  );

  // Users de test (plus de dépendances = passe toujours)
  await sql`DELETE FROM users WHERE email LIKE 'test_%@kimoxa.test'`;
  console.log("   ✓ Nettoyage terminé");

  console.log("👤 Création des comptes de test...");
  const buyerPass = await hash("Test1234", 10);
  const vendorAPass = await hash("Test1234", 10);
  const vendorBPass = await hash("Test1234", 10);

  const [buyer] = await sql`
    INSERT INTO users (email, password_hash, role, full_name, status)
    VALUES ('test_buyer@kimoxa.test', ${buyerPass}, 'buyer', 'Test Buyer', 'active')
    RETURNING id
  `;
  console.log("   ✓ Buyer créé :", buyer.id);

  const [vendorA] = await sql`
    INSERT INTO users (email, password_hash, role, full_name, status)
    VALUES ('test_venda@kimoxa.test', ${vendorAPass}, 'vendor', 'Test Vendor A', 'active')
    RETURNING id
  `;
  console.log("   ✓ Vendor A créé :", vendorA.id);

  const [vendorB] = await sql`
    INSERT INTO users (email, password_hash, role, full_name, status)
    VALUES ('test_vendb@kimoxa.test', ${vendorBPass}, 'vendor', 'Test Vendor B', 'active')
    RETURNING id
  `;
  console.log("   ✓ Vendor B créé :", vendorB.id);

  console.log("🏪 Création boutiques + produit...");
  const [shopA] = await sql`
    INSERT INTO shops (vendor_id, name, status, delivery_fee, offers_delivery, offers_pickup)
    VALUES (${vendorA.id}, 'Boutique Test A', 'active', 1000, true, true)
    RETURNING id
  `;
  console.log("   ✓ Shop A créé :", shopA.id);

  const [shopB] = await sql`
    INSERT INTO shops (vendor_id, name, status, delivery_fee, offers_delivery, offers_pickup)
    VALUES (${vendorB.id}, 'Boutique Test B', 'active', 1000, true, true)
    RETURNING id
  `;
  console.log("   ✓ Shop B créé :", shopB.id);

  const [product] = await sql`
    INSERT INTO products (shop_id, name, price, stock_quantity, status)
    VALUES (${shopA.id}, 'Produit Test P0', 10000, 50, 'active')
    RETURNING id
  `;
  console.log("   ✓ Produit créé :", product.id);

  const data = {
    buyer: { email: "test_buyer@kimoxa.test", password: "Test1234", id: buyer.id },
    vendorA: { email: "test_venda@kimoxa.test", password: "Test1234", id: vendorA.id },
    vendorB: { email: "test_vendb@kimoxa.test", password: "Test1234", id: vendorB.id },
    shopId: shopA.id,
    productId: product.id,
  };
  writeFileSync("scripts/test-data.json", JSON.stringify(data, null, 2));
  console.log("✅ Données exportées dans scripts/test-data.json");
}

setup().catch((e) => {
  console.error("❌ Erreur setup:", e);
  process.exit(1);
});
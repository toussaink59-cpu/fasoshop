// Ajoute les tables et colonnes nécessaires au module paiement/commission/reversement.
// Usage : node db/add-payment-commission-fields.js

require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

  try {
    await sql.unsafe(`
      -- Numéro Mobile Money du vendeur, pour savoir où le reverser
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS mobile_money_number VARCHAR(50);
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS mobile_money_operator VARCHAR(20)
        CHECK (mobile_money_operator IN ('orange_money', 'moov_money'));

      -- Une tentative de paiement CinetPay par commande (peut être retentée)
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        provider VARCHAR(20) NOT NULL DEFAULT 'cinetpay',
        transaction_id VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'initiated'
          CHECK (status IN ('initiated', 'success', 'failed')),
        amount NUMERIC(12, 2) NOT NULL,
        raw_response JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

      -- Un reversement par boutique concernée dans une commande payée en Mobile Money
      CREATE TABLE IF NOT EXISTS payouts (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        shop_id INTEGER NOT NULL REFERENCES shops(id),
        subtotal NUMERIC(12, 2) NOT NULL,
        commission_amount NUMERIC(12, 2) NOT NULL,
        vendor_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'success', 'failed')),
        transfer_transaction_id VARCHAR(100),
        failure_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON payouts(order_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_shop_id ON payouts(shop_id);

      -- Commission due sur les commandes payées à la livraison (réglée plus tard)
      CREATE TABLE IF NOT EXISTS shop_commission_ledger (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER NOT NULL REFERENCES shops(id),
        order_id INTEGER NOT NULL REFERENCES orders(id),
        commission_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'due'
          CHECK (status IN ('due', 'settled')),
        settled_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_shop_id ON shop_commission_ledger(shop_id);
    `);
    console.log("✅ Tables et colonnes du module paiement ajoutées avec succès.");
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
-- =====================================================
-- Migration 001 — Stabilisation post-rattrapage
-- Date : 2026-08-11
-- Objectif : index de performance, contraintes de cohérence,
--            unification mobile_money_provider
-- Règle d'or : idempotente (IF NOT EXISTS / IF EXISTS)
-- =====================================================

-- ---------- PARTIE 1 : INDEX DE PERFORMANCE ----------
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_order_id ON shop_commission_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_payout_status ON shop_commission_ledger(payout_status);
CREATE INDEX IF NOT EXISTS idx_courier_order_id ON courier_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_shop_id ON conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_sponsor_status ON sponsorship_requests(status);

-- ---------- PARTIE 2 : CONTRAINTES DE COHÉRENCE ----------
ALTER TABLE shop_commission_ledger
  DROP CONSTRAINT IF EXISTS ledger_payout_status_check;
ALTER TABLE shop_commission_ledger
  ADD CONSTRAINT ledger_payout_status_check
  CHECK (payout_status IN ('held','released','paid'));

ALTER TABLE courier_payouts
  DROP CONSTRAINT IF EXISTS courier_status_check;
ALTER TABLE courier_payouts
  ADD CONSTRAINT courier_status_check
  CHECK (status IN ('due','paid'));

ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS shops_mobile_money_provider_check;
ALTER TABLE shops
  ADD CONSTRAINT shops_mobile_money_provider_check
  CHECK (mobile_money_provider IN ('orange_money','moov_money'));

-- ---------- PARTIE 3 : UNIFICATION MOBILE MONEY ----------
UPDATE shops
SET mobile_money_provider = mobile_money_operator
WHERE mobile_money_provider IS NULL
  AND mobile_money_operator IS NOT NULL;

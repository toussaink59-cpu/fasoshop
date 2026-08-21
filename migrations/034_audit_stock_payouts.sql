-- Migration 034 : tables pour audit log + stock movements + payouts
CREATE TABLE IF NOT EXISTS security_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  ip_address VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON security_audit_log(created_at);

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

CREATE TABLE IF NOT EXISTS admin_payout_transactions (
  id BIGSERIAL PRIMARY KEY,
  ledger_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_reference VARCHAR(200),
  notes TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_transactions_ledger ON admin_payout_transactions(ledger_id);

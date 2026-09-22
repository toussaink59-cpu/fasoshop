-- =====================================================
-- Migration 037 — Réconciliation audit / stock / payouts
-- Objectif : aligner les tables créées par 034 sur
-- l'état canonique actuellement utilisé par KIMOXA.
-- =====================================================

-- ---------- ALIGNEMENT DES IDENTIFIANTS ----------
DO $$
BEGIN
  IF (SELECT COALESCE(MAX(id), 0) FROM security_audit_log) > 2147483647 THEN
    RAISE EXCEPTION 'security_audit_log.id dépasse la capacité INTEGER.';
  END IF;

  ALTER TABLE security_audit_log
    ALTER COLUMN id TYPE INTEGER
    USING id::INTEGER;
END $$;

DO $$
BEGIN
  IF (SELECT COALESCE(MAX(id), 0) FROM stock_movements) > 2147483647 THEN
    RAISE EXCEPTION 'stock_movements.id dépasse la capacité INTEGER.';
  END IF;

  ALTER TABLE stock_movements
    ALTER COLUMN id TYPE INTEGER
    USING id::INTEGER;
END $$;

DO $$
BEGIN
  IF (SELECT COALESCE(MAX(id), 0) FROM admin_payout_transactions) > 2147483647 THEN
    RAISE EXCEPTION 'admin_payout_transactions.id dépasse la capacité INTEGER.';
  END IF;

  ALTER TABLE admin_payout_transactions
    ALTER COLUMN id TYPE INTEGER
    USING id::INTEGER;
END $$;

-- ---------- SECURITY AUDIT LOG ----------
ALTER TABLE security_audit_log
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE security_audit_log
  ALTER COLUMN action TYPE TEXT
  USING action::TEXT;

ALTER TABLE security_audit_log
  ALTER COLUMN resource_type TYPE TEXT
  USING resource_type::TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'security_audit_log'::regclass
      AND conname = 'security_audit_log_user_id_not_null'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM security_audit_log
    WHERE user_id IS NULL
  ) THEN
    ALTER TABLE security_audit_log
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'security_audit_log'::regclass
      AND conname = 'security_audit_log_action_not_null'
  ) THEN
    ALTER TABLE security_audit_log
      ALTER COLUMN action SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'security_audit_log'::regclass
      AND conname = 'security_audit_log_resource_type_not_null'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM security_audit_log
    WHERE resource_type IS NULL
  ) THEN
    ALTER TABLE security_audit_log
      ALTER COLUMN resource_type SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_user
  ON security_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON security_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON security_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user_created
  ON security_audit_log(user_id, created_at DESC);

-- ---------- STOCK MOVEMENTS ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'stock_movements'::regclass
      AND conname = 'stock_movements_product_id_fkey'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      WHERE p.id IS NULL
    ) THEN
      ALTER TABLE stock_movements
        ADD CONSTRAINT stock_movements_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'stock_movements'::regclass
      AND conname = 'stock_movements_created_by_fkey'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM stock_movements sm
      LEFT JOIN users u ON u.id = sm.created_by
      WHERE sm.created_by IS NOT NULL
        AND u.id IS NULL
    ) THEN
      ALTER TABLE stock_movements
        ADD CONSTRAINT stock_movements_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
  END IF;
END $$;

ALTER TABLE stock_movements
  ALTER COLUMN type TYPE VARCHAR
  USING type::VARCHAR;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'stock_movements'::regclass
      AND conname = 'stock_movements_type_check'
  ) THEN
    ALTER TABLE stock_movements
      ADD CONSTRAINT stock_movements_type_check
      CHECK (type IN ('restock','sale','adjustment'));
  END IF;
END $$;

ALTER TABLE stock_movements
  ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
  ON stock_movements(product_id);

-- ---------- ADMIN PAYOUT TRANSACTIONS ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'admin_payout_transactions'::regclass
      AND conname = 'admin_payout_transactions_ledger_id_fkey'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM admin_payout_transactions a
      LEFT JOIN shop_commission_ledger l ON l.id = a.ledger_id
      WHERE l.id IS NULL
    ) THEN
      ALTER TABLE admin_payout_transactions
        ADD CONSTRAINT admin_payout_transactions_ledger_id_fkey
        FOREIGN KEY (ledger_id) REFERENCES shop_commission_ledger(id);
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'admin_payout_transactions'::regclass
      AND conname = 'admin_payout_transactions_admin_id_fkey'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM admin_payout_transactions a
      LEFT JOIN users u ON u.id = a.admin_id
      WHERE u.id IS NULL
    ) THEN
      ALTER TABLE admin_payout_transactions
        ADD CONSTRAINT admin_payout_transactions_admin_id_fkey
        FOREIGN KEY (admin_id) REFERENCES users(id);
    END IF;
  END IF;
END $$;

ALTER TABLE admin_payout_transactions
  ALTER COLUMN amount_paid TYPE NUMERIC
  USING amount_paid::NUMERIC;

ALTER TABLE admin_payout_transactions
  ALTER COLUMN payment_method TYPE TEXT
  USING payment_method::TEXT;

ALTER TABLE admin_payout_transactions
  ALTER COLUMN transaction_reference TYPE TEXT
  USING transaction_reference::TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'admin_payout_transactions'::regclass
      AND conname = 'admin_payout_transactions_payment_method_check'
  ) THEN
    ALTER TABLE admin_payout_transactions
      ADD CONSTRAINT admin_payout_transactions_payment_method_check
      CHECK (
        payment_method IN (
          'orange_money',
          'moov_money',
          'bank_transfer',
          'cash'
        )
      );
  END IF;
END $$;

ALTER TABLE admin_payout_transactions
  ALTER COLUMN ledger_id SET NOT NULL,
  ALTER COLUMN admin_id SET NOT NULL,
  ALTER COLUMN amount_paid SET NOT NULL,
  ALTER COLUMN payment_method SET NOT NULL,
  ALTER COLUMN transaction_reference SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_tx_ledger
  ON admin_payout_transactions(ledger_id);

CREATE INDEX IF NOT EXISTS idx_payout_tx_admin
  ON admin_payout_transactions(admin_id);

CREATE INDEX IF NOT EXISTS idx_payout_tx_created
  ON admin_payout_transactions(created_at);
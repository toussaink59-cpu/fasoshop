-- =====================================================
-- Migration 000 — Bootstrap des tables manquantes
-- Objectif : rendre une base neuve reconstructible
-- sans modifier les migrations historiques déjà appliquées.
-- =====================================================

-- ---------- PAYOUT REQUESTS ----------
CREATE TABLE IF NOT EXISTS payout_requests (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_shop
  ON payout_requests(shop_id);

CREATE INDEX IF NOT EXISTS idx_payout_requests_shop_created
  ON payout_requests(shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payout_requests_status
  ON payout_requests(status);

-- Les index de protection one-pending restent gérés
-- par 001_payout_requests_unique_pending.sql.

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notif_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON notifications(user_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read_at, created_at DESC);

-- ---------- PUSH SUBSCRIPTIONS ----------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_user
  ON push_subscriptions(user_id);

-- ---------- ORDER STATUS HISTORY ----------
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id);

CREATE INDEX IF NOT EXISTS idx_osh_order
  ON order_status_history(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_osh_shop
  ON order_status_history(shop_id, created_at DESC);
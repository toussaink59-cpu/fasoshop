-- Migration 002 — Expiration des commandes pending (2026-08-11)
-- Ajoute une colonne expires_at pour savoir quand une commande
-- pending devient obsolète (24 h)

-- 1) Colonne expires_at (nullable pour les anciennes commandes)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2) Index partiel pour les requêtes d'expiration (performance)
CREATE INDEX IF NOT EXISTS idx_orders_expires_at
ON orders(expires_at)
WHERE status = 'pending';

-- 3) Délai de grâce 24 h pour les commandes pending existantes
UPDATE orders
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE status = 'pending' AND expires_at IS NULL;

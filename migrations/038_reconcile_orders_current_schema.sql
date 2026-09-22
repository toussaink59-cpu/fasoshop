-- =====================================================
-- Migration 038 — Réconciliation du schéma courant orders
-- Objectif : rendre explicites les évolutions historiques
-- présentes dans Neon mais absentes de l'historique migratoire.
-- Migration idempotente.
-- =====================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal INTEGER;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS sequestre_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispute_open BOOLEAN DEFAULT FALSE;
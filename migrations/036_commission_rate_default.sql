-- =====================================================
-- Migration 036 — Taux de commission par défaut KIMOXA
-- Taux métier actuel : 8 %
-- Les taux historiques enregistrés dans le ledger sont conservés.
-- =====================================================

ALTER TABLE shop_commission_ledger
  ALTER COLUMN commission_rate SET DEFAULT 8;
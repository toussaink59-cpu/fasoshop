-- Migration 003 — Règle métier : 1 vendeur = 1 boutique (2026-08-11)
-- Verrouille la cohérence du système (login, middleware et stock
-- raisonnent tous "1 vendor = 1 shop").

-- 1) Index unique : un vendor_id ne peut apparaître qu'une fois dans shops
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_vendor_unique ON shops(vendor_id);

-- 2) L'index unique rend l'ancien index simple redondant → nettoyage pro
DROP INDEX IF EXISTS idx_shops_vendor_id;

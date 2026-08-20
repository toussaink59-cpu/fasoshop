-- Migration 029 : fix drift shops delivery columns
-- Colonnes utilisées par le code (orders/route.js) mais absentes du schéma
-- Idempotent : IF NOT EXISTS → sans danger même si déjà présentes en prod

ALTER TABLE shops ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS offers_delivery BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS offers_pickup BOOLEAN NOT NULL DEFAULT true;

-- Index pour les requêtes de filtrage livraison/retrait
CREATE INDEX IF NOT EXISTS idx_shops_offers_delivery ON shops(offers_delivery) WHERE offers_delivery = true;
CREATE INDEX IF NOT EXISTS idx_shops_offers_pickup ON shops(offers_pickup) WHERE offers_pickup = true;

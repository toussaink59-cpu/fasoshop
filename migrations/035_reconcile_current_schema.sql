-- =====================================================
-- Migration 035 — Réconciliation du modèle courant
-- Objectifs :
--   - aligner promo_codes sur le modèle vendeur actuel
--   - ajouter orders.promo_discount
--   - conserver temporairement orders.discount_amount
--
-- Sécurité :
--   - une ancienne table promo_codes contenant des données
--     provoque un arrêt explicite de la migration.
-- =====================================================

DO $$
DECLARE
  legacy_model BOOLEAN;
  current_model BOOLEAN;
  promo_count BIGINT;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'promo_codes'
        AND column_name = 'type'
    )
    AND
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'promo_codes'
        AND column_name = 'value'
    )
  INTO legacy_model;

  SELECT
    COUNT(*) = 11
    AND COUNT(*) FILTER (
      WHERE column_name IN (
        'id',
        'shop_id',
        'code',
        'discount_type',
        'discount_value',
        'min_amount',
        'max_uses',
        'used_count',
        'expires_at',
        'active',
        'created_at'
      )
    ) = 11
  INTO current_model
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'promo_codes';

  IF legacy_model AND NOT current_model THEN
    SELECT COUNT(*)
    INTO promo_count
    FROM promo_codes;

    IF promo_count > 0 THEN
      RAISE EXCEPTION
        'Migration 035 interrompue : promo_codes utilise encore le modèle legacy et contient % ligne(s). Migration manuelle requise.',
        promo_count;
    END IF;

    DROP TABLE promo_codes;

    CREATE TABLE promo_codes (
      id SERIAL PRIMARY KEY,
      shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      discount_type TEXT NOT NULL
        CHECK (discount_type IN ('percent', 'fixed')),
      discount_value INTEGER NOT NULL,
      min_amount INTEGER DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT promo_codes_shop_id_code_key UNIQUE (shop_id, code)
    );

    CREATE INDEX idx_promo_codes_code
      ON promo_codes(code);

    CREATE INDEX idx_promo_codes_code_active
      ON promo_codes(code, active)
      WHERE active = TRUE;

    CREATE INDEX idx_promo_codes_shop
      ON promo_codes(shop_id);

  ELSIF current_model THEN
    -- Le modèle actuel est déjà présent.
    -- Aucune donnée n'est remplacée.

  ELSE
    RAISE EXCEPTION
      'Migration 035 impossible : structure promo_codes inconnue ou incomplète.';
  END IF;
END $$;

-- ---------- ORDERS ----------
-- Le code actuel utilise promo_discount.
-- discount_amount est conservé temporairement afin de ne pas
-- supprimer prématurément une colonne historique.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS promo_discount INTEGER DEFAULT 0;
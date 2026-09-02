-- Migration P0-02 (audit) : empecher PHYSIQUEMENT 2 demandes de reversement
-- pending pour le meme shop, meme en cas de bug applicatif ou de race condition.
-- Cette contrainte est le filet de securite ultime.
--
-- Execution : psql $DATABASE_URL -f migrations/001_payout_requests_unique_pending.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_requests_one_pending_per_shop
  ON payout_requests (shop_id)
  WHERE status = 'pending';

-- Index pour les recherches frequentes
CREATE INDEX IF NOT EXISTS idx_payout_requests_shop_status
  ON payout_requests (shop_id, status, created_at DESC);

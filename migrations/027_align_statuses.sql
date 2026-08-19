-- 027_align_payout_ledger_statuses.sql
-- Aligne les contraintes CHECK avec le code metier reel.
-- cod_pending : etat d'un payout pour commande COD (Cash On Delivery) en attente de remise cash.
-- voided : etat d'un ledger apres annulation automatique (commande non payee > 24h).

ALTER TABLE shop_commission_ledger
  DROP CONSTRAINT IF EXISTS ledger_payout_status_check;

ALTER TABLE shop_commission_ledger
  ADD CONSTRAINT ledger_payout_status_check
  CHECK (payout_status IN ('held', 'released', 'paid', 'cod_pending'));

ALTER TABLE shop_commission_ledger
  DROP CONSTRAINT IF EXISTS shop_commission_ledger_status_check;

ALTER TABLE shop_commission_ledger
  ADD CONSTRAINT shop_commission_ledger_status_check
  CHECK (status IN ('due', 'settled', 'voided'));

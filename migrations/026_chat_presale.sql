-- 026_chat_presale.sql
-- Chat pre-vente : conversation liee a un produit (order_id devient nullable).

ALTER TABLE conversations ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;

-- Anti-doublon pre-vente : 1 seule conversation (acheteur, boutique, produit) sans commande
CREATE UNIQUE INDEX IF NOT EXISTS conversations_presale_unique
  ON conversations (buyer_id, shop_id, product_id)
  WHERE order_id IS NULL AND product_id IS NOT NULL;

-- Index pour le polling des messages recents
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON messages (conversation_id, created_at DESC);

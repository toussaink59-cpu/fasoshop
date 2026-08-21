-- Migration 033 : index sur token_hash pour accélérer la vérification
-- du lien de réinitialisation (GET /api/auth/reset-password?token=...)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
  ON password_reset_tokens(token_hash);

-- Migration 032 : compteur de version de session, permet d'invalider
-- tous les JWT existants d'un utilisateur (ex: après reset mot de passe)
-- sans attendre leur expiration naturelle.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

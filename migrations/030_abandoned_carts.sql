-- Migration 030 : abandoned_carts tracking + reminders
CREATE TABLE IF NOT EXISTS abandoned_carts (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMP NOT NULL DEFAULT now(),
  reminded_at TIMESTAMP,
  converted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_last_seen
  ON abandoned_carts(last_seen)
  WHERE reminded_at IS NULL AND converted_at IS NULL;

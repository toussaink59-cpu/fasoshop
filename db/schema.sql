-- =====================================================
-- KIMOXA — schema.sql : SOURCE DE VÉRITÉ
-- Généré le 2026-08-11 depuis la base Neon de production
-- + migration 001 intégrée (marquée [M001])
-- Règle : tout changement futur = fichier dans migrations/
-- =====================================================

-- ---------- USERS ----------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  phone VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  first_name VARCHAR,
  last_name VARCHAR,
  date_of_birth DATE,
  nationality VARCHAR,
  country_of_residence VARCHAR,
  status TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_role_check CHECK (role IN ('buyer','vendor','admin'))
);

-- ---------- ADDRESSES ----------
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  libelle VARCHAR NOT NULL,
  adresse_texte TEXT NOT NULL,
  phone VARCHAR,
  par_defaut BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  latitude NUMERIC,
  longitude NUMERIC
);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- ---------- CATEGORIES ----------
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  emoji VARCHAR,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT categories_slug_key UNIQUE (slug)
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ---------- SHOPS ----------
CREATE TABLE shops (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  mobile_money_number VARCHAR,
  mobile_money_operator VARCHAR,  -- DEPRECATED : conservé pour compat, lire mobile_money_provider
  id_document_type VARCHAR,
  id_document_number VARCHAR,
  rejection_reason TEXT,
  verified_at TIMESTAMP,
  city VARCHAR,
  main_category_id INTEGER REFERENCES categories(id),
  id_document_url TEXT,
  mobile_money_provider TEXT,
  delivers_own_orders BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT shops_status_check CHECK (status IN ('pending','active','suspended','rejected')),
  CONSTRAINT shops_mobile_money_operator_check CHECK (mobile_money_operator IN ('orange_money','moov_money')),
  CONSTRAINT shops_mobile_money_provider_check CHECK (mobile_money_provider IN ('orange_money','moov_money')) -- [M001]
);
CREATE INDEX idx_shops_vendor_id ON shops(vendor_id);

-- ---------- PRODUCTS ----------
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  sku VARCHAR,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  category_id INTEGER REFERENCES categories(id),
  compare_at_price NUMERIC,
  flash_sale_ends_at TIMESTAMP,
  flash_sale_stock_snapshot INTEGER,
  images JSONB NOT NULL DEFAULT '[]',
  condition VARCHAR NOT NULL DEFAULT 'neuf',
  brand VARCHAR,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  sponsored_until TIMESTAMP,
  CONSTRAINT products_status_check CHECK (status IN ('active','draft','archived')),
  CONSTRAINT products_condition_check CHECK (condition IN ('neuf','quasi_neuf','occasion'))
);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_flash_sale ON products(flash_sale_ends_at);
CREATE INDEX idx_products_status ON products(status); -- [M001]

-- ---------- ORDERS ----------
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR NOT NULL DEFAULT 'pending',
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  shipping_address TEXT,
  phone VARCHAR,
  payment_method VARCHAR NOT NULL DEFAULT 'cod',
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_method TEXT NOT NULL DEFAULT 'delivery',
  fulfilled_by TEXT NOT NULL DEFAULT 'kimoxa',
  CONSTRAINT orders_status_check CHECK (status IN ('pending','paid','shipped','delivered','cancelled'))
);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);      -- [M001]
CREATE INDEX idx_orders_status ON orders(status);          -- [M001]
CREATE INDEX idx_orders_created_at ON orders(created_at DESC); -- [M001]

-- ---------- ORDER ITEMS ----------
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC NOT NULL
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id); -- [M001]

-- ---------- PAYMENTS (collecte CinetPay — Phase 3) ----------
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  provider VARCHAR NOT NULL DEFAULT 'cinetpay',
  transaction_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'initiated',
  amount NUMERIC NOT NULL,
  raw_response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id),
  CONSTRAINT payments_status_check CHECK (status IN ('initiated','success','failed'))
);
CREATE INDEX idx_payments_order_id ON payments(order_id);

-- ---------- PAYOUTS (DEPRECATED — remplacé par shop_commission_ledger, conservé pour historique) ----------
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  subtotal NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  vendor_amount NUMERIC NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  transfer_transaction_id VARCHAR,
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT payouts_status_check CHECK (status IN ('pending','success','failed'))
);
CREATE INDEX idx_payouts_shop_id ON payouts(shop_id);
CREATE INDEX idx_payouts_order_id ON payouts(order_id);

-- ---------- SHOP COMMISSION LEDGER (cœur financier) ----------
CREATE TABLE shop_commission_ledger (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  commission_amount NUMERIC NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'due',
  settled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_status VARCHAR NOT NULL DEFAULT 'preparation',
  commission_rate NUMERIC DEFAULT 5.5,
  payout_amount NUMERIC DEFAULT 0,
  payout_status TEXT DEFAULT 'held',
  payout_released_at TIMESTAMPTZ,
  payout_paid_at TIMESTAMPTZ,
  delivery_fee_amount NUMERIC NOT NULL DEFAULT 0,
  CONSTRAINT shop_commission_ledger_status_check CHECK (status IN ('due','settled')),
  CONSTRAINT shop_commission_ledger_delivery_status_check CHECK (delivery_status IN ('preparation','shipped','delivered','cancelled')),
  CONSTRAINT ledger_payout_status_check CHECK (payout_status IN ('held','released','paid')) -- [M001]
);
CREATE INDEX idx_ledger_shop_id ON shop_commission_ledger(shop_id);
CREATE INDEX idx_ledger_order_id ON shop_commission_ledger(order_id);       -- [M001]
CREATE INDEX idx_ledger_payout_status ON shop_commission_ledger(payout_status); -- [M001]

-- ---------- ADMIN PAYOUT TRANSACTIONS ----------
CREATE TABLE admin_payout_transactions (
  id SERIAL PRIMARY KEY,
  ledger_id INTEGER NOT NULL REFERENCES shop_commission_ledger(id),
  admin_id INTEGER NOT NULL REFERENCES users(id),
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT NOT NULL,
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT admin_payout_transactions_payment_method_check
    CHECK (payment_method IN ('orange_money','moov_money','bank_transfer','cash'))
);
CREATE INDEX idx_payout_tx_ledger ON admin_payout_transactions(ledger_id);
CREATE INDEX idx_payout_tx_admin ON admin_payout_transactions(admin_id);
CREATE INDEX idx_payout_tx_created ON admin_payout_transactions(created_at);

-- ---------- COURIER PAYOUTS (argent de livraison) ----------
CREATE TABLE courier_payouts (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'due',
  payment_reference TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT courier_status_check CHECK (status IN ('due','paid')) -- [M001]
);
CREATE INDEX idx_courier_status ON courier_payouts(status);
CREATE INDEX idx_courier_order_id ON courier_payouts(order_id); -- [M001]

-- ---------- PAYOUT ATTEMPTS (idempotence financière) ----------
CREATE TABLE payout_attempts (
  id SERIAL PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  phone TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_reference TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT payout_attempts_idempotency_key_key UNIQUE (idempotency_key)
);
CREATE INDEX idx_payout_attempts_resource ON payout_attempts(resource_type, resource_id);
CREATE INDEX idx_payout_attempts_status ON payout_attempts(status, updated_at);

-- ---------- CONVERSATIONS / MESSAGES ----------
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT conversations_order_id_shop_id_key UNIQUE (order_id, shop_id)
);
CREATE INDEX idx_conversations_shop_id ON conversations(shop_id);   -- [M001]
CREATE INDEX idx_conversations_buyer_id ON conversations(buyer_id); -- [M001]

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  sender_role VARCHAR NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  read_at TIMESTAMP,
  image_url TEXT,
  CONSTRAINT messages_sender_role_check CHECK (sender_role IN ('buyer','vendor'))
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- ---------- FAVORITES / REVIEWS ----------
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT favorites_user_id_product_id_key UNIQUE (user_id, product_id)
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_item_id INTEGER REFERENCES order_items(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reviews_product_id_buyer_id_key UNIQUE (product_id, buyer_id)
);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);

-- ---------- SECURITY AUDIT LOG (sans FK user_id : l'audit survit aux comptes supprimés) ----------
CREATE TABLE security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_audit_user ON security_audit_log(user_id);
CREATE INDEX idx_audit_action ON security_audit_log(action);
CREATE INDEX idx_audit_created ON security_audit_log(created_at DESC); -- [M001]

-- ---------- SPONSORSHIP REQUESTS ----------
CREATE TABLE sponsorship_requests (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP,
  CONSTRAINT sponsorship_requests_status_check CHECK (status IN ('pending','approved','rejected'))
);
CREATE INDEX idx_sponsor_status ON sponsorship_requests(status); -- [M001]

-- ---------- STOCK MOVEMENTS ----------
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  reason VARCHAR,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_type_check CHECK (type IN ('restock','sale','adjustment'))
);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);

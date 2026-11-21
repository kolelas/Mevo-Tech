-- 007: replace the legacy in-memory commerce model with a complete PostgreSQL domain.
-- Additive and safe to run on an empty staging database after migrations 001-006.
-- No demo/catalogue/customer/order data is seeded by this migration.

ALTER TABLE mevo_products
  ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (cost_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS primary_image TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS placement_slot TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS placement_priority INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS pinned_to_top BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warranty_period_months INTEGER NOT NULL DEFAULT 12 CHECK (warranty_period_months >= 0);

CREATE TABLE IF NOT EXISTS mevo_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES mevo_products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  promotional_price_cents BIGINT CHECK (promotional_price_cents IS NULL OR promotional_price_cents >= 0),
  stock_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (stock_on_hand >= 0),
  stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0 AND stock_reserved <= stock_on_hand),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mevo_product_variants_product_idx ON mevo_product_variants(product_id, active);

ALTER TABLE mevo_customers
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restriction_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS default_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS favourites JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS mevo_customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES mevo_customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Address',
  address JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mevo_customer_one_default_address
  ON mevo_customer_addresses(customer_id) WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS mevo_coupons (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE','FIXED_CENTS')),
  discount_value BIGINT NOT NULL CHECK (discount_value > 0),
  minimum_order_cents BIGINT NOT NULL DEFAULT 0 CHECK (minimum_order_cents >= 0),
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mevo_shipping_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  estimated_delivery TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS mevo_store_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Mevo Tech',
  support_email TEXT NOT NULL DEFAULT '',
  support_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 15 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
  free_shipping_threshold_cents BIGINT NOT NULL DEFAULT 150000 CHECK (free_shipping_threshold_cents >= 0),
  payment_providers JSONB NOT NULL DEFAULT '{}'::jsonb,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mevo_promotional_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  kicker TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT '',
  target_category TEXT,
  discount_code TEXT REFERENCES mevo_coupons(code) ON UPDATE CASCADE ON DELETE SET NULL,
  discount_percent NUMERIC(5,2),
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  theme TEXT NOT NULL DEFAULT 'charcoal'
    CHECK (theme IN ('electric-blue','charcoal','emerald')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mevo_order_items
  ADD COLUMN IF NOT EXISTS variant_id TEXT,
  ADD COLUMN IF NOT EXISTS brand_snapshot TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS variant_title_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS tax_cents BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0);

ALTER TABLE mevo_orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_method JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS mevo_order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES mevo_orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mevo_order_status_history_idx ON mevo_order_status_history(order_id, created_at);

CREATE TABLE IF NOT EXISTS mevo_stock_reservations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  order_id TEXT REFERENCES mevo_orders(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES mevo_products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES mevo_product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','CONVERTED','EXPIRED','RELEASED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mevo_stock_reservations_expiry_idx
  ON mevo_stock_reservations(status, expires_at);

CREATE TABLE IF NOT EXISTS mevo_product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES mevo_products(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES mevo_customers(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL CHECK (length(comment) BETWEEN 1 AND 5000),
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mevo_product_reviews_visible_idx ON mevo_product_reviews(product_id, visible, created_at DESC);

CREATE TABLE IF NOT EXISTS mevo_price_alerts (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES mevo_products(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES mevo_customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  initial_price_cents BIGINT NOT NULL CHECK (initial_price_cents >= 0),
  target_price_cents BIGINT NOT NULL CHECK (target_price_cents >= 0),
  target_type TEXT NOT NULL CHECK (target_type IN ('any','10_percent','20_percent','custom')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TRIGGERED','CANCELLED')),
  triggered_at TIMESTAMPTZ,
  last_notified_price_cents BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mevo_price_alerts_customer_idx ON mevo_price_alerts(lower(email), status);

CREATE TABLE IF NOT EXISTS mevo_customer_favourites (
  customer_id TEXT NOT NULL REFERENCES mevo_customers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES mevo_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS mevo_carts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES mevo_customers(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount_code TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','ABANDONED','RECOVERED','EXPIRED','DISMISSED')),
  recovery_token_hash TEXT UNIQUE,
  recovery_incentive_code TEXT,
  reminder_count INTEGER NOT NULL DEFAULT 0 CHECK (reminder_count >= 0),
  reminder_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovered_order_reference TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mevo_carts_abandoned_idx ON mevo_carts(status, last_activity_at);
CREATE INDEX IF NOT EXISTS mevo_carts_customer_idx ON mevo_carts(customer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS mevo_newsletter_subscriptions (
  email TEXT PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mevo_contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 10000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved','spam')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce single active order of a payment idempotency key at database level.
CREATE UNIQUE INDEX IF NOT EXISTS mevo_payment_provider_txn_unique
  ON mevo_payment_attempts(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

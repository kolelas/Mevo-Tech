-- Mevo Tech PostgreSQL foundation (incremental migration; existing runtime remains unchanged until adapter cutover).
-- Apply to a new database only. Use a migration runner and backups before applying to any production DB.
CREATE TABLE IF NOT EXISTS mevo_schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mevo_customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','restricted','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mevo_products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  currency CHAR(3) NOT NULL DEFAULT 'ZAR',
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  promotional_price_cents BIGINT CHECK (promotional_price_cents >= 0),
  stock_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (stock_on_hand >= 0),
  stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0 AND stock_reserved <= stock_on_hand),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mevo_orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES mevo_customers(id),
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'ZAR',
  subtotal_cents BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  shipping_cents BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  tax_cents BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mevo_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES mevo_orders(id) ON DELETE RESTRICT,
  product_id TEXT REFERENCES mevo_products(id),
  sku_snapshot TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  unit_price_cents BIGINT NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0)
);
CREATE TABLE IF NOT EXISTS mevo_payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES mevo_orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  status TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'ZAR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mevo_audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mevo_inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES mevo_products(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity <> 0),
  reference TEXT,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mevo_orders_customer_idx ON mevo_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mevo_orders_email_idx ON mevo_orders(customer_email, created_at DESC);
CREATE INDEX IF NOT EXISTS mevo_payment_order_idx ON mevo_payment_attempts(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mevo_inventory_product_idx ON mevo_inventory_movements(product_id, created_at DESC);

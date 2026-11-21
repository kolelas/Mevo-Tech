-- Durable idempotency and review constraints foundation; not yet wired into runtime.
-- Apply only via migration runner to a managed PostgreSQL database with backup.
CREATE TABLE IF NOT EXISTS mevo_webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processing','processed','failed')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  PRIMARY KEY (provider, event_id)
);
CREATE INDEX IF NOT EXISTS mevo_webhook_events_status_idx ON mevo_webhook_events(processing_status, received_at);
CREATE TABLE IF NOT EXISTS mevo_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES mevo_customers(id),
  order_id TEXT NOT NULL REFERENCES mevo_orders(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  comment TEXT NOT NULL CHECK (length(comment) BETWEEN 1 AND 2000),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, product_id, order_id)
);
CREATE INDEX IF NOT EXISTS mevo_reviews_product_status_idx ON mevo_reviews(product_id, moderation_status, created_at DESC);

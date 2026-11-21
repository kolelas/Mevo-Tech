-- Additive schema for administrator fulfilment, customer support and audit workflows.
-- Run after migrations 001-005 on a provisioned database.

ALTER TABLE mevo_orders
  ADD COLUMN IF NOT EXISTS shipment_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS mevo_orders_status_created_idx
  ON mevo_orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS mevo_support_cases (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES mevo_customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  order_reference TEXT REFERENCES mevo_orders(reference) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high')),
  assigned_to TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS mevo_support_cases_status_created_idx
  ON mevo_support_cases(status, created_at DESC);
CREATE INDEX IF NOT EXISTS mevo_support_cases_customer_idx
  ON mevo_support_cases(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mevo_support_cases_order_idx
  ON mevo_support_cases(order_reference);

CREATE TABLE IF NOT EXISTS mevo_support_case_events (
  id BIGSERIAL PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES mevo_support_cases(id) ON DELETE RESTRICT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mevo_support_case_events_case_idx
  ON mevo_support_case_events(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mevo_audit_events_created_idx
  ON mevo_audit_events(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS mevo_audit_events_action_idx
  ON mevo_audit_events(action, created_at DESC);

-- Durable webhook event claiming and replay protection.
-- Apply only after provisioning PostgreSQL and validating against a staging copy.
-- The active application runtime still uses in-memory Maps; this migration is
-- groundwork only until a PostgreSQL repository/transaction layer is wired in.

ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE payment_webhook_events
  DROP CONSTRAINT IF EXISTS chk_payment_webhook_attempt_count;
ALTER TABLE payment_webhook_events
  ADD CONSTRAINT chk_payment_webhook_attempt_count CHECK (attempt_count >= 0);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_recovery
  ON payment_webhook_events(processing_status, lease_expires_at, received_at);

-- Returns one of: claimed, duplicate, in_progress, payload_conflict,
-- transaction_conflict. The caller supplies a fresh lease UUID and must only
-- apply order/payment/inventory changes while holding that lease in the same
-- database transaction as completion of this event.
CREATE OR REPLACE FUNCTION claim_payment_webhook_event(
  p_provider TEXT,
  p_event_id TEXT,
  p_provider_transaction_id TEXT,
  p_order_reference TEXT,
  p_payload_digest TEXT,
  p_event_type TEXT,
  p_lease_token UUID,
  p_lease_seconds INTEGER DEFAULT 90
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  existing_event payment_webhook_events%ROWTYPE;
BEGIN
  IF COALESCE(trim(p_provider), '') = ''
     OR COALESCE(trim(p_event_id), '') = ''
     OR COALESCE(trim(p_order_reference), '') = ''
     OR COALESCE(trim(p_payload_digest), '') = ''
     OR p_lease_token IS NULL
     OR p_lease_seconds < 10
     OR p_lease_seconds > 600 THEN
    RAISE EXCEPTION 'Invalid payment webhook claim arguments';
  END IF;

  SELECT * INTO existing_event
    FROM payment_webhook_events
   WHERE provider = p_provider AND event_id = p_event_id
   FOR UPDATE;

  IF FOUND THEN
    IF existing_event.payload_digest <> p_payload_digest THEN
      RETURN 'payload_conflict';
    END IF;
    IF existing_event.processing_status = 'processed' THEN
      RETURN 'duplicate';
    END IF;
    IF existing_event.processing_status = 'processing'
       AND existing_event.lease_expires_at > now() THEN
      RETURN 'in_progress';
    END IF;

    UPDATE payment_webhook_events
       SET processing_status = 'processing',
           lease_token = p_lease_token,
           lease_expires_at = now() + make_interval(secs => p_lease_seconds),
           attempt_count = attempt_count + 1,
           updated_at = now(),
           error_summary = NULL
     WHERE id = existing_event.id;
    RETURN 'claimed';
  END IF;

  BEGIN
    INSERT INTO payment_webhook_events (
      provider, event_id, provider_transaction_id, order_reference,
      payload_digest, event_type, processing_status, lease_token,
      lease_expires_at, attempt_count, updated_at
    ) VALUES (
      p_provider, p_event_id, NULLIF(p_provider_transaction_id, ''),
      p_order_reference, p_payload_digest, NULLIF(p_event_type, ''),
      'processing', p_lease_token,
      now() + make_interval(secs => p_lease_seconds), 1, now()
    );
  EXCEPTION WHEN unique_violation THEN
    -- The unique violation may be a concurrent delivery of this same event,
    -- or a different event attempting to reuse the provider transaction ID.
    -- Re-read the event after the INSERT subtransaction has rolled back so
    -- concurrent same-event deliveries receive the correct idempotent result.
    SELECT * INTO existing_event
      FROM payment_webhook_events
     WHERE provider = p_provider AND event_id = p_event_id
     FOR UPDATE;

    IF FOUND THEN
      IF existing_event.payload_digest <> p_payload_digest THEN
        RETURN 'payload_conflict';
      END IF;
      IF existing_event.processing_status = 'processed' THEN
        RETURN 'duplicate';
      END IF;
      IF existing_event.processing_status = 'processing'
         AND existing_event.lease_expires_at > now() THEN
        RETURN 'in_progress';
      END IF;

      UPDATE payment_webhook_events
         SET processing_status = 'processing',
             lease_token = p_lease_token,
             lease_expires_at = now() + make_interval(secs => p_lease_seconds),
             attempt_count = attempt_count + 1,
             updated_at = now(),
             error_summary = NULL
       WHERE id = existing_event.id;
      RETURN 'claimed';
    END IF;

    -- No matching event row means another event owns the provider transaction.
    RETURN 'transaction_conflict';
  END;

  RETURN 'claimed';
END;
$$;

-- A worker may finalize only the event lease it actually claimed. Completion
-- and order/payment/inventory mutations must be committed in one DB transaction.
CREATE OR REPLACE FUNCTION complete_payment_webhook_event(
  p_provider TEXT,
  p_event_id TEXT,
  p_lease_token UUID,
  p_final_status TEXT,
  p_error_summary TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  IF p_final_status NOT IN ('processed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid final payment webhook status';
  END IF;

  UPDATE payment_webhook_events
     SET processing_status = p_final_status,
         processed_at = CASE WHEN p_final_status = 'processed' THEN now() ELSE processed_at END,
         error_summary = NULLIF(left(COALESCE(p_error_summary, ''), 500), ''),
         lease_token = NULL,
         lease_expires_at = NULL,
         updated_at = now()
   WHERE provider = p_provider
     AND event_id = p_event_id
     AND lease_token = p_lease_token
     AND processing_status = 'processing';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$$;

COMMENT ON FUNCTION claim_payment_webhook_event(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,INTEGER)
  IS 'Claims a signed provider event with digest comparison, transaction uniqueness and expiring worker lease.';
COMMENT ON FUNCTION complete_payment_webhook_event(TEXT,TEXT,UUID,TEXT,TEXT)
  IS 'Finalizes only the webhook event lease token held by the caller.';

-- Integration assertions for migrations 003/004. Run against a disposable PostgreSQL database.
DO $$
DECLARE
  first_lease UUID := '11111111-1111-4111-8111-111111111111';
  second_lease UUID := '22222222-2222-4222-8222-222222222222';
  third_lease UUID := '33333333-3333-4333-8333-333333333333';
  result TEXT;
BEGIN
  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-1', 'txn-lease-1', 'MEV-TEST-1',
    'digest-one', 'charge.success', first_lease, 90
  );
  IF result <> 'claimed' THEN RAISE EXCEPTION 'expected claimed, got %', result; END IF;

  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-1', 'txn-lease-1', 'MEV-TEST-1',
    'digest-one', 'charge.success', second_lease, 90
  );
  IF result <> 'in_progress' THEN RAISE EXCEPTION 'expected in_progress, got %', result; END IF;

  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-1', 'txn-lease-1', 'MEV-TEST-1',
    'tampered-digest', 'charge.success', second_lease, 90
  );
  IF result <> 'payload_conflict' THEN RAISE EXCEPTION 'expected payload_conflict, got %', result; END IF;

  IF complete_payment_webhook_event('paystack', 'evt-lease-1', second_lease, 'processed', NULL) THEN
    RAISE EXCEPTION 'wrong lease token must not complete an event';
  END IF;
  IF NOT complete_payment_webhook_event('paystack', 'evt-lease-1', first_lease, 'processed', NULL) THEN
    RAISE EXCEPTION 'valid lease token should complete an event';
  END IF;

  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-1', 'txn-lease-1', 'MEV-TEST-1',
    'digest-one', 'charge.success', second_lease, 90
  );
  IF result <> 'duplicate' THEN RAISE EXCEPTION 'expected duplicate, got %', result; END IF;

  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-2', 'txn-lease-1', 'MEV-TEST-2',
    'digest-two', 'charge.success', third_lease, 90
  );
  IF result <> 'transaction_conflict' THEN RAISE EXCEPTION 'expected transaction_conflict, got %', result; END IF;

  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-retry', 'txn-lease-retry', 'MEV-TEST-3',
    'digest-retry', 'charge.failed', first_lease, 90
  );
  IF result <> 'claimed' THEN RAISE EXCEPTION 'expected initial retry claim, got %', result; END IF;

  UPDATE payment_webhook_events
     SET lease_expires_at = now() - interval '1 second'
   WHERE provider = 'paystack' AND event_id = 'evt-lease-retry';

  result := claim_payment_webhook_event(
    'paystack', 'evt-lease-retry', 'txn-lease-retry', 'MEV-TEST-3',
    'digest-retry', 'charge.failed', second_lease, 90
  );
  IF result <> 'claimed' THEN RAISE EXCEPTION 'expected expired lease reclaim, got %', result; END IF;

  IF (SELECT attempt_count FROM payment_webhook_events
       WHERE provider = 'paystack' AND event_id = 'evt-lease-retry') <> 2 THEN
    RAISE EXCEPTION 'expired lease reclaim must increment attempt_count';
  END IF;
END;
$$;

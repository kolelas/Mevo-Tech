-- Integration assertions for migration 006. Runs inside disposable CI PostgreSQL.
DO $$
BEGIN
  IF to_regclass('public.mevo_support_cases') IS NULL THEN
    RAISE EXCEPTION 'mevo_support_cases table missing';
  END IF;
  IF to_regclass('public.mevo_support_case_events') IS NULL THEN
    RAISE EXCEPTION 'mevo_support_case_events table missing';
  END IF;
  IF to_regclass('public.mevo_audit_events_created_idx') IS NULL THEN
    RAISE EXCEPTION 'audit events index missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'mevo_orders'
       AND column_name = 'tracking_number'
  ) THEN
    RAISE EXCEPTION 'shipment tracking_number column missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'mevo_orders'
       AND column_name = 'fulfilled_at'
  ) THEN
    RAISE EXCEPTION 'fulfilled_at column missing';
  END IF;
END;
$$;

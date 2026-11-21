-- Exercises the last-enabled-owner invariant in an isolated transaction.
BEGIN;

INSERT INTO admin_roles (user_id, email, role, enabled, granted_by)
VALUES ('ci-owner-guard-a', 'owner-a@example.invalid', 'owner', TRUE, 'ci-test');

DO $$
BEGIN
  UPDATE admin_roles SET enabled = FALSE WHERE user_id = 'ci-owner-guard-a';
  RAISE EXCEPTION 'Expected the last-owner guard to reject disabling the only owner';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END;
$$;

INSERT INTO admin_roles (user_id, email, role, enabled, granted_by)
VALUES ('ci-owner-guard-b', 'owner-b@example.invalid', 'owner', TRUE, 'ci-test');

UPDATE admin_roles SET enabled = FALSE WHERE user_id = 'ci-owner-guard-a';

DO $$
BEGIN
  UPDATE admin_roles SET role = 'admin' WHERE user_id = 'ci-owner-guard-b';
  RAISE EXCEPTION 'Expected the last-owner guard to reject demoting the remaining owner';
EXCEPTION
  WHEN check_violation THEN
    NULL;
END;
$$;

ROLLBACK;

-- Protect the administrator control plane from accidental lockout.
-- An enabled owner cannot be demoted, disabled, or deleted while it is the last enabled owner.

CREATE OR REPLACE FUNCTION prevent_last_enabled_admin_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_owners INTEGER;
BEGIN
  IF OLD.role = 'owner'
     AND OLD.enabled = TRUE
     AND (
       TG_OP = 'DELETE'
       OR NEW.role IS DISTINCT FROM 'owner'
       OR NEW.enabled IS DISTINCT FROM TRUE
     ) THEN
    SELECT COUNT(*)
      INTO remaining_owners
      FROM admin_roles
     WHERE role = 'owner'
       AND enabled = TRUE
       AND user_id <> OLD.user_id;

    IF remaining_owners < 1 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last enabled administrator owner'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_owner_removal ON admin_roles;
CREATE TRIGGER trg_prevent_last_admin_owner_removal
BEFORE UPDATE OF role, enabled OR DELETE ON admin_roles
FOR EACH ROW
EXECUTE FUNCTION prevent_last_enabled_admin_owner_removal();

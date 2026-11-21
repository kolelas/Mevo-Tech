import { Router, type RequestHandler } from 'express';
import type { Pool } from 'pg';
import {
  ADMIN_ROLES,
  hasAdminPermission,
  resolveAdminRole,
  type AdminRole,
  type VerifiedAdminIdentity,
} from './adminAuthorization';
import { verifyFirebaseAdminIdentity } from './firebaseAdminIdentity';

type IdentityVerifier = (token: string) => Promise<VerifiedAdminIdentity | null>;

function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && token.length <= 16_384 ? token : null;
}

export function createAdminRouter(
  pool: Pick<Pool, 'query'> | null,
  verifyIdentity: IdentityVerifier = verifyFirebaseAdminIdentity,
) {
  const router = Router();

  const authenticateAdmin: RequestHandler = (req, res, next) => {
    void (async () => {
      if (!pool) {
        res.status(503).json({
          success: false,
          error: 'Administrator services are unavailable until the database is configured.',
        });
        return;
      }

      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ success: false, error: 'A valid administrator sign-in is required.' });
        return;
      }

      try {
        const identity = await verifyIdentity(token);
        if (!identity) {
          res.status(401).json({ success: false, error: 'A valid administrator sign-in is required.' });
          return;
        }

        const role = await resolveAdminRole(pool, identity);
        if (!role) {
          res.status(403).json({ success: false, error: 'Administrator access has not been granted.' });
          return;
        }

        res.locals.adminIdentity = identity;
        res.locals.adminRole = role;
        next();
      } catch {
        res.status(503).json({ success: false, error: 'Administrator authorization is temporarily unavailable.' });
      }
    })();
  };

  router.use(authenticateAdmin);


  const requirePermission = (permission: Parameters<typeof hasAdminPermission>[1]): RequestHandler =>
    (_req, res, next) => {
      const role = res.locals.adminRole as AdminRole | undefined;
      if (!hasAdminPermission(role, permission)) {
        res.status(403).json({ success: false, error: 'Your administrator role does not permit this operation.' });
        return;
      }
      next();
    };

  // These endpoints read only the PostgreSQL commerce foundation. They do not
  // fall back to the legacy in-memory Maps runtime.
  router.get('/catalog/products', requirePermission('catalog.read'), (req, res) => {
    void (async () => {
      const rawLimit = req.query.limit;
      const rawOffset = req.query.offset;
      const limit = rawLimit === undefined ? 25 : Number(rawLimit);
      const offset = rawOffset === undefined ? 0 : Number(rawOffset);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      if (
        !Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isInteger(offset) || offset < 0 || offset > 1_000_000 ||
        (req.query.search !== undefined && (typeof req.query.search !== 'string' || search.length > 100))
      ) {
        res.status(400).json({ success: false, error: 'Invalid catalogue pagination or search parameters.' });
        return;
      }

      try {
        const pattern = search ? `%${search.replace(/[\\%_]/g, '\\  router.get('/session', (_req, res) => {')}%` : null;
        const result = await pool!.query(
          `SELECT id, sku, slug, name, active, currency, price_cents,
                  promotional_price_cents, stock_on_hand, stock_reserved,
                  (stock_on_hand - stock_reserved) AS available_stock,
                  created_at, updated_at
             FROM mevo_products
            WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE E'\\\\' OR sku ILIKE $1 ESCAPE E'\\\\')
            ORDER BY updated_at DESC, id ASC
            LIMIT $2 OFFSET $3`,
          [pattern, limit, offset],
        );
        const count = await pool!.query(
          `SELECT COUNT(*)::bigint AS total
             FROM mevo_products
            WHERE ($1::text IS NULL OR name ILIKE $1 ESCAPE E'\\\\' OR sku ILIKE $1 ESCAPE E'\\\\')`,
          [pattern],
        );
        res.json({
          success: true,
          source: 'postgresql',
          pagination: { limit, offset, total: Number(count.rows[0]?.total ?? 0) },
          products: result.rows,
        });
      } catch {
        res.status(503).json({ success: false, error: 'The PostgreSQL catalogue is temporarily unavailable.' });
      }
    })();
  });

  router.get('/inventory/summary', requirePermission('inventory.read'), (_req, res) => {
    void (async () => {
      try {
        const result = await pool!.query(
          `SELECT COUNT(*)::bigint AS product_count,
                  COUNT(*) FILTER (WHERE active = TRUE)::bigint AS active_product_count,
                  COALESCE(SUM(stock_on_hand), 0)::bigint AS units_on_hand,
                  COALESCE(SUM(stock_reserved), 0)::bigint AS units_reserved,
                  COALESCE(SUM(stock_on_hand - stock_reserved), 0)::bigint AS units_available,
                  COUNT(*) FILTER (WHERE active = TRUE AND stock_on_hand - stock_reserved = 0)::bigint AS active_out_of_stock_count
             FROM mevo_products`,
        );
        res.json({ success: true, source: 'postgresql', inventory: result.rows[0] ?? {} });
      } catch {
        res.status(503).json({ success: false, error: 'The PostgreSQL inventory service is temporarily unavailable.' });
      }
    })();
  });

  router.get('/inventory/movements', requirePermission('inventory.read'), (req, res) => {
    void (async () => {
      const rawLimit = req.query.limit;
      const limit = rawLimit === undefined ? 50 : Number(rawLimit);
      const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
          (req.query.productId !== undefined && (!productId || productId.length > 128))) {
        res.status(400).json({ success: false, error: 'Invalid inventory movement filters.' });
        return;
      }

      try {
        const result = await pool!.query(
          `SELECT m.id, m.product_id, p.sku, p.name AS product_name,
                  m.movement_type, m.quantity, m.reference, m.actor, m.created_at
             FROM mevo_inventory_movements m
             JOIN mevo_products p ON p.id = m.product_id
            WHERE ($1::text IS NULL OR m.product_id = $1)
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT $2`,
          [productId || null, limit],
        );
        res.json({ success: true, source: 'postgresql', movements: result.rows });
      } catch {
        res.status(503).json({ success: false, error: 'The PostgreSQL inventory ledger is temporarily unavailable.' });
      }
    })();
  });

  router.get('/session', (_req, res) => {
    const role = res.locals.adminRole as AdminRole;
    const permissions = [
      'admin.roles.manage',
      'catalog.read',
      'catalog.write',
      'inventory.read',
      'inventory.write',
      'orders.read',
      'orders.fulfil',
      'customers.read',
      'customers.support',
    ].filter((permission) =>
      hasAdminPermission(role, permission as Parameters<typeof hasAdminPermission>[1]),
    );

    const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
    res.json({
      success: true,
      administrator: {
        userId: identity.userId,
        email: identity.email,
        role,
        permissions,
      },
    });
  });

  router.post('/roles', (req, res) => {
    void (async () => {
      const role = res.locals.adminRole as AdminRole;
      if (!hasAdminPermission(role, 'admin.roles.manage')) {
        res.status(403).json({ success: false, error: 'Owner permission is required to manage administrator roles.' });
        return;
      }

      const { userId, email, role: requestedRole } = req.body || {};
      if (
        typeof userId !== 'string' || !userId.trim() || userId.length > 256 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 ||
        typeof requestedRole !== 'string' || !ADMIN_ROLES.includes(requestedRole as AdminRole)
      ) {
        res.status(400).json({ success: false, error: 'A valid userId, email, and administrator role are required.' });
        return;
      }

      const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
      try {
        await pool!.query(
          `INSERT INTO admin_roles (user_id, email, role, enabled, granted_by)
           VALUES ($1, $2, $3, TRUE, $4)
           ON CONFLICT (user_id) DO UPDATE
             SET email = EXCLUDED.email,
                 role = EXCLUDED.role,
                 enabled = TRUE,
                 granted_by = EXCLUDED.granted_by,
                 updated_at = now()`,
          [userId.trim(), email.trim().toLowerCase(), requestedRole, identity.userId],
        );
        res.status(201).json({ success: true, message: 'Administrator role saved.' });
      } catch {
        res.status(503).json({ success: false, error: 'Administrator role could not be saved.' });
      }
    })();
  });

  router.delete('/roles/:userId', (req, res) => {
    void (async () => {
      const role = res.locals.adminRole as AdminRole;
      if (!hasAdminPermission(role, 'admin.roles.manage')) {
        res.status(403).json({ success: false, error: 'Owner permission is required to manage administrator roles.' });
        return;
      }

      const userId = req.params.userId;
      if (!userId || userId.length > 256) {
        res.status(400).json({ success: false, error: 'A valid administrator user ID is required.' });
        return;
      }

      try {
        const result = await pool!.query(
          `UPDATE admin_roles
              SET enabled = FALSE, updated_at = now()
            WHERE user_id = $1 AND enabled = TRUE
          RETURNING user_id`,
          [userId],
        );
        if (result.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Enabled administrator role not found.' });
          return;
        }
        res.json({ success: true, message: 'Administrator access disabled.' });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === '23514') {
          res.status(409).json({ success: false, error: 'The last enabled owner cannot be disabled.' });
          return;
        }
        res.status(503).json({ success: false, error: 'Administrator role could not be disabled.' });
      }
    })();
  });

  return router;
}

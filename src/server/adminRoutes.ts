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
        const pattern = search ? '%' + search + '%' : null;
        const result = await pool!.query(
          `SELECT id, sku, slug, name, active, currency, price_cents,
                  promotional_price_cents, stock_on_hand, stock_reserved,
                  (stock_on_hand - stock_reserved) AS available_stock,
                  created_at, updated_at
             FROM mevo_products
            WHERE ($1::text IS NULL OR name ILIKE $1 OR sku ILIKE $1)
            ORDER BY updated_at DESC, id ASC
            LIMIT $2 OFFSET $3`,
          [pattern, limit, offset],
        );
        const count = await pool!.query(
          `SELECT COUNT(*)::bigint AS total
             FROM mevo_products
            WHERE ($1::text IS NULL OR name ILIKE $1 OR sku ILIKE $1)`,
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


  // Mutations require a dedicated checked-out connection so the row update,
  // ledger entry, and audit event commit or roll back as one unit.
  const runAdminTransaction = async <T>(work: (client: import('pg').PoolClient) => Promise<T>): Promise<T> => {
    const client = await (pool as Pool).connect();
    let open = false;
    try {
      await client.query('BEGIN');
      open = true;
      const result = await work(client);
      await client.query('COMMIT');
      open = false;
      return result;
    } catch (error) {
      if (open) {
        try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      }
      throw error;
    } finally {
      client.release();
    }
  };

  router.patch('/catalog/products/:productId', requirePermission('catalog.write'), (req, res) => {
    void (async () => {
      const productId = req.params.productId;
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const allowed = new Set(['name', 'sku', 'slug', 'active', 'priceCents', 'promotionalPriceCents']);
      const keys = Object.keys(body);
      if (!productId || productId.length > 128 || keys.length === 0 || keys.some((key) => !allowed.has(key))) {
        res.status(400).json({ success: false, error: 'Provide a product ID and at least one supported product field.' });
        return;
      }
      if (
        ('name' in body && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 200)) ||
        ('sku' in body && (typeof body.sku !== 'string' || !body.sku.trim() || body.sku.trim().length > 100)) ||
        ('slug' in body && (typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || body.slug.length > 180)) ||
        ('active' in body && typeof body.active !== 'boolean') ||
        ('priceCents' in body && (!Number.isSafeInteger(body.priceCents) || body.priceCents < 0)) ||
        ('promotionalPriceCents' in body && body.promotionalPriceCents !== null &&
          (!Number.isSafeInteger(body.promotionalPriceCents) || body.promotionalPriceCents < 0))
      ) {
        res.status(400).json({ success: false, error: 'One or more product fields are invalid.' });
        return;
      }

      try {
        const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
        const updated = await runAdminTransaction(async (client) => {
          const current = await client.query(
            'SELECT id, price_cents, promotional_price_cents FROM mevo_products WHERE id = $1 FOR UPDATE',
            [productId],
          );
          if (!current.rows[0]) return null;
          const nextPrice = 'priceCents' in body ? body.priceCents : Number(current.rows[0].price_cents);
          const nextPromo = 'promotionalPriceCents' in body
            ? body.promotionalPriceCents
            : current.rows[0].promotional_price_cents === null ? null : Number(current.rows[0].promotional_price_cents);
          if (nextPromo !== null && nextPromo > nextPrice) {
            const error = new Error('Promotional price cannot exceed the regular price.');
            (error as Error & { status?: number }).status = 400;
            throw error;
          }

          const columns: Record<string, string> = {
            name: 'name', sku: 'sku', slug: 'slug', active: 'active',
            priceCents: 'price_cents', promotionalPriceCents: 'promotional_price_cents',
          };
          const assignments: string[] = [];
          const values: unknown[] = [];
          for (const key of keys) {
            values.push(key === 'name' || key === 'sku' ? body[key].trim() : body[key]);
            assignments.push(columns[key] + ' = 
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
 + values.length);
          }
          assignments.push('updated_at = now()');
          values.push(productId);
          const result = await client.query(
            'UPDATE mevo_products SET ' + assignments.join(', ') + ' WHERE id = 
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
 + values.length +
            ' RETURNING id, sku, slug, name, active, currency, price_cents, promotional_price_cents, stock_on_hand, stock_reserved, updated_at',
            values,
          );
          await client.query(
            `INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details)
             VALUES ($1, 'catalog.product.updated', 'product', $2, $3::jsonb)`,
            [identity.userId, productId, JSON.stringify({ changedFields: keys })],
          );
          return result.rows[0];
        });
        if (!updated) {
          res.status(404).json({ success: false, error: 'Product not found.' });
          return;
        }
        res.json({ success: true, product: updated });
      } catch (error) {
        const status = (error as { status?: number; code?: string }).status;
        const code = (error as { code?: string }).code;
        if (status === 400) {
          res.status(400).json({ success: false, error: (error as Error).message });
        } else if (code === '23505') {
          res.status(409).json({ success: false, error: 'The product SKU or slug is already in use.' });
        } else {
          res.status(503).json({ success: false, error: 'The product could not be updated; no partial changes were committed.' });
        }
      }
    })();
  });

  router.post('/inventory/adjustments', requirePermission('inventory.write'), (req, res) => {
    void (async () => {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
      const quantity = body.quantity;
      const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (
        !productId || productId.length > 128 ||
        !Number.isSafeInteger(quantity) || quantity === 0 || Math.abs(quantity) > 100_000 ||
        (body.reference !== undefined && (typeof body.reference !== 'string' || reference.length > 120)) ||
        (body.note !== undefined && (typeof body.note !== 'string' || note.length > 500))
      ) {
        res.status(400).json({ success: false, error: 'A product ID, non-zero adjustment quantity, and valid optional reference/note are required.' });
        return;
      }

      try {
        const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
        const movement = await runAdminTransaction(async (client) => {
          const locked = await client.query(
            'SELECT id, stock_on_hand, stock_reserved FROM mevo_products WHERE id = $1 FOR UPDATE',
            [productId],
          );
          if (!locked.rows[0]) return { kind: 'missing' as const };
          const nextOnHand = Number(locked.rows[0].stock_on_hand) + quantity;
          const reserved = Number(locked.rows[0].stock_reserved);
          if (!Number.isSafeInteger(nextOnHand) || nextOnHand < reserved) {
            return { kind: 'conflict' as const };
          }
          await client.query(
            'UPDATE mevo_products SET stock_on_hand = $1, updated_at = now() WHERE id = $2',
            [nextOnHand, productId],
          );
          const ledger = await client.query(
            `INSERT INTO mevo_inventory_movements (product_id, movement_type, quantity, reference, actor)
             VALUES ($1, 'adjustment', $2, $3, $4)
             RETURNING id, product_id, movement_type, quantity, reference, actor, created_at`,
            [productId, quantity, reference || null, identity.userId],
          );
          await client.query(
            `INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details)
             VALUES ($1, 'inventory.stock.adjusted', 'product', $2, $3::jsonb)`,
            [identity.userId, productId, JSON.stringify({ quantity, reference: reference || null, note: note || null, stockOnHand: nextOnHand, stockReserved: reserved })],
          );
          return { kind: 'ok' as const, movement: ledger.rows[0], stockOnHand: nextOnHand, stockReserved: reserved };
        });
        if (movement.kind === 'missing') {
          res.status(404).json({ success: false, error: 'Product not found.' });
          return;
        }
        if (movement.kind === 'conflict') {
          res.status(409).json({ success: false, error: 'Adjustment would reduce stock below currently reserved units.' });
          return;
        }
        res.status(201).json({ success: true, movement: movement.movement, stock: {
          onHand: movement.stockOnHand,
          reserved: movement.stockReserved,
          available: movement.stockOnHand - movement.stockReserved,
        } });
      } catch {
        res.status(503).json({ success: false, error: 'Inventory adjustment failed; no partial changes were committed.' });
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

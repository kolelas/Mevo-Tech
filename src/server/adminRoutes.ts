import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
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


  // A checked-out client keeps row updates, inventory movements and audit
  // events in the same atomic transaction.
  const runAdminTransaction = async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await (pool as Pool).connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const result = await work(client);
      await client.query('COMMIT');
      transactionOpen = false;
      return result;
    } catch (error) {
      if (transactionOpen) {
        try { await client.query('ROLLBACK'); } catch { /* retain the original error */ }
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
          const nextPrice = 'priceCents' in body ? Number(body.priceCents) : Number(current.rows[0].price_cents);
          const nextPromo = 'promotionalPriceCents' in body
            ? body.promotionalPriceCents === null ? null : Number(body.promotionalPriceCents)
            : current.rows[0].promotional_price_cents === null ? null : Number(current.rows[0].promotional_price_cents);
          if (nextPromo !== null && nextPromo > nextPrice) {
            const error = new Error('Promotional price cannot exceed the regular price.') as Error & { status?: number };
            error.status = 400;
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
            assignments.push(columns[key] + ' = $' + values.length);
          }
          assignments.push('updated_at = now()');
          values.push(productId);
          const result = await client.query(
            'UPDATE mevo_products SET ' + assignments.join(', ') + ' WHERE id = $' + values.length +
            ' RETURNING id, sku, slug, name, active, currency, price_cents, promotional_price_cents, stock_on_hand, stock_reserved, updated_at',
            values,
          );
          await client.query(
            "INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details) VALUES ($1, 'catalog.product.updated', 'product', $2, $3::jsonb)",
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
        const typed = error as { status?: number; code?: string; message?: string };
        if (typed.status === 400) {
          res.status(400).json({ success: false, error: typed.message });
        } else if (typed.code === '23505') {
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
        !Number.isSafeInteger(quantity) || quantity === 0 || Math.abs(quantity) > 100000 ||
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
          if (!Number.isSafeInteger(nextOnHand) || nextOnHand < reserved) return { kind: 'conflict' as const };

          await client.query(
            'UPDATE mevo_products SET stock_on_hand = $1, updated_at = now() WHERE id = $2',
            [nextOnHand, productId],
          );
          const ledger = await client.query(
            "INSERT INTO mevo_inventory_movements (product_id, movement_type, quantity, reference, actor) VALUES ($1, 'adjustment', $2, $3, $4) RETURNING id, product_id, movement_type, quantity, reference, actor, created_at",
            [productId, quantity, reference || null, identity.userId],
          );
          await client.query(
            "INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details) VALUES ($1, 'inventory.stock.adjusted', 'product', $2, $3::jsonb)",
            [identity.userId, productId, JSON.stringify({
              quantity,
              reference: reference || null,
              note: note || null,
              stockOnHand: nextOnHand,
              stockReserved: reserved,
            })],
          );
          return {
            kind: 'ok' as const,
            movement: ledger.rows[0],
            stockOnHand: nextOnHand,
            stockReserved: reserved,
          };
        });

        if (movement.kind === 'missing') {
          res.status(404).json({ success: false, error: 'Product not found.' });
          return;
        }
        if (movement.kind === 'conflict') {
          res.status(409).json({ success: false, error: 'Adjustment would reduce stock below currently reserved units.' });
          return;
        }
        res.status(201).json({
          success: true,
          movement: movement.movement,
          stock: {
            onHand: movement.stockOnHand,
            reserved: movement.stockReserved,
            available: movement.stockOnHand - movement.stockReserved,
          },
        });
      } catch {
        res.status(503).json({ success: false, error: 'Inventory adjustment failed; no partial changes were committed.' });
      }
    })();
  });


  router.get('/orders', requirePermission('orders.read'), (req, res) => {
    void (async () => {
      const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
      const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
      const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
      const allowedStatuses = new Set(['PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED']);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
          !Number.isInteger(offset) || offset < 0 || offset > 1_000_000 ||
          (req.query.status !== undefined && (!status || !allowedStatuses.has(status)))) {
        res.status(400).json({ success: false, error: 'Invalid order filters or pagination.' });
        return;
      }
      try {
        const result = await pool!.query(
          `SELECT id, reference, customer_id, customer_email, status, currency,
                  subtotal_cents, discount_cents, shipping_cents, tax_cents,
                  total_cents, shipment_carrier, tracking_number, created_at, updated_at, fulfilled_at
             FROM mevo_orders
            WHERE ($1::text IS NULL OR status = $1)
            ORDER BY created_at DESC, reference DESC
            LIMIT $2 OFFSET $3`,
          [status || null, limit, offset],
        );
        const count = await pool!.query(
          'SELECT COUNT(*)::bigint AS total FROM mevo_orders WHERE ($1::text IS NULL OR status = $1)',
          [status || null],
        );
        res.json({ success: true, source: 'postgresql', pagination: { limit, offset, total: Number(count.rows[0]?.total ?? 0) }, orders: result.rows });
      } catch {
        res.status(503).json({ success: false, error: 'The PostgreSQL order service is temporarily unavailable.' });
      }
    })();
  });

  router.patch('/orders/:reference/fulfilment', requirePermission('orders.fulfil'), (req, res) => {
    void (async () => {
      const reference = req.params.reference;
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const nextStatus = typeof body.status === 'string' ? body.status.toUpperCase() : '';
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const carrier = typeof body.carrier === 'string' ? body.carrier.trim() : '';
      const trackingNumber = typeof body.trackingNumber === 'string' ? body.trackingNumber.trim() : '';
      const allowedKeys = new Set(['status', 'note', 'carrier', 'trackingNumber']);
      if (!reference || reference.length > 128 ||
          Object.keys(body).some((key) => !allowedKeys.has(key)) ||
          !['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(nextStatus) ||
          (body.note !== undefined && (typeof body.note !== 'string' || note.length > 500)) ||
          (body.carrier !== undefined && (typeof body.carrier !== 'string' || carrier.length > 100)) ||
          (body.trackingNumber !== undefined && (typeof body.trackingNumber !== 'string' || trackingNumber.length > 150)) ||
          (nextStatus === 'SHIPPED' && (!carrier || !trackingNumber))) {
        res.status(400).json({ success: false, error: 'Invalid fulfilment update. Shipping requires a carrier and tracking number.' });
        return;
      }
      const transitions: Record<string, string> = {
        PAID: 'PROCESSING',
        PROCESSING: 'SHIPPED',
        SHIPPED: 'DELIVERED',
      };
      try {
        const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
        const updated = await runAdminTransaction(async (client) => {
          const locked = await client.query(
            'SELECT reference, status FROM mevo_orders WHERE reference = $1 FOR UPDATE',
            [reference],
          );
          if (!locked.rows[0]) return { kind: 'missing' as const };
          const currentStatus = String(locked.rows[0].status).toUpperCase();
          if (transitions[currentStatus] !== nextStatus) return { kind: 'conflict' as const, currentStatus };
          const result = await client.query(
            `UPDATE mevo_orders
                SET status = $1,
                    shipment_carrier = CASE WHEN $1 = 'SHIPPED' THEN $2 ELSE shipment_carrier END,
                    tracking_number = CASE WHEN $1 = 'SHIPPED' THEN $3 ELSE tracking_number END,
                    fulfilled_at = CASE WHEN $1 = 'DELIVERED' THEN now() ELSE fulfilled_at END,
                    updated_at = now()
              WHERE reference = $4
              RETURNING reference, status, shipment_carrier, tracking_number, updated_at, fulfilled_at`,
            [nextStatus, carrier || null, trackingNumber || null, reference],
          );
          const eventNote = note || ('Status changed from ' + currentStatus + ' to ' + nextStatus);
          await client.query(
            'INSERT INTO order_status_events (order_reference, status, note, actor) VALUES ($1, $2, $3, $4)',
            [reference, nextStatus, eventNote, identity.userId],
          );
          await client.query(
            "INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details) VALUES ($1, 'order.fulfilment.updated', 'order', $2, $3::jsonb)",
            [identity.userId, reference, JSON.stringify({ from: currentStatus, to: nextStatus, carrier: carrier || null, trackingNumber: trackingNumber || null })],
          );
          return { kind: 'ok' as const, order: result.rows[0] };
        });
        if (updated.kind === 'missing') {
          res.status(404).json({ success: false, error: 'Order not found.' });
          return;
        }
        if (updated.kind === 'conflict') {
          res.status(409).json({ success: false, error: 'Invalid order status transition from ' + updated.currentStatus + ' to ' + nextStatus + '.' });
          return;
        }
        res.json({ success: true, order: updated.order });
      } catch {
        res.status(503).json({ success: false, error: 'Fulfilment update failed; no partial changes were committed.' });
      }
    })();
  });

  router.get('/support/cases', requirePermission('customers.support'), (req, res) => {
    void (async () => {
      const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
      const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
      const statuses = new Set(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
          !Number.isInteger(offset) || offset < 0 || offset > 1_000_000 ||
          (req.query.status !== undefined && !statuses.has(status))) {
        res.status(400).json({ success: false, error: 'Invalid support case filters or pagination.' });
        return;
      }
      try {
        const result = await pool!.query(
          `SELECT id, customer_id, customer_email, order_reference, subject, message,
                  status, priority, assigned_to, resolution_note, created_at, updated_at, resolved_at
             FROM mevo_support_cases
            WHERE ($1::text IS NULL OR status = $1)
            ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                     created_at ASC
            LIMIT $2 OFFSET $3`,
          [status || null, limit, offset],
        );
        const count = await pool!.query(
          'SELECT COUNT(*)::bigint AS total FROM mevo_support_cases WHERE ($1::text IS NULL OR status = $1)',
          [status || null],
        );
        res.json({ success: true, source: 'postgresql', pagination: { limit, offset, total: Number(count.rows[0]?.total ?? 0) }, cases: result.rows });
      } catch {
        res.status(503).json({ success: false, error: 'The PostgreSQL support service is temporarily unavailable.' });
      }
    })();
  });

  router.post('/support/cases', requirePermission('customers.support'), (req, res) => {
    void (async () => {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const email = typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : '';
      const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const customerId = typeof body.customerId === 'string' && body.customerId.trim() ? body.customerId.trim() : null;
      const orderReference = typeof body.orderReference === 'string' && body.orderReference.trim() ? body.orderReference.trim() : null;
      const priority = body.priority === undefined ? 'normal' : body.priority;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 ||
          !subject || subject.length > 200 || !message || message.length > 5000 ||
          (customerId && customerId.length > 128) || (orderReference && orderReference.length > 128) ||
          !['low', 'normal', 'high'].includes(priority)) {
        res.status(400).json({ success: false, error: 'Valid customer email, subject, message, and priority are required.' });
        return;
      }
      try {
        const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
        const id = randomUUID();
        const created = await runAdminTransaction(async (client) => {
          const result = await client.query(
            `INSERT INTO mevo_support_cases (id, customer_id, customer_email, order_reference, subject, message, priority, assigned_to)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, customer_id, customer_email, order_reference, subject, message, status, priority, assigned_to, created_at`,
            [id, customerId, email, orderReference, subject, message, priority, identity.userId],
          );
          await client.query(
            "INSERT INTO mevo_support_case_events (case_id, actor, action, details) VALUES ($1, $2, 'case.created', $3::jsonb)",
            [id, identity.userId, JSON.stringify({ source: 'admin_manual_intake', priority })],
          );
          await client.query(
            "INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details) VALUES ($1, 'support.case.created', 'support_case', $2, $3::jsonb)",
            [identity.userId, id, JSON.stringify({ customerEmail: email, orderReference })],
          );
          return result.rows[0];
        });
        res.status(201).json({ success: true, supportCase: created });
      } catch {
        res.status(503).json({ success: false, error: 'Support case could not be created; no partial changes were committed.' });
      }
    })();
  });

  router.patch('/support/cases/:caseId', requirePermission('customers.support'), (req, res) => {
    void (async () => {
      const caseId = req.params.caseId;
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const allowed = new Set(['status', 'priority', 'assignedTo', 'resolutionNote']);
      const keys = Object.keys(body);
      const statuses = new Set(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']);
      const priorities = new Set(['low', 'normal', 'high']);
      if (!caseId || caseId.length > 128 || keys.length === 0 || keys.some((key) => !allowed.has(key)) ||
          ('status' in body && !statuses.has(body.status)) ||
          ('priority' in body && !priorities.has(body.priority)) ||
          ('assignedTo' in body && body.assignedTo !== null && (typeof body.assignedTo !== 'string' || !body.assignedTo.trim() || body.assignedTo.length > 256)) ||
          ('resolutionNote' in body && body.resolutionNote !== null && (typeof body.resolutionNote !== 'string' || body.resolutionNote.length > 2000))) {
        res.status(400).json({ success: false, error: 'Invalid support case update.' });
        return;
      }
      try {
        const identity = res.locals.adminIdentity as VerifiedAdminIdentity;
        const updated = await runAdminTransaction(async (client) => {
          const locked = await client.query('SELECT id, status FROM mevo_support_cases WHERE id = $1 FOR UPDATE', [caseId]);
          if (!locked.rows[0]) return null;
          if (typeof body.assignedTo === 'string') {
            const assignee = await client.query(
              'SELECT user_id FROM admin_roles WHERE user_id = $1 AND enabled = TRUE LIMIT 1',
              [body.assignedTo],
            );
            if (!assignee.rows[0]) {
              const error = new Error('The assigned administrator is not active.') as Error & { status?: number };
              error.status = 400;
              throw error;
            }
          }
          const columns: Record<string, string> = {
            status: 'status', priority: 'priority', assignedTo: 'assigned_to', resolutionNote: 'resolution_note',
          };
          const values: unknown[] = [];
          const assignments = keys.map((key) => {
            values.push(body[key]);
            return columns[key] + ' = $' + values.length;
          });
          assignments.push("updated_at = now()");
          if (body.status === 'resolved' || body.status === 'closed') assignments.push('resolved_at = COALESCE(resolved_at, now())');
          else if (body.status === 'open' || body.status === 'in_progress' || body.status === 'waiting_customer') assignments.push('resolved_at = NULL');
          values.push(caseId);
          const result = await client.query(
            'UPDATE mevo_support_cases SET ' + assignments.join(', ') + ' WHERE id = $' + values.length +
            ' RETURNING id, customer_email, order_reference, subject, status, priority, assigned_to, resolution_note, updated_at, resolved_at',
            values,
          );
          await client.query(
            "INSERT INTO mevo_support_case_events (case_id, actor, action, details) VALUES ($1, $2, 'case.updated', $3::jsonb)",
            [caseId, identity.userId, JSON.stringify({ changedFields: keys, changes: body })],
          );
          await client.query(
            "INSERT INTO mevo_audit_events (actor, action, target_type, target_id, details) VALUES ($1, 'support.case.updated', 'support_case', $2, $3::jsonb)",
            [identity.userId, caseId, JSON.stringify({ changedFields: keys })],
          );
          return result.rows[0];
        });
        if (!updated) {
          res.status(404).json({ success: false, error: 'Support case not found.' });
          return;
        }
        res.json({ success: true, supportCase: updated });
      } catch (error) {
        if ((error as { status?: number }).status === 400) {
          res.status(400).json({ success: false, error: (error as Error).message });
        } else {
          res.status(503).json({ success: false, error: 'Support case update failed; no partial changes were committed.' });
        }
      }
    })();
  });

  router.get('/audit/events', requirePermission('audit.read'), (req, res) => {
    void (async () => {
      const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
      const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
      const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
          !Number.isInteger(offset) || offset < 0 || offset > 1_000_000 ||
          (req.query.action !== undefined && (!action || action.length > 120))) {
        res.status(400).json({ success: false, error: 'Invalid audit log filters or pagination.' });
        return;
      }
      try {
        const result = await pool!.query(
          `SELECT id, actor, action, target_type, target_id, details, created_at
             FROM mevo_audit_events
            WHERE ($1::text IS NULL OR action = $1)
            ORDER BY created_at DESC, id DESC
            LIMIT $2 OFFSET $3`,
          [action || null, limit, offset],
        );
        const count = await pool!.query(
          'SELECT COUNT(*)::bigint AS total FROM mevo_audit_events WHERE ($1::text IS NULL OR action = $1)',
          [action || null],
        );
        res.json({ success: true, source: 'postgresql', pagination: { limit, offset, total: Number(count.rows[0]?.total ?? 0) }, events: result.rows });
      } catch {
        res.status(503).json({ success: false, error: 'The PostgreSQL audit log is temporarily unavailable.' });
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
      'audit.read',
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

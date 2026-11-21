import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { Pool } from 'pg';
import { createAdminRouter } from './adminRoutes';
import type { VerifiedAdminIdentity } from './adminAuthorization';

const identity: VerifiedAdminIdentity = {
  userId: 'firebase-owner-1',
  email: 'owner@example.com',
  emailVerified: true,
};

async function withServer(router: ReturnType<typeof createAdminRouter>, run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/admin', router);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
}

test('admin routes reject missing database configuration before token verification', async () => {
  let verifyCalls = 0;
  const router = createAdminRouter(null, async () => { verifyCalls++; return identity; });
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/session`, { headers: { Authorization: 'Bearer valid' } });
    assert.equal(response.status, 503);
    assert.equal(verifyCalls, 0);
  });
});

test('admin routes reject absent, invalid, and unregistered identities', async () => {
  const pool = {
    query: async () => ({ rows: [] }),
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async (token) => token === 'valid' ? identity : null);
  await withServer(router, async (base) => {
    const missing = await fetch(`${base}/admin/session`);
    assert.equal(missing.status, 401);
    const invalid = await fetch(`${base}/admin/session`, { headers: { Authorization: 'Bearer forged' } });
    assert.equal(invalid.status, 401);
    const unregistered = await fetch(`${base}/admin/session`, { headers: { Authorization: 'Bearer valid' } });
    assert.equal(unregistered.status, 403);
  });
});

test('admin role assignment endpoint requires owner role and writes verified actor identity', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const pool = {
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'owner' }] };
      queries.push({ sql, values });
      return { rows: [] };
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/roles`, {
      method: 'POST',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'staff-2', email: 'staff@example.com', role: 'inventory_manager' }),
    });
    assert.equal(response.status, 201);
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /ON CONFLICT \(user_id\) DO UPDATE/);
    assert.deepEqual(queries[0].values, ['staff-2', 'staff@example.com', 'inventory_manager', 'firebase-owner-1']);
  });
});

test('non-owner administrators cannot grant roles', async () => {
  const pool = {
    query: async () => ({ rows: [{ role: 'admin' }] }),
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/roles`, {
      method: 'POST',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'staff-2', email: 'staff@example.com', role: 'admin' }),
    });
    assert.equal(response.status, 403);
  });
});

test('admin role assignment validates input before database writes', async () => {
  let writeCount = 0;
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'owner' }] };
      writeCount++;
      return { rows: [] };
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/roles`, {
      method: 'POST',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'staff-2', email: 'not-an-email', role: 'super_admin' }),
    });
    assert.equal(response.status, 400);
    assert.equal(writeCount, 0);
  });
});


test('owner role revocation maps the database last-owner guard to conflict', async () => {
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'owner' }] };
      const error = new Error('last enabled owner') as Error & { code: string };
      error.code = '23514';
      throw error;
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/roles/sole-owner`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /last enabled owner/i);
  });
});

test('owner role revocation disables an enabled account with a parameterized query', async () => {
  let updateValues: unknown[] = [];
  const pool = {
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'owner' }] };
      assert.match(sql, /WHERE user_id = \$1 AND enabled = TRUE/);
      updateValues = values;
      return { rows: [{ user_id: 'staff-3' }] };
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/roles/staff-3`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(updateValues, ['staff-3']);
  });
});


test('catalogue read is permission-checked and uses bounded PostgreSQL pagination', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const pool = {
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'customer_support' }] };
      queries.push({ sql, values });
      if (sql.includes('COUNT(*)')) return { rows: [{ total: '1' }] };
      return { rows: [{ id: 'p-1', sku: 'SKU-1', name: 'Keyboard' }] };
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/catalog/products?search=Key&limit=10&offset=5`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, 'postgresql');
    assert.equal(body.pagination.total, 1);
    assert.equal(body.products[0].sku, 'SKU-1');
    assert.equal(queries.length, 2);
    assert.deepEqual(queries[0].values, ['%Key%', 10, 5]);
    assert.match(queries[0].sql, /FROM mevo_products/);
  });
});

test('catalogue read rejects invalid pagination and inventory access denies unsupported roles', async () => {
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'customer_support' }] };
      throw new Error('unexpected data query');
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const invalid = await fetch(`${base}/admin/catalog/products?limit=1000`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(invalid.status, 400);
    const denied = await fetch(`${base}/admin/inventory/summary`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(denied.status, 403);
  });
});

test('inventory manager can read PostgreSQL inventory summary and movement ledger', async () => {
  const statements: string[] = [];
  const pool = {
    query: async (sql: string) => {
      if (sql.includes('SELECT role')) return { rows: [{ role: 'inventory_manager' }] };
      statements.push(sql);
      if (sql.includes('SUM(stock_on_hand)')) return { rows: [{ product_count: '4', units_available: '12' }] };
      return { rows: [{ product_id: 'p-1', quantity: 3 }] };
    },
  } as unknown as Pick<Pool, 'query'>;
  const router = createAdminRouter(pool, async () => identity);
  await withServer(router, async (base) => {
    const headers = { Authorization: 'Bearer verified' };
    const summary = await fetch(`${base}/admin/inventory/summary`, { headers });
    assert.equal(summary.status, 200);
    assert.equal((await summary.json()).inventory.units_available, '12');
    const movements = await fetch(`${base}/admin/inventory/movements?productId=p-1&limit=20`, { headers });
    assert.equal(movements.status, 200);
    assert.equal((await movements.json()).movements[0].quantity, 3);
    assert.equal(statements.length, 2);
    assert.ok(statements.every((sql) => sql.includes('mevo_inventory_movements') || sql.includes('FROM mevo_products')));
  });
});


function makeTransactionalPool(role: string, clientQuery: (sql: string, values: unknown[]) => Promise<{ rows: unknown[] }>) {
  const transactionStatements: string[] = [];
  const client = {
    query: async (sql: string, values: unknown[] = []) => {
      transactionStatements.push(sql);
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
      return clientQuery(sql, values);
    },
    release: () => undefined,
  };
  const pool = {
    query: async (sql: string) => sql.includes('SELECT role') ? { rows: [{ role }] } : { rows: [] },
    connect: async () => client,
  };
  return { pool: pool as unknown as Pick<Pool, 'query'>, transactionStatements };
}

test('inventory adjustment locks stock and commits product, movement, and audit together', async () => {
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  const fake = makeTransactionalPool('inventory_manager', async (sql, values) => {
    if (sql.startsWith('SELECT id, stock_on_hand')) return { rows: [{ id: 'p-1', stock_on_hand: 10, stock_reserved: 3 }] };
    writes.push({ sql, values });
    if (sql.includes('INSERT INTO mevo_inventory_movements')) {
      return { rows: [{ id: 9, product_id: 'p-1', quantity: 5 }] };
    }
    return { rows: [] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/inventory/adjustments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'p-1', quantity: 5, reference: 'GRN-22', note: 'Received shipment' }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.deepEqual(body.stock, { onHand: 15, reserved: 3, available: 12 });
    assert.equal(writes.length, 3);
    assert.ok(fake.transactionStatements.includes('BEGIN'));
    assert.ok(fake.transactionStatements.includes('COMMIT'));
    assert.ok(writes.some((entry) => entry.sql.includes('INSERT INTO mevo_inventory_movements')));
    assert.ok(writes.some((entry) => entry.sql.includes('INSERT INTO mevo_audit_events')));
  });
});

test('inventory adjustment refuses to undercut reserved stock without writing ledger rows', async () => {
  const fake = makeTransactionalPool('inventory_manager', async (sql) => {
    if (sql.startsWith('SELECT id, stock_on_hand')) return { rows: [{ id: 'p-1', stock_on_hand: 8, stock_reserved: 5 }] };
    throw new Error('No write should occur');
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/inventory/adjustments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'p-1', quantity: -4 }),
    });
    assert.equal(response.status, 409);
    assert.ok(fake.transactionStatements.includes('COMMIT'));
    assert.ok(!fake.transactionStatements.some((sql) => sql.startsWith('UPDATE mevo_products')));
  });
});

test('catalogue edit is transactional, allowlisted, and audit logged', async () => {
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  const fake = makeTransactionalPool('admin', async (sql, values) => {
    if (sql.startsWith('SELECT id, price_cents')) {
      return { rows: [{ id: 'p-1', price_cents: 10000, promotional_price_cents: 9000 }] };
    }
    writes.push({ sql, values });
    if (sql.startsWith('UPDATE mevo_products')) {
      return { rows: [{ id: 'p-1', name: 'Updated keyboard', price_cents: 11000 }] };
    }
    return { rows: [] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/catalog/products/p-1`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated keyboard', priceCents: 11000 }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).product.name, 'Updated keyboard');
    assert.equal(writes.length, 2);
    assert.match(writes[0].sql, /UPDATE mevo_products SET name = \$1, price_cents = \$2/);
    assert.ok(writes.some((entry) => entry.sql.includes('INSERT INTO mevo_audit_events')));
    assert.ok(fake.transactionStatements.includes('COMMIT'));
  });
});

test('catalogue edit rejects unknown fields and invalid promotional pricing', async () => {
  const fake = makeTransactionalPool('admin', async (sql) => {
    if (sql.startsWith('SELECT id, price_cents')) {
      return { rows: [{ id: 'p-1', price_cents: 10000, promotional_price_cents: null }] };
    }
    throw new Error('No write expected');
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const unknown = await fetch(`${base}/admin/catalog/products/p-1`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 1 }),
    });
    assert.equal(unknown.status, 400);
    const invalidPromo = await fetch(`${base}/admin/catalog/products/p-1`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ promotionalPriceCents: 12000 }),
    });
    assert.equal(invalidPromo.status, 400);
    assert.ok(fake.transactionStatements.filter((sql) => sql === 'BEGIN').length >= 1);
  });
});

test('customer support cannot perform catalogue or inventory writes', async () => {
  const fake = makeTransactionalPool('customer_support', async () => { throw new Error('No transaction expected'); });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
    const catalog = await fetch(`${base}/admin/catalog/products/p-1`, {
      method: 'PATCH', headers, body: JSON.stringify({ active: false }),
    });
    const inventory = await fetch(`${base}/admin/inventory/adjustments`, {
      method: 'POST', headers, body: JSON.stringify({ productId: 'p-1', quantity: 2 }),
    });
    assert.equal(catalog.status, 403);
    assert.equal(inventory.status, 403);
  });
});


test('fulfilment manager can advance paid order to processing with event and audit transaction', async () => {
  const writes: string[] = [];
  const fake = makeTransactionalPool('fulfilment_manager', async (sql) => {
    if (sql.startsWith('SELECT reference, status')) return { rows: [{ reference: 'MT-100', status: 'PAID' }] };
    writes.push(sql);
    if (sql.startsWith('UPDATE mevo_orders')) return { rows: [{ reference: 'MT-100', status: 'PROCESSING' }] };
    return { rows: [] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/orders/MT-100/fulfilment`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PROCESSING', note: 'Picked and packed' }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).order.status, 'PROCESSING');
    assert.ok(writes.some((sql) => sql.includes('INSERT INTO order_status_events')));
    assert.ok(writes.some((sql) => sql.includes('INSERT INTO mevo_audit_events')));
    assert.ok(fake.transactionStatements.includes('COMMIT'));
  });
});

test('fulfilment rejects skipped order states and shipping without tracking', async () => {
  const fake = makeTransactionalPool('fulfilment_manager', async (sql) => {
    if (sql.startsWith('SELECT reference, status')) return { rows: [{ reference: 'MT-101', status: 'PAID' }] };
    throw new Error('No write expected');
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
    const skipped = await fetch(`${base}/admin/orders/MT-101/fulfilment`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'SHIPPED', carrier: 'Courier' }),
    });
    assert.equal(skipped.status, 400);
    const wrongTransition = await fetch(`${base}/admin/orders/MT-101/fulfilment`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'DELIVERED' }),
    });
    assert.equal(wrongTransition.status, 409);
    assert.ok(!fake.transactionStatements.some((sql) => sql.startsWith('UPDATE mevo_orders')));
  });
});

test('customer support can create and update a support case with audit history', async () => {
  const writes: string[] = [];
  const fake = makeTransactionalPool('customer_support', async (sql) => {
    writes.push(sql);
    if (sql.startsWith('INSERT INTO mevo_support_cases')) {
      return { rows: [{ id: 'case-1', status: 'open', subject: 'Order enquiry' }] };
    }
    if (sql.startsWith('SELECT id, status FROM mevo_support_cases')) {
      return { rows: [{ id: 'case-1', status: 'open' }] };
    }
    if (sql.startsWith('UPDATE mevo_support_cases')) {
      return { rows: [{ id: 'case-1', status: 'resolved', subject: 'Order enquiry' }] };
    }
    return { rows: [] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const headers = { Authorization: 'Bearer verified', 'Content-Type': 'application/json' };
    const created = await fetch(`${base}/admin/support/cases`, {
      method: 'POST', headers,
      body: JSON.stringify({ customerEmail: 'customer@example.com', subject: 'Order enquiry', message: 'Please check delivery.' }),
    });
    assert.equal(created.status, 201);
    const updated = await fetch(`${base}/admin/support/cases/case-1`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ status: 'resolved', resolutionNote: 'Tracking sent to customer.' }),
    });
    assert.equal(updated.status, 200);
    assert.ok(writes.some((sql) => sql.includes('INSERT INTO mevo_support_case_events')));
    assert.ok(writes.some((sql) => sql.includes('INSERT INTO mevo_audit_events')));
    assert.ok(fake.transactionStatements.filter((sql) => sql === 'COMMIT').length >= 2);
  });
});

test('audit log access is restricted to owner and administrator roles', async () => {
  const supportFake = makeTransactionalPool('customer_support', async () => { throw new Error('No query expected'); });
  const supportRouter = createAdminRouter(supportFake.pool, async () => identity);
  await withServer(supportRouter, async (base) => {
    const denied = await fetch(`${base}/admin/audit/events`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(denied.status, 403);
  });

  const adminFake = makeTransactionalPool('admin', async (sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: '0' }] };
    return { rows: [] };
  });
  const adminRouter = createAdminRouter(adminFake.pool, async () => identity);
  await withServer(adminRouter, async (base) => {
    const allowed = await fetch(`${base}/admin/audit/events?limit=10`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.equal(body.source, 'postgresql');
    assert.equal(body.events.length, 0);
  });
});

test('order listing is PostgreSQL-backed and bounded', async () => {
  const fake = makeTransactionalPool('fulfilment_manager', async (sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: '1' }] };
    return { rows: [{ reference: 'MT-200', status: 'PAID' }] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/orders?status=PAID&limit=10`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.orders[0].reference, 'MT-200');
    const invalid = await fetch(`${base}/admin/orders?limit=1000`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(invalid.status, 400);
  });
});


test('support case assignment rejects inactive administrators', async () => {
  const fake = makeTransactionalPool('customer_support', async (sql) => {
    if (sql.startsWith('SELECT id, status FROM mevo_support_cases')) return { rows: [{ id: 'case-2', status: 'open' }] };
    if (sql.includes('FROM admin_roles')) return { rows: [] };
    throw new Error('No case update should occur');
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/support/cases/case-2`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer verified', 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: 'disabled-admin' }),
    });
    assert.equal(response.status, 400);
    assert.ok(!fake.transactionStatements.some((sql) => sql.startsWith('UPDATE mevo_support_cases')));
  });
});


test('customer support can read bounded customer directory and customer support role is not given payment access', async () => {
  const fake = makeTransactionalPool('customer_support', async (sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: '1' }] };
    return { rows: [{ id: 'c-1', email: 'customer@example.com', status: 'active' }] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const headers = { Authorization: 'Bearer verified' };
    const customers = await fetch(`${base}/admin/customers?search=customer&limit=10`, { headers });
    assert.equal(customers.status, 200);
    assert.equal((await customers.json()).customers[0].id, 'c-1');
    const payments = await fetch(`${base}/admin/payments/attempts`, { headers });
    assert.equal(payments.status, 403);
  });
});

test('administrator can read payment attempts without exposing payment secrets', async () => {
  const fake = makeTransactionalPool('admin', async (sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: '1' }] };
    return { rows: [{
      id: 'pay-1',
      order_id: 'o-1',
      order_reference: 'MT-300',
      provider: 'payfast',
      status: 'succeeded',
      amount_cents: 25000,
      currency: 'ZAR',
    }] };
  });
  const router = createAdminRouter(fake.pool, async () => identity);
  await withServer(router, async (base) => {
    const response = await fetch(`${base}/admin/payments/attempts?limit=10`, {
      headers: { Authorization: 'Bearer verified' },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.attempts[0].order_reference, 'MT-300');
    assert.equal(body.attempts[0].amount_cents, 25000);
    assert.equal('secret' in body.attempts[0], false);
  });
});

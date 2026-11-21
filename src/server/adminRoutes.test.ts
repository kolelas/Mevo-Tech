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

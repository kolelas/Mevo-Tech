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
    server.close();
    await once(server, 'close');
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

import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import {
  authorizeAdminPermission,
  hasAdminPermission,
  resolveAdminRole,
  type VerifiedAdminIdentity,
} from './adminAuthorization';
import { createPostgresPool, getPostgresConfig } from './postgres';

const verifiedIdentity: VerifiedAdminIdentity = {
  userId: 'firebase-user-123',
  email: 'OPS@MEVOTECH.CO.ZA',
  emailVerified: true,
};

test('admin role lookup requires verified identity and uses parameterized matching', async () => {
  let queryCalled = false;
  const fakePool = {
    query: async (sql: string, values: unknown[]) => {
      queryCalled = true;
      assert.match(sql, /user_id = \$1/);
      assert.match(sql, /lower\(email\) = \$2/);
      assert.deepEqual(values, ['firebase-user-123', 'ops@mevotech.co.za']);
      return { rows: [{ role: 'inventory_manager' }] };
    },
  } as unknown as Pick<Pool, 'query'>;

  assert.equal(await resolveAdminRole(fakePool, verifiedIdentity), 'inventory_manager');
  assert.equal(queryCalled, true);
});

test('admin role lookup fails closed for unverified or incomplete identities', async () => {
  let queryCount = 0;
  const fakePool = {
    query: async () => {
      queryCount++;
      return { rows: [{ role: 'owner' }] };
    },
  } as unknown as Pick<Pool, 'query'>;

  assert.equal(await resolveAdminRole(fakePool, { ...verifiedIdentity, emailVerified: false }), null);
  assert.equal(await resolveAdminRole(fakePool, { ...verifiedIdentity, userId: ' ' }), null);
  assert.equal(await resolveAdminRole(fakePool, { ...verifiedIdentity, email: '' }), null);
  assert.equal(queryCount, 0);
});

test('admin role lookup fails closed when the role store errors or returns an unknown role', async () => {
  const failingPool = {
    query: async () => { throw new Error('database unavailable'); },
  } as unknown as Pick<Pool, 'query'>;
  const unknownRolePool = {
    query: async () => ({ rows: [{ role: 'super_admin' }] }),
  } as unknown as Pick<Pool, 'query'>;

  assert.equal(await resolveAdminRole(failingPool, verifiedIdentity), null);
  assert.equal(await resolveAdminRole(unknownRolePool, verifiedIdentity), null);
});

test('role permission matrix enforces least privilege', () => {
  assert.equal(hasAdminPermission('owner', 'admin.roles.manage'), true);
  assert.equal(hasAdminPermission('admin', 'admin.roles.manage'), false);
  assert.equal(hasAdminPermission('inventory_manager', 'inventory.write'), true);
  assert.equal(hasAdminPermission('inventory_manager', 'orders.fulfil'), false);
  assert.equal(hasAdminPermission('fulfilment_manager', 'orders.fulfil'), true);
  assert.equal(hasAdminPermission('fulfilment_manager', 'customers.read'), false);
  assert.equal(hasAdminPermission('customer_support', 'customers.support'), true);
  assert.equal(hasAdminPermission('customer_support', 'inventory.write'), false);
  assert.equal(hasAdminPermission(null, 'catalog.read'), false);
});

test('PostgreSQL role registry resolves enabled roles and rejects mismatched identities', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const config = getPostgresConfig({ ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL });
  assert.ok(config);
  const pool = createPostgresPool(config);
  const userId = `ci-admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${userId}@example.invalid`;

  try {
    await pool.query(
      `INSERT INTO admin_roles (user_id, email, role, enabled, granted_by)
       VALUES ($1, $2, 'inventory_manager', TRUE, 'ci-test')`,
      [userId, email],
    );

    const identity = { userId, email, emailVerified: true };
    assert.equal(await resolveAdminRole(pool, identity), 'inventory_manager');
    assert.equal(await authorizeAdminPermission(pool, identity, 'inventory.write'), true);
    assert.equal(await authorizeAdminPermission(pool, identity, 'orders.fulfil'), false);
    assert.equal(await resolveAdminRole(pool, { ...identity, email: 'other@example.invalid' }), null);

    await pool.query('UPDATE admin_roles SET enabled = FALSE WHERE user_id = $1', [userId]);
    assert.equal(await resolveAdminRole(pool, identity), null);
  } finally {
    await pool.query('DELETE FROM admin_roles WHERE user_id = $1', [userId]);
    await pool.end();
  }
});

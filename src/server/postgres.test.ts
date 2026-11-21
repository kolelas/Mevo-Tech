import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPostgresPool, getPostgresConfig, checkPostgresConnection, withPostgresTransaction } from './postgres';

test('PostgreSQL configuration rejects invalid URLs and unsafe production TLS', () => {
  assert.throws(() => getPostgresConfig({ DATABASE_URL: 'https://example.test' } as NodeJS.ProcessEnv), /postgres/);
  assert.throws(() => getPostgresConfig({
    DATABASE_URL: 'postgres://user:pass@localhost/db',
    NODE_ENV: 'production',
    PGSSL_REJECT_UNAUTHORIZED: 'false',
  } as NodeJS.ProcessEnv), /TLS certificate verification/);
  assert.equal(getPostgresConfig({} as NodeJS.ProcessEnv), null);
});

test('PostgreSQL pool connects and transaction helper commits and rolls back', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const config = getPostgresConfig({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    PGSSLMODE: 'disable',
    NODE_ENV: 'test',
  } as NodeJS.ProcessEnv);
  assert.ok(config);

  const pool = createPostgresPool(config);
  const committedId = randomUUID();
  const rolledBackId = randomUUID();

  try {
    assert.equal(await checkPostgresConnection(pool), true);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mevo_transaction_probe (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await withPostgresTransaction(pool, async (client) => {
      await client.query('INSERT INTO mevo_transaction_probe (id) VALUES ($1)', [committedId]);
    });

    await assert.rejects(
      withPostgresTransaction(pool, async (client) => {
        await client.query('INSERT INTO mevo_transaction_probe (id) VALUES ($1)', [rolledBackId]);
        throw new Error('intentional rollback probe');
      }),
      /intentional rollback probe/,
    );

    const result = await pool.query(
      'SELECT id FROM mevo_transaction_probe WHERE id = ANY($1::uuid[])',
      [[committedId, rolledBackId]],
    );
    assert.deepEqual(result.rows.map((row: { id: string }) => row.id), [committedId]);
  } finally {
    await pool.query('DELETE FROM mevo_transaction_probe WHERE id = ANY($1::uuid[])', [[committedId, rolledBackId]]);
    await pool.end();
  }
});

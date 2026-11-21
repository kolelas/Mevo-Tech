import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface PostgresConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: false | { rejectUnauthorized: boolean };
}

export function getPostgresConfig(env: NodeJS.ProcessEnv = process.env): PostgresConfig | null {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the postgres:// or postgresql:// protocol.');
  }

  const rejectUnauthorized = env.PGSSL_REJECT_UNAUTHORIZED !== 'false';
  if (env.NODE_ENV === 'production' && !rejectUnauthorized) {
    throw new Error('TLS certificate verification cannot be disabled in production.');
  }

  const sslMode = env.PGSSLMODE?.toLowerCase();
  const ssl = sslMode === 'disable'
    ? false
    : (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full')
      ? { rejectUnauthorized }
      : undefined;

  return {
    connectionString,
    maxConnections: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...(ssl !== undefined ? { ssl } : {}),
  };
}

export function createPostgresPool(config: PostgresConfig): Pool {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5_000,
    ...(config.ssl !== undefined ? { ssl: config.ssl } : {}),
    application_name: 'mevo-tech-api',
  });

  // Pool-level errors occur on idle clients; log a generic message without
  // connection strings, credentials, query parameters, or customer data.
  pool.on('error', () => {
    console.error('[database] An idle PostgreSQL connection encountered an error.');
  });

  return pool;
}

export async function withPostgresTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
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
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original transaction error; the connection is released below.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function checkPostgresConnection(pool: Pool): Promise<boolean> {
  const result: QueryResult<QueryResultRow> = await pool.query('SELECT 1 AS ready');
  return result.rows[0]?.ready === 1;
}

import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool;

export const initPool = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;
  const host = process.env.DB_HOST || 'localhost';
  const isNeon = host.includes('neon.tech');
  const endpointId = isNeon ? host.split('.')[0] : undefined;

  if (connectionString) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    console.log('DB pool created via DATABASE_URL');
  } else {
    pool = new Pool({
      host,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'fleet_telematics',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ...(isNeon && endpointId ? { options: `endpoint=${endpointId}` } : {}),
    });
    console.log(`DB pool created → ${host}`);
  }

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });
};

const getPool = (): Pool => {
  if (!pool) throw new Error('DB pool not initialized — call initPool() first');
  return pool;
};

export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  const res = await getPool().query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('DB query:', { text: text.slice(0, 80), duration, rows: res.rowCount });
  }
  return res;
};

export const getClient = (): Promise<PoolClient> => getPool().connect();

export const transaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const testConnection = async (): Promise<void> => {
  const client = await getPool().connect();
  try {
    await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');
  } finally {
    client.release();
  }
};

export default { query, getClient, transaction, testConnection, initPool };

import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: join(__dirname, '../../.env') });

const run = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const isNeon = host.includes('neon.tech');
  const endpointId = isNeon ? host.split('.')[0] : undefined;

  const pool = new Pool({
    host,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'fleet_telematics',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
    ...(isNeon && endpointId ? { options: `endpoint=${endpointId}` } : {}),
  });

  const client = await pool.connect();
  try {
    const migrationsDir = join(__dirname, '../../migrations');
    const migrationFile = join(migrationsDir, '001_init.sql');
    const sql = readFileSync(migrationFile, 'utf-8');

    console.log('🔄 Running migration: 001_init.sql ...');
    await client.query(sql);
    console.log('✅ Migration complete. Database schema is ready.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();

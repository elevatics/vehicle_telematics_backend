import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';

dotenv.config({ path: join(__dirname, '../../.env') });

const host = process.env.DB_HOST || 'localhost';
const isNeon = host.includes('neon.tech');
const endpointId = isNeon ? host.split('.')[0] : undefined;

const pool = new Pool({
  host,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  ...(isNeon && endpointId ? { options: `endpoint=${endpointId}` } : {}),
});

const run = async () => {
  const password = 'Admin1234!';
  const hash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO profiles (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, email, role`,
      ['admin@fleettelematics.com', hash, 'Fleet Administrator', 'fleet_manager']
    );
    console.log('✅ Admin account ready:', res.rows[0]);
    console.log('📧 Email:    admin@fleettelematics.com');
    console.log('🔑 Password: Admin1234!');
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});

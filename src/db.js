import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });
} else {
  console.warn('⚠️ DATABASE_URL environment variable is not set. Database operations will use local fallback mode.');
}

/**
 * Helper to query PostgreSQL pool
 */
export async function query(text, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. Please set DATABASE_URL in .env');
  }
  return pool.query(text, params);
}

/**
 * Initialize database schema by running schema.sql
 */
export async function initDbSchema() {
  if (!pool) return false;
  
  try {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('✅ PostgreSQL database schema verified & initialized.');
      return true;
    }
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err.message);
    throw err;
  }
}

export default {
  query,
  initDbSchema,
  get pool() {
    return pool;
  }
};

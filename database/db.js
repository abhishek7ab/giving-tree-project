require('dotenv').config();
const { Pool } = require('pg');

const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/giving_tree_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
};

if (process.env.DATABASE_URL) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

module.exports = pool;

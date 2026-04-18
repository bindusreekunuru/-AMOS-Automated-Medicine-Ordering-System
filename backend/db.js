const { Pool } = require("pg");
require("dotenv").config();

// Build pool config: prefer explicit env vars, fall back to connection string
const poolConfig = process.env.PGHOST
  ? {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "postgres",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false }
    }
  : {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool(poolConfig);
    pool.on('error', (err) => {
      console.error('Unexpected error on idle pg client:', err.message);
    });
  }
  return pool;
}

// initDb remains defined but is not called automatically to prevent cold-start timeouts.

module.exports = {
  query: (text, params) => getPool().query(text, params),
  pool: {
    query: (text, params) => getPool().query(text, params)
  }
};

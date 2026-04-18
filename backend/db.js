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

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client:', err.message);
  // Do NOT process.exit(-1) in serverless environments
});

async function initDb() {
  try {
    // ── Users table ──────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                SERIAL PRIMARY KEY,
        username          VARCHAR(255) NOT NULL UNIQUE,
        full_name         VARCHAR(255) NOT NULL,
        email             VARCHAR(255) NOT NULL UNIQUE,
        phone             VARCHAR(20) NOT NULL,
        password_hash     VARCHAR(255) NOT NULL,
        age               INTEGER DEFAULT NULL,
        gender            VARCHAR(50) DEFAULT 'Male',
        city              VARCHAR(255) DEFAULT '',
        address           TEXT DEFAULT '',
        blood_group       VARCHAR(10) DEFAULT '',
        allergies         TEXT DEFAULT '',
        conditions        TEXT DEFAULT '',
        emergency_name    VARCHAR(255) DEFAULT '',
        emergency_relation VARCHAR(255) DEFAULT '',
        emergency_phone   VARCHAR(20) DEFAULT '',
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Medicines table ──────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        medicine_name   VARCHAR(255) NOT NULL,
        dosage_per_day  INTEGER NOT NULL DEFAULT 1,
        tablets_qty     INTEGER NOT NULL DEFAULT 0,
        reorder_level   INTEGER NOT NULL DEFAULT 10,
        notes           TEXT DEFAULT '',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Orders table ─────────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_ref       VARCHAR(255) NOT NULL,
        medicine_name   VARCHAR(255) NOT NULL,
        qty             INTEGER NOT NULL DEFAULT 1,
        pharmacy        VARCHAR(255) DEFAULT '',
        status          VARCHAR(50) NOT NULL DEFAULT 'Pending',
        price           NUMERIC DEFAULT 0,
        order_date      VARCHAR(10) NOT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Prescriptions table ─────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name       VARCHAR(255) NOT NULL,
        file_path       TEXT NOT NULL,
        uploaded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Reminders table ─────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        medicine_name VARCHAR(255) NOT NULL,
        date        VARCHAR(10) NOT NULL,
        time        VARCHAR(5) NOT NULL,
        frequency   VARCHAR(50) NOT NULL DEFAULT 'Daily',
        note        TEXT DEFAULT '',
        done        INTEGER NOT NULL DEFAULT 0,
        notified    INTEGER NOT NULL DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── FCM device tokens table ─────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("PostgreSQL Database initialized successfully.");
  } catch (error) {
    console.error("Error initializing database schema:", error.message);
    console.error("Check your DATABASE_URL or environment variables.");
  }
}

// In serverless, we don't want to run schema init on every cold start
// initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};

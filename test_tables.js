const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

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

async function checkTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables in database:", res.rows.map(r => r.table_name));
    
    if (res.rows.length === 0) {
      console.log("No tables found! Database might be empty.");
    }
  } catch (err) {
    console.error("Error checking tables:", err.message);
  } finally {
    await pool.end();
  }
}

checkTables();

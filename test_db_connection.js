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

console.log("Attempting to connect with config:", { ...poolConfig, password: "***" });

const pool = new Pool(poolConfig);

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Connection error:", err.message);
    process.exit(1);
  } else {
    console.log("Connection successful! Server time:", res.rows[0].now);
    pool.end();
    process.exit(0);
  }
});

const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "amos.db"));

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ── Users table ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    username          TEXT    NOT NULL UNIQUE,
    full_name         TEXT    NOT NULL,
    email             TEXT    NOT NULL UNIQUE,
    phone             TEXT    NOT NULL,
    password_hash     TEXT    NOT NULL,
    age               INTEGER DEFAULT NULL,
    gender            TEXT    DEFAULT 'Male',
    city              TEXT    DEFAULT '',
    address           TEXT    DEFAULT '',
    blood_group       TEXT    DEFAULT '',
    allergies         TEXT    DEFAULT '',
    conditions        TEXT    DEFAULT '',
    emergency_name    TEXT    DEFAULT '',
    emergency_relation TEXT   DEFAULT '',
    emergency_phone   TEXT    DEFAULT '',
    created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Medicines table ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS medicines (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    medicine_name   TEXT    NOT NULL,
    dosage_per_day  INTEGER NOT NULL DEFAULT 1,
    tablets_qty     INTEGER NOT NULL DEFAULT 0,
    reorder_level   INTEGER NOT NULL DEFAULT 10,
    notes           TEXT    DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ── Orders table ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    order_ref       TEXT    NOT NULL,
    medicine_name   TEXT    NOT NULL,
    qty             INTEGER NOT NULL DEFAULT 1,
    pharmacy        TEXT    DEFAULT '',
    status          TEXT    NOT NULL DEFAULT 'Pending',
    price           REAL    DEFAULT 0,
    order_date      TEXT    NOT NULL DEFAULT (date('now')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ── Prescriptions table ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS prescriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    file_name       TEXT    NOT NULL,
    file_path       TEXT    NOT NULL,
    uploaded_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ── Reminders table ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    medicine_name TEXT  NOT NULL,
    date        TEXT    NOT NULL,
    time        TEXT    NOT NULL,
    frequency   TEXT    NOT NULL DEFAULT 'Daily',
    note        TEXT    DEFAULT '',
    done        INTEGER NOT NULL DEFAULT 0,
    notified    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ── FCM device tokens table ─────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS device_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;

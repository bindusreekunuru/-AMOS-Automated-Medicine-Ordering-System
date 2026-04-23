-- schema.sql
-- Run this in your Supabase SQL Editor to create the necessary tables.

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    age INTEGER,
    gender TEXT DEFAULT 'Male',
    city TEXT DEFAULT '',
    address TEXT DEFAULT '',
    blood_group TEXT,
    allergies TEXT,
    conditions TEXT,
    emergency_name TEXT,
    emergency_relation TEXT,
    emergency_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Medicines table
CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage_per_day INTEGER NOT NULL,
    tablets_qty INTEGER NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    order_ref TEXT UNIQUE NOT NULL,
    medicine_name TEXT NOT NULL,
    qty INTEGER NOT NULL,
    pharmacy TEXT DEFAULT '',
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ordered', 'Shipped', 'Delivered', 'Cancelled')),
    price NUMERIC DEFAULT 0,
    order_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    frequency TEXT DEFAULT 'Daily',
    note TEXT DEFAULT '',
    done INTEGER DEFAULT 0, -- 0 for false, 1 for true
    notified INTEGER DEFAULT 0, -- 0 for false, 1 for true
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Device Tokens table (for Push Notifications)
CREATE TABLE IF NOT EXISTS device_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

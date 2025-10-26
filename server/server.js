const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Create data directory and database file
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'tms.db');
const db = new Database(dbPath);

// Create tables if they don’t exist
db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  truck_number TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS loads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT,
  customer_id INTEGER,
  pickup_city TEXT,
  delivery_city TEXT,
  rate_cents INTEGER,
  driver_id INTEGER,
  status TEXT DEFAULT 'PLANNED',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(driver_id) REFERENCES drivers(id)
);
`);

// Simple API routes
app.get('/api/health', (req, res) => {
  const stats = fs.statSync(dbPath);
  res.json({ ok: true, dbPath, size_bytes: stats.size });
});

app.get('/api/customers', (req, res) => {
  const rows = db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email } = req.body;
  const info = db.prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)').run(name, phone, email);
  res.json({ id: info.lastInsertRowid });
});

const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

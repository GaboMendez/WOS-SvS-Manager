-- Migration 001: Initial schema
-- Creates all tables with period_id support

CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  is_closed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS players (
  player_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  name TEXT NOT NULL,
  alliance TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (player_id, period_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  player_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  import_id TEXT,
  comment TEXT,
  requests_monday INTEGER DEFAULT 0,
  requests_tuesday INTEGER DEFAULT 0,
  requests_thursday INTEGER DEFAULT 0,
  mon_hours TEXT,
  mon_normal_fc INTEGER DEFAULT 0,
  mon_refined_fc INTEGER DEFAULT 0,
  mon_speedup_days INTEGER DEFAULT 0,
  tue_hours TEXT,
  tue_shards INTEGER DEFAULT 0,
  tue_speedup_days INTEGER DEFAULT 0,
  thu_hours TEXT,
  thu_speedup_days INTEGER DEFAULT 0,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (player_id, period_id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  day TEXT NOT NULL,
  slot TEXT NOT NULL,
  player_id TEXT NOT NULL,
  alliance TEXT,
  score INTEGER DEFAULT 0,
  PRIMARY KEY (id, period_id)
);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  day TEXT NOT NULL,
  player_id TEXT NOT NULL,
  alliance TEXT,
  score INTEGER DEFAULT 0,
  reason TEXT,
  PRIMARY KEY (id, period_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  weights TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  raw_csv TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (id, period_id)
);
